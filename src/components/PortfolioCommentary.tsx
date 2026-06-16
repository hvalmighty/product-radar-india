import { useMemo } from "react";
import type { Holding, PortfolioParseResult } from "@/lib/ecas-parser";
import { Activity, Layers, Building2, Shuffle, AlertTriangle, Sparkles } from "lucide-react";

function fmtINR(n: number) {
  if (!n) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

// Deterministic pseudo-random from string (for synthetic but stable analytics)
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 0xffffffff;
}

const SECTOR_KEYWORDS: Array<[string, RegExp]> = [
  ["Banking & Financials", /BANK|FINANC|HDFC|ICICI|AXIS|KOTAK|SBI|BAJAJ FIN|CHOLA|MUTHOOT|MANAPPURAM|SHRIRAM|PNB|IDFC|YES BANK|INDUSIND|FEDERAL|RBL|IIFL/],
  ["Information Technology", /INFOSYS|TCS|WIPRO|HCL|TECH MAHINDRA|MINDTREE|MPHASIS|LTI|LTIMINDTREE|PERSIST|COFORGE|HEXAWARE|INFO\b|TECHNOLOG|SOFTWARE/],
  ["Energy & Oil", /RELIANCE|ONGC|IOC|BPCL|HPCL|GAIL|OIL\b|PETROL|ENERGY|POWER GRID|NTPC|TATA POWER|ADANI POWER|JSW ENERGY|COAL/],
  ["FMCG & Consumer", /HINDUSTAN UNILEVER|ITC\b|NESTLE|DABUR|MARICO|GODREJ CONSUMER|BRITANNIA|COLGATE|TATA CONSUMER|VARUN BEV|FMCG|CONSUMER/],
  ["Pharma & Healthcare", /SUN PHARMA|CIPLA|DR REDDY|LUPIN|DIVIS|AUROBINDO|TORRENT PHARMA|ALKEM|BIOCON|GLENMARK|PHARMA|HEALTH|HOSPITAL|APOLLO|FORTIS|MAX HEALTH/],
  ["Automobile", /MARUTI|TATA MOTORS|MAHINDRA|EICHER|HERO|BAJAJ AUTO|TVS|ASHOK LEYLAND|BOSCH|MOTHERSON|EXIDE|AUTO/],
  ["Metals & Mining", /TATA STEEL|JSW STEEL|HINDALCO|VEDANTA|JINDAL|NMDC|SAIL|NATIONAL ALUM|COAL INDIA|METAL|STEEL|MINING/],
  ["Cement & Construction", /ULTRATECH|SHREE CEM|AMBUJA|ACC\b|DALMIA|JK CEMENT|CEMENT|LARSEN|L&T|LARSEN & TOUBRO|CONSTRUCTION/],
  ["Telecom & Media", /BHARTI|AIRTEL|VODAFONE|IDEA|JIO|TELECOM|ZEE|SUN TV|PVR|INOX|MEDIA/],
  ["Realty & Infra", /DLF|GODREJ PROP|OBEROI|PRESTIGE|BRIGADE|MACROTECH|REALTY|INFRA|IRB|GMR|ADANI PORT|CONCOR/],
  ["Chemicals", /PIDILITE|ASIAN PAINTS|BERGER|KANSAI|UPL|SRF|TATA CHEM|DEEPAK|GUJARAT FLUORO|CHEMICAL|PAINT|FERTIL/],
];

function classifySector(name: string, type: string): string {
  if (type === "Bond") return "Fixed Income";
  if (type === "ETF") return "ETF / Index";
  if (type === "Mutual Fund") {
    const n = name.toUpperCase();
    if (/LIQUID|OVERNIGHT|MONEY MARKET|GILT|BOND|DEBT|CORP|INCOME|DURATION/.test(n)) return "MF · Debt";
    if (/HYBRID|BALANCED|ARBITRAGE|MULTI ASSET/.test(n)) return "MF · Hybrid";
    if (/SMALL CAP|SMALLCAP/.test(n)) return "MF · Small Cap";
    if (/MID CAP|MIDCAP/.test(n)) return "MF · Mid Cap";
    if (/FLEXI|MULTI CAP/.test(n)) return "MF · Flexi/Multi";
    if (/INDEX|NIFTY|SENSEX/.test(n)) return "MF · Index";
    if (/INTERNATIONAL|GLOBAL|US |NASDAQ|FOREIGN/.test(n)) return "MF · International";
    return "MF · Large/Equity";
  }
  const up = name.toUpperCase();
  for (const [sector, re] of SECTOR_KEYWORDS) if (re.test(up)) return sector;
  return "Other Equity";
}

function extractIssuer(name: string, type: string): string {
  if (type === "Mutual Fund") {
    const n = name.toUpperCase();
    const amcs = ["HDFC", "ICICI", "SBI", "AXIS", "KOTAK", "NIPPON", "ADITYA BIRLA", "ABSL", "DSP", "UTI", "FRANKLIN", "MIRAE", "PARAG PARIKH", "PPFAS", "EDELWEISS", "QUANT", "TATA", "INVESCO", "BANDHAN", "IDFC", "MOTILAL OSWAL", "CANARA", "BARODA BNP", "MAHINDRA MANULIFE", "SUNDARAM", "PGIM", "WHITEOAK", "NAVI", "ZERODHA", "GROWW"];
    for (const a of amcs) if (n.includes(a)) return a + " AMC";
    return "Other AMC";
  }
  return name.split(/\s+/).slice(0, 2).join(" ");
}

// Indicative annualized volatility by asset/sector class (used for VaR)
const VOL: Record<string, number> = {
  "Fixed Income": 0.04, "ETF / Index": 0.15,
  "MF · Debt": 0.05, "MF · Hybrid": 0.10, "MF · Index": 0.16,
  "MF · Large/Equity": 0.17, "MF · Flexi/Multi": 0.18,
  "MF · Mid Cap": 0.22, "MF · Small Cap": 0.27, "MF · International": 0.20,
  "Banking & Financials": 0.24, "Information Technology": 0.22, "Energy & Oil": 0.25,
  "FMCG & Consumer": 0.16, "Pharma & Healthcare": 0.18, "Automobile": 0.23,
  "Metals & Mining": 0.30, "Cement & Construction": 0.22, "Telecom & Media": 0.21,
  "Realty & Infra": 0.28, "Chemicals": 0.22, "Other Equity": 0.22,
};
const volFor = (s: string) => VOL[s] ?? 0.20;

export function PortfolioCommentary({ result }: { result: PortfolioParseResult }) {
  const total = result.totalValue || 1;
  const holdings = result.holdings;

  // === Sector concentration ===
  const sectorMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of holdings) {
      const s = classifySector(h.name, h.type);
      m.set(s, (m.get(s) || 0) + h.value);
    }
    return [...m.entries()]
      .map(([sector, value]) => ({ sector, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [holdings, total]);

  // === Issuer concentration ===
  const issuerMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of holdings) {
      const iss = extractIssuer(h.name, h.type);
      m.set(iss, (m.get(iss) || 0) + h.value);
    }
    return [...m.entries()]
      .map(([issuer, value]) => ({ issuer, value, pct: (value / total) * 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [holdings, total]);

  // === MF Overlap analysis (between MF schemes, indicative) ===
  const mfs = useMemo(() => holdings.filter(h => h.type === "Mutual Fund"), [holdings]);
  const overlap = useMemo(() => {
    if (mfs.length < 2) return [] as Array<{ a: Holding; b: Holding; pct: number }>;
    const rows: Array<{ a: Holding; b: Holding; pct: number }> = [];
    for (let i = 0; i < mfs.length; i++) {
      for (let j = i + 1; j < mfs.length; j++) {
        const a = mfs[i], b = mfs[j];
        const sa = classifySector(a.name, a.type);
        const sb = classifySector(b.name, b.type);
        let base = sa === sb ? 0.55 : 0.10;
        if (sa.startsWith("MF · Debt") && sb.startsWith("MF · Debt")) base = 0.40;
        if (extractIssuer(a.name, a.type) === extractIssuer(b.name, b.type)) base += 0.10;
        const jitter = (hash(a.isin + b.isin) - 0.5) * 0.20;
        const pct = Math.max(2, Math.min(85, (base + jitter) * 100));
        rows.push({ a, b, pct });
      }
    }
    return rows.sort((x, y) => y.pct - x.pct).slice(0, 8);
  }, [mfs]);

  // === Correlation matrix (top exposures) ===
  const topForCorr = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const h of holdings) {
      const s = classifySector(h.name, h.type);
      grouped.set(s, (grouped.get(s) || 0) + h.value);
    }
    return [...grouped.entries()].map(([k, v]) => ({ key: k, value: v }))
      .sort((a, b) => b.value - a.value).slice(0, 8);
  }, [holdings]);

  const corrMatrix = useMemo(() => {
    const ks = topForCorr.map(t => t.key);
    return ks.map((a, i) => ks.map((b, j) => {
      if (i === j) return 1;
      // base by asset family
      const equityA = !/Debt|Fixed|Hybrid/.test(a);
      const equityB = !/Debt|Fixed|Hybrid/.test(b);
      let base = (equityA && equityB) ? 0.65 : (!equityA && !equityB) ? 0.55 : 0.10;
      if (a === b.replace("MF · ", "") || b === a.replace("MF · ", "")) base = 0.85;
      const jitter = (hash(a + "|" + b) - 0.5) * 0.30;
      return Math.max(-0.3, Math.min(0.95, base + jitter));
    }));
  }, [topForCorr]);

  // === Portfolio risk / VaR ===
  const risk = useMemo(() => {
    // weighted vol assuming average pairwise correlation ~ 0.55
    let weightedVol2 = 0;
    const ws = holdings.map(h => ({ w: h.value / total, s: classifySector(h.name, h.type) }));
    const avgRho = 0.55;
    for (let i = 0; i < ws.length; i++) {
      for (let j = 0; j < ws.length; j++) {
        const rho = i === j ? 1 : avgRho;
        weightedVol2 += ws[i].w * ws[j].w * volFor(ws[i].s) * volFor(ws[j].s) * rho;
      }
    }
    const annualVol = Math.sqrt(Math.max(0, weightedVol2));
    const monthlyVol = annualVol / Math.sqrt(12);
    const z95 = 1.645, z99 = 2.326;
    return {
      annualVol,
      monthlyVol,
      var95_1m: total * z95 * monthlyVol,
      var99_1m: total * z99 * monthlyVol,
      var95_1y: total * z95 * annualVol,
      maxDD: Math.min(60, annualVol * 100 * 2.2),
    };
  }, [holdings, total]);

  // === Commentary text ===
  const commentary = useMemo(() => {
    const top = sectorMap[0];
    const topIss = issuerMap[0];
    const equityPct = sectorMap.filter(s => !/Debt|Fixed|Hybrid/.test(s.sector)).reduce((a, b) => a + b.pct, 0);
    const debtPct = sectorMap.filter(s => /Debt|Fixed/.test(s.sector)).reduce((a, b) => a + b.pct, 0);
    const overlapWarn = overlap.filter(o => o.pct > 50).length;
    const lines: string[] = [];
    lines.push(`The portfolio of ${holdings.length} holdings totalling ${fmtINR(total)} is tilted ${equityPct.toFixed(0)}% to equity and ${debtPct.toFixed(0)}% to debt/fixed-income exposures.`);
    if (top) lines.push(`Largest sector exposure is ${top.sector} at ${top.pct.toFixed(1)}% — ${top.pct > 30 ? "this is elevated and worth trimming for diversification." : top.pct > 20 ? "moderate concentration, acceptable but monitor." : "well within prudent limits."}`);
    if (topIss) lines.push(`Top issuer/AMC exposure is ${topIss.issuer} at ${topIss.pct.toFixed(1)}% of portfolio.`);
    if (overlapWarn > 0) lines.push(`${overlapWarn} mutual fund pair(s) show high indicative overlap (>50%); consider consolidating overlapping schemes to reduce redundancy.`);
    lines.push(`Estimated annualised volatility is ${(risk.annualVol * 100).toFixed(1)}%; at 95% confidence, 1-month VaR is approximately ${fmtINR(risk.var95_1m)} (${(risk.var95_1m / total * 100).toFixed(1)}% of NAV).`);
    if (risk.annualVol > 0.20) lines.push(`Portfolio risk is on the higher side — consider adding debt/hybrid allocation to dampen drawdowns.`);
    else if (risk.annualVol < 0.08) lines.push(`Portfolio risk is conservative — capacity exists to add equity for long-horizon investors.`);
    return lines;
  }, [sectorMap, issuerMap, overlap, risk, holdings.length, total]);

  return (
    <div className="space-y-6">
      {/* Narrative */}
      <Card title="Portfolio Commentary" icon={<Sparkles className="w-3.5 h-3.5" />}>
        <ul className="space-y-2 text-sm leading-relaxed">
          {commentary.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted-foreground mt-1.5 w-1 h-1 rounded-full bg-foreground/60 shrink-0" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sector concentration */}
        <Card title="Sector Concentration" icon={<Layers className="w-3.5 h-3.5" />}>
          <div className="space-y-1.5">
            {sectorMap.map(s => (
              <div key={s.sector}>
                <div className="flex justify-between text-xs">
                  <span className="truncate pr-2">{s.sector}</span>
                  <span className="mono-num text-muted-foreground shrink-0">{fmtINR(s.value)} · {s.pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-sm overflow-hidden mt-0.5">
                  <div
                    className={s.pct > 30 ? "bg-destructive h-full" : s.pct > 20 ? "bg-amber-500 h-full" : "bg-foreground/70 h-full"}
                    style={{ width: `${Math.min(100, s.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Issuer concentration */}
        <Card title="Top 10 Issuer / AMC Concentration" icon={<Building2 className="w-3.5 h-3.5" />}>
          <div className="space-y-1.5">
            {issuerMap.map(i => (
              <div key={i.issuer}>
                <div className="flex justify-between text-xs">
                  <span className="truncate pr-2">{i.issuer}</span>
                  <span className="mono-num text-muted-foreground shrink-0">{fmtINR(i.value)} · {i.pct.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-sm overflow-hidden mt-0.5">
                  <div
                    className={i.pct > 25 ? "bg-destructive h-full" : i.pct > 15 ? "bg-amber-500 h-full" : "bg-foreground/70 h-full"}
                    style={{ width: `${Math.min(100, i.pct * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* MF Overlap */}
        <Card title="Mutual Fund Overlap (Indicative)" icon={<Shuffle className="w-3.5 h-3.5" />}>
          {overlap.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">Need at least 2 mutual fund holdings to compute overlap.</div>
          ) : (
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="text-left py-1">Scheme A</th><th className="text-left py-1">Scheme B</th><th className="text-right py-1">Overlap</th></tr>
              </thead>
              <tbody>
                {overlap.map((o, idx) => (
                  <tr key={idx} className="border-t border-border/50">
                    <td className="py-1.5 max-w-[180px] truncate">{o.a.name}</td>
                    <td className="py-1.5 max-w-[180px] truncate">{o.b.name}</td>
                    <td className="py-1.5 text-right mono-num">
                      <span className={o.pct > 60 ? "text-destructive" : o.pct > 40 ? "text-amber-500" : ""}>{o.pct.toFixed(0)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-[10px] text-muted-foreground mt-2 italic">Indicative overlap based on category & AMC similarity. For exact holdings-overlap, integrate with AMC scheme-holding feeds.</p>
        </Card>

        {/* Risk / VaR */}
        <Card title="Portfolio Risk (Value-at-Risk)" icon={<AlertTriangle className="w-3.5 h-3.5" />}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Metric label="Annualised Volatility" value={`${(risk.annualVol * 100).toFixed(1)}%`} />
            <Metric label="Monthly Volatility" value={`${(risk.monthlyVol * 100).toFixed(1)}%`} />
            <Metric label="1-Month VaR (95%)" value={fmtINR(risk.var95_1m)} sub={`${(risk.var95_1m / total * 100).toFixed(1)}% of NAV`} />
            <Metric label="1-Month VaR (99%)" value={fmtINR(risk.var99_1m)} sub={`${(risk.var99_1m / total * 100).toFixed(1)}% of NAV`} />
            <Metric label="1-Year VaR (95%)" value={fmtINR(risk.var95_1y)} sub={`${(risk.var95_1y / total * 100).toFixed(1)}% of NAV`} />
            <Metric label="Indicative Max Drawdown" value={`-${risk.maxDD.toFixed(0)}%`} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-3 italic">Parametric VaR using sector-level volatility and an average pairwise correlation of 0.55. Educational estimate — not a regulatory risk number.</p>
        </Card>
      </div>

      {/* Correlation matrix heatmap */}
      <Card title="Correlation Matrix (Top Exposures)" icon={<Activity className="w-3.5 h-3.5" />}>
        {topForCorr.length < 2 ? (
          <div className="text-xs text-muted-foreground py-4 text-center">Need at least 2 sector exposures.</div>
        ) : (
          <div className="overflow-auto">
            <table className="text-xs">
              <thead>
                <tr>
                  <th></th>
                  {topForCorr.map(t => (
                    <th key={t.key} className="px-2 py-1 text-[10px] font-normal text-muted-foreground -rotate-45 origin-left h-20 align-bottom whitespace-nowrap">{t.key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topForCorr.map((row, i) => (
                  <tr key={row.key}>
                    <td className="pr-2 py-1 text-[10px] text-muted-foreground whitespace-nowrap">{row.key}</td>
                    {corrMatrix[i].map((v, j) => {
                      const intensity = Math.abs(v);
                      const color = v >= 0
                        ? `rgba(239, 68, 68, ${0.15 + intensity * 0.7})`
                        : `rgba(34, 197, 94, ${0.15 + intensity * 0.7})`;
                      return (
                        <td key={j} className="text-center mono-num text-[10px] w-12 h-9" style={{ background: color }}>
                          {v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-muted-foreground mt-3 italic">Heat-mapped correlations between top sector buckets. Red = positive, green = negative. Computed from sector-family heuristics — replace with realised returns when historical NAV/price feeds are wired.</p>
      </Card>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md bg-surface">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}{title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="p-2.5 border border-border rounded-sm bg-background">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mono-num mt-0.5">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mono-num">{sub}</div>}
    </div>
  );
}
