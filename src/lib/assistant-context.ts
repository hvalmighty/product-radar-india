// Builds a compact, model-friendly snapshot of the demo data so the assistant
// can answer business + portfolio questions contextually. Region-aware.

import {
  SAMPLE_PORTFOLIOS_BY_REGION,
  SAMPLE_FAMILIES_BY_REGION,
  type SavedPortfolio,
} from "./sample-portfolios";
import { REGION_META, type Region } from "./region";

function fmtFactory(region: Region) {
  const m = REGION_META[region];
  // India stores values in crore-base (1e7 = 1 Cr); UAE/PH store in millions (1e6 = 1 M).
  return (v: number) => {
    if (region === "IN") return `₹${(v / 1e7).toFixed(2)} Cr`;
    const abs = Math.abs(v);
    if (abs >= 1e9) return `${m.symbol}${(v / 1e9).toFixed(2)} B`;
    if (abs >= 1e6) return `${m.symbol}${(v / 1e6).toFixed(2)} M`;
    if (abs >= 1e3) return `${m.symbol}${(v / 1e3).toFixed(2)} K`;
    return `${m.symbol}${v.toFixed(0)}`;
  };
}

function summarisePortfolio(p: SavedPortfolio, fmt: (v: number) => string) {
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
    aumLabel: fmt(p.data.totalValue),
    allocation: Object.fromEntries(
      Object.entries(byCat).map(([k, v]) => [k, +((v / p.data.totalValue) * 100).toFixed(1)]),
    ),
    topHoldings: top.map((x) => ({ name: x.name, cat: x.productCategory, val: fmt(x.value) })),
    holdingsCount: h.length,
  };
}

export function buildAssistantContext(region: Region = "IN") {
  const fmt = fmtFactory(region);
  const portfolios = SAMPLE_PORTFOLIOS_BY_REGION[region];
  const families = SAMPLE_FAMILIES_BY_REGION[region];
  const ports = portfolios.map((p) => summarisePortfolio(p, fmt));
  const totalAUM = ports.reduce((s, p) => s + p.aum, 0);
  const familySummaries = families.map((f) => {
    const ids = new Set(f.portfolioIds);
    const fam = ports.filter((p) => ids.has(p.id));
    return {
      family: f.name,
      members: fam.length,
      aum: fmt(fam.reduce((s, p) => s + p.aum, 0)),
    };
  });

  const securityMap: Record<string, { count: number; total: number; portfolios: string[] }> = {};
  for (const p of portfolios) {
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
    .map(([name, v]) => ({ name, heldBy: v.count, total: fmt(v.total) }));

  return {
    asOf: "31-May-2026",
    region,
    meta: REGION_META[region],
    book: {
      totalAUM: fmt(totalAUM),
      portfolios: ports.length,
      families: families.length,
    },
    families: familySummaries,
    portfolios: ports,
    topSharedSecurities: topShared,
  };
}

export function buildSystemPrompt(region: Region = "IN") {
  const ctx = buildAssistantContext(region);
  const regionGuide: Record<Region, string> = {
    IN: "India wealth-management vocabulary (AUM, SIP, AIF, PMS, NCD, G-Sec, AMC, RTA). Format money in ₹ Cr / Lakh.",
    AE: "UAE wealth-management vocabulary (DIFC, ADGM, DFSA, SCA, sukuk, Tabarru, DFM, ADX). Format money in AED, abbreviated as M / B.",
    PH: "Philippines wealth-management vocabulary (PSE, BSP, SEC, UITF, RTB/FXTN, BIR). Format money in ₱ (PHP), abbreviated as M / B.",
  };

  return `You are **mPower AI**, an in-app assistant for KFintech wealth Relationship Managers using the mPower terminal.

The user is currently working in the **${ctx.meta.label} (${ctx.meta.flag})** region. Answer ONLY using the ${ctx.meta.label} book below — do NOT mix in data from other regions. All money values are in **${ctx.meta.currency}**.

You answer two kinds of questions:
1. **Business analytics** — book AUM, family/client mix, product split, concentration, flows, ideas for cross-sell.
2. **Portfolio analytics** — per-client holdings, allocation, top positions, issuer/security lookup across all portfolios.

Tone: concise, professional. Use ${regionGuide[region]} Use markdown — tables for comparisons, bullet lists for findings, **bold** for key numbers. Never invent ISINs, prices or returns that are not in the data; if asked say "not in the loaded sample data".

If the user names a client, family, security or product, find it in the snapshot below and answer with specifics — don't give generic textbook answers. If something is genuinely missing, say so and suggest the closest available cut.

## Loaded sample data snapshot — ${ctx.meta.label} (as of ${ctx.asOf})

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

Always prefer answering from this snapshot. If asked about a security or product, scan the portfolios list and list every portfolio that holds it.`;
}
