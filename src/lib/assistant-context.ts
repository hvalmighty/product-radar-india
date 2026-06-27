// Builds a compact, model-friendly snapshot of the demo data so the assistant
// can answer business + portfolio questions contextually. No PII concerns —
// these are sample portfolios that ship with the app.

import { SAMPLE_PORTFOLIOS, SAMPLE_FAMILIES, type SavedPortfolio } from "./sample-portfolios";

const fmtCr = (v: number) => `₹${(v / 1e7).toFixed(2)} Cr`;

function summarisePortfolio(p: SavedPortfolio) {
  const h = p.data.holdings;
  const byCat: Record<string, number> = {};
  for (const x of h) byCat[x.productCategory ?? x.type] = (byCat[x.productCategory ?? x.type] ?? 0) + x.value;
  const top = [...h].sort((a, b) => b.value - a.value).slice(0, 6);
  return {
    id: p.id,
    name: p.name,
    family: p.family ?? "—",
    investor: p.data.investor,
    aum: p.data.totalValue,
    aumLabel: fmtCr(p.data.totalValue),
    allocation: Object.fromEntries(
      Object.entries(byCat).map(([k, v]) => [k, +((v / p.data.totalValue) * 100).toFixed(1)]),
    ),
    topHoldings: top.map((x) => ({ name: x.name, cat: x.productCategory, val: fmtCr(x.value) })),
    holdingsCount: h.length,
  };
}

export function buildAssistantContext() {
  const ports = SAMPLE_PORTFOLIOS.map(summarisePortfolio);
  const totalAUM = ports.reduce((s, p) => s + p.aum, 0);
  const families = SAMPLE_FAMILIES.map((f) => {
    const ids = new Set(f.portfolioIds);
    const fam = ports.filter((p) => ids.has(p.id));
    return {
      family: f.name,
      members: fam.length,
      aum: fmtCr(fam.reduce((s, p) => s + p.aum, 0)),
    };
  });

  // Cross-portfolio issuer/security concentration (rough — name match)
  const securityMap: Record<string, { count: number; total: number; portfolios: string[] }> = {};
  for (const p of SAMPLE_PORTFOLIOS) {
    for (const h of p.data.holdings) {
      const key = h.name;
      securityMap[key] ??= { count: 0, total: 0, portfolios: [] };
      securityMap[key].count += 1;
      securityMap[key].total += h.value;
      securityMap[key].portfolios.push(p.name);
    }
  }
  const topShared = Object.entries(securityMap)
    .filter(([, v]) => v.count > 1)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 10)
    .map(([name, v]) => ({ name, heldBy: v.count, total: fmtCr(v.total) }));

  return {
    asOf: "31-May-2026",
    book: {
      totalAUM: fmtCr(totalAUM),
      portfolios: ports.length,
      families: SAMPLE_FAMILIES.length,
    },
    families,
    portfolios: ports,
    topSharedSecurities: topShared,
  };
}

export function buildSystemPrompt() {
  const ctx = buildAssistantContext();
  return `You are **mPower AI**, an in-app assistant for KFintech wealth Relationship Managers using the mPower terminal.

You answer two kinds of questions:
1. **Business analytics** — book AUM, family/client mix, product split, concentration, flows, ideas for cross-sell.
2. **Portfolio analytics** — per-client holdings, allocation, top positions, issuer/security lookup across all portfolios, mutual fund underlying exposure (acknowledge when underlyings are not in the sample data).

Tone: concise, professional, India wealth-management vocabulary (AUM, SIP, AIF, PMS, NCD, G-Sec, AMC, RTA). Format numbers in ₹ Cr / Lakh. Use markdown — tables for comparisons, bullet lists for findings, **bold** for key numbers. Never invent ISINs, prices or returns that are not in the data; if asked say "not in the loaded sample data".

If the user names a client, family, security or AMC, find it in the snapshot below and answer with specifics — don't give generic textbook answers. If something is genuinely missing, say so and suggest the closest available cut.

## Loaded sample data snapshot (as of ${ctx.asOf})

### Book summary
- Total AUM: **${ctx.book.totalAUM}** across **${ctx.book.portfolios}** portfolios in **${ctx.book.families}** family groupings.

### Families
${ctx.families.map((f) => `- ${f.family} — ${f.members} member(s), AUM ${f.aum}`).join("\n")}

### Portfolios
${ctx.portfolios
  .map(
    (p) =>
      `- **${p.name}** (${p.family}) — AUM ${p.aumLabel}, ${p.holdingsCount} holdings. Allocation: ${Object.entries(p.allocation)
        .map(([k, v]) => `${k} ${v}%`)
        .join(", ")}. Top: ${p.topHoldings.map((t) => `${t.name} (${t.val})`).join("; ")}.`,
  )
  .join("\n")}

### Top shared securities (held across >1 portfolio)
${ctx.topSharedSecurities.map((s) => `- ${s.name} — held by ${s.heldBy} portfolios, aggregate ${s.total}`).join("\n")}

Always prefer answering from this snapshot. If asked about a security or AMC, scan the portfolios list and list every portfolio that holds it.`;
}
