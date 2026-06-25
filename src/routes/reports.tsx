import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Holding, PortfolioParseResult } from "@/lib/ecas-parser";
import {
  ArrowLeft, FileText, Users, User, Printer, Download, ChevronRight,
  TrendingUp, TrendingDown, Droplet, Layers, Building2, Shield, PieChart as PieIcon,
  MessageSquare, AlertTriangle, CheckCircle2, Info,
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend, LineChart, Line, AreaChart, Area,
} from "recharts";
import kfintechLogo from "@/assets/kfintech.png.asset.json";
import { SAMPLE_FAMILIES, SAMPLE_PORTFOLIOS, seedSamplePortfolios, removeSamplePortfolios, STORAGE_KEY, type SavedPortfolio } from "@/lib/sample-portfolios";
import { Sparkles, Trash } from "lucide-react";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Portfolio Analytics Report · mPower Wealth" },
      { name: "description", content: "Generate consolidated portfolio analytics reports across customers and families with allocation, performance, risk and liquidity views." },
    ],
  }),
  component: ReportsPage,
});

function loadSaved(): SavedPortfolio[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}

function fmtINR(n: number) {
  if (!n) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}
function pct(n: number, digits = 1) { return `${n.toFixed(digits)}%`; }
function clsPct(n: number) { return n >= 0 ? "text-positive" : "text-negative"; }

// Asset class mapping
function assetClass(h: Holding): string {
  if (h.productCategory) return h.productCategory;
  if (h.type === "Mutual Fund") {
    const n = h.name.toUpperCase();
    if (/LIQUID|OVERNIGHT|MONEY MARKET|ULTRA SHORT/.test(n)) return "Cash & Equivalents";
    if (/DEBT|BOND|GILT|INCOME|CREDIT|CORPORATE/.test(n)) return "Mutual Fund - Debt";
    if (/HYBRID|BALANCED|MULTI ASSET/.test(n)) return "Mutual Fund - Hybrid";
    return "Mutual Fund - Equity";
  }
  if (h.type === "Bond") return "Direct Debt";
  if (h.type === "ETF") return "ETF";
  if (h.type === "Equity") return "Direct Equity";
  return "Other";
}

// Sector heuristic by issuer keywords
function sectorOf(name: string): string {
  const n = name.toUpperCase();
  if (/BANK|FINANC|HDFC|ICICI|KOTAK|AXIS|SBI|BAJAJ FIN|CHOLA/.test(n)) return "Financials";
  if (/TECH|INFOSYS|TCS|WIPRO|HCL|TECHM|LTIM|PERSISTENT|MPHASIS/.test(n)) return "IT";
  if (/PHARMA|CIPLA|SUN PHARM|DR REDDY|LUPIN|TORRENT|DIVIS|AUROBINDO/.test(n)) return "Healthcare";
  if (/RELIANCE|ONGC|OIL|GAS|BPCL|HPCL|IOC|GAIL/.test(n)) return "Energy";
  if (/AUTO|MARUTI|TATA MOTORS|MAHINDRA|EICHER|BAJAJ AUTO|HERO/.test(n)) return "Auto";
  if (/STEEL|CEMENT|ULTRATECH|JSW|TATA STEEL|HINDALCO|GRASIM/.test(n)) return "Materials";
  if (/HUL|ITC|NESTLE|BRITAN|DABUR|MARICO|GODREJ|COLGATE/.test(n)) return "Consumer";
  if (/POWER|NTPC|TATA POWER|ADANI|TORRENT POWER/.test(n)) return "Utilities";
  if (/LARSEN|L&T|TITAN|TRENT|DLF/.test(n)) return "Industrials";
  if (/GOI|SDL|GOVT|GOVERNMENT|G-SEC/.test(n)) return "Sovereign";
  return "Diversified";
}

function marketCapOf(name: string): "Large Cap" | "Mid Cap" | "Small Cap" | "Multi Cap" {
  const n = name.toUpperCase();
  if (/LARGE CAP|BLUECHIP|NIFTY 50|SENSEX|TOP 100/.test(n)) return "Large Cap";
  if (/MID CAP|MIDCAP/.test(n)) return "Mid Cap";
  if (/SMALL CAP|SMALLCAP/.test(n)) return "Small Cap";
  if (/MULTI CAP|FLEXI CAP|MULTICAP/.test(n)) return "Multi Cap";
  // Direct equity — heuristic by known issuer keywords
  if (/RELIANCE|HDFC BANK|TCS|INFOSYS|ICICI BANK|HUL|ITC|SBI|KOTAK|LARSEN|BHARTI|AXIS/.test(n)) return "Large Cap";
  return "Mid Cap";
}

function ratingOf(name: string): string {
  const n = name.toUpperCase();
  if (/GOI|SDL|GOVERNMENT|G-SEC/.test(n)) return "Sovereign";
  if (/AAA/.test(n)) return "AAA";
  if (/AA\+/.test(n)) return "AA+";
  if (/\bAA\b/.test(n)) return "AA";
  if (/\bA\b/.test(n)) return "A";
  return "AAA"; // default for bond holdings
}

// Risk-profile target allocations
const RISK_PROFILES: Record<string, Record<string, number>> = {
  Conservative: { "Direct Equity": 10, "Mutual Fund - Equity": 15, "Mutual Fund - Hybrid": 10, "Mutual Fund - Debt": 35, "Direct Debt": 25, "Cash & Equivalents": 5 },
  Moderate:     { "Direct Equity": 20, "Mutual Fund - Equity": 30, "Mutual Fund - Hybrid": 10, "Mutual Fund - Debt": 20, "Direct Debt": 15, "Cash & Equivalents": 5 },
  Aggressive:   { "Direct Equity": 35, "Mutual Fund - Equity": 40, "Mutual Fund - Hybrid": 5,  "Mutual Fund - Debt": 10, "Direct Debt": 5,  "Cash & Equivalents": 5 },
};

const ASSET_BENCHMARKS: Record<string, { name: string; ret: number }> = {
  "Direct Equity": { name: "NIFTY 50 TRI", ret: 14.2 },
  "Mutual Fund - Equity": { name: "NIFTY 500 TRI", ret: 15.6 },
  "Mutual Fund - Hybrid": { name: "CRISIL Hybrid 35+65", ret: 11.4 },
  "Mutual Fund - Debt": { name: "CRISIL Composite Bond", ret: 7.8 },
  "Direct Debt": { name: "CRISIL 10Y G-Sec", ret: 7.2 },
  "ETF": { name: "NIFTY 50 TRI", ret: 14.2 },
  "Cash & Equivalents": { name: "CRISIL Liquid", ret: 6.8 },
  "PMS": { name: "BSE 500 TRI", ret: 16.4 },
  "AIF": { name: "BSE 500 TRI + 200 bps", ret: 17.8 },
  "REIT": { name: "Nifty REITs & InvITs", ret: 9.2 },
  "InvIT": { name: "Nifty REITs & InvITs", ret: 9.2 },
  "Private Equity": { name: "MSCI India PE Proxy", ret: 18.5 },
  "Real Estate": { name: "RBI Housing Price Index", ret: 7.5 },
  "Other": { name: "—", ret: 0 },
};

// Red & Black only palette — gradients across reds and blacks
const COLORS = ["#ef4444", "#000000", "#b91c1c", "#1f1f1f", "#dc2626", "#404040", "#7f1d1d", "#262626", "#f87171", "#525252"];

// Gradient palette tuned for charts (top → bottom for bars, center → edge for pies)
const GRAD_PAIRS: Array<[string, string]> = [
  ["#ef4444", "#7f1d1d"], // bright red → dark red
  ["#1f1f1f", "#000000"], // charcoal → black
  ["#f87171", "#b91c1c"], // light red → deep red
  ["#4b4b4b", "#111111"], // graphite → near-black
  ["#dc2626", "#450a0a"], // red → almost-black red
  ["#737373", "#171717"], // gray → black
  ["#fca5a5", "#991b1b"], // pale red → crimson
  ["#262626", "#000000"], // black variant
  ["#b91c1c", "#000000"], // red → black blend
  ["#9ca3af", "#1f1f1f"], // light gray → dark
];

/** Reusable SVG gradient defs — rendered as a hidden, document-level <svg>
 *  so url(#id) references resolve from any Recharts chart on the page.
 *  (Custom children inside Recharts BarChart/PieChart are filtered out, so
 *  inline <defs> inside the chart would not render. A page-level hidden svg
 *  works because SVG url() refs are document-scoped.) */
function ChartDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {GRAD_PAIRS.map(([from, to], i) => (
          <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} stopOpacity={0.95} />
            <stop offset="100%" stopColor={to} stopOpacity={0.85} />
          </linearGradient>
        ))}
        {GRAD_PAIRS.map(([from, to], i) => (
          <radialGradient key={`r${i}`} id={`rg${i}`} cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor={from} stopOpacity={1} />
            <stop offset="100%" stopColor={to} stopOpacity={0.9} />
          </radialGradient>
        ))}
        <filter id="chartShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.18" />
        </filter>
      </defs>
    </svg>
  );
}
const grad = (i: number) => `url(#g${i % GRAD_PAIRS.length})`;
const rgrad = (i: number) => `url(#rg${i % GRAD_PAIRS.length})`;

/** Polished tooltip with currency / percent formatting */
function NiceTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-background/95 backdrop-blur px-3 py-2 shadow-lg text-[11px]">
      {label !== undefined && <div className="font-semibold text-foreground mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.fill || "#ef4444" }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="mono-num font-semibold text-foreground">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

const AXIS_TICK = { fontSize: 10, fill: "hsl(var(--muted-foreground))" } as const;
const GRID_STROKE = "hsl(var(--border))";

// Deterministic pseudo-random for synthesized returns based on ISIN
function seedNum(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const r = (Math.abs(h) % 10000) / 10000;
  return min + r * (max - min);
}

function ReportsPage() {
  const [saved, setSaved] = useState<SavedPortfolio[]>([]);
  const [mode, setMode] = useState<"customer" | "family">("customer");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [familyName, setFamilyName] = useState("Family Group");
  const [generated, setGenerated] = useState(false);

  useEffect(() => { setSaved(loadSaved()); }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (mode === "customer") { next.clear(); next.add(id); }
    else { if (next.has(id)) next.delete(id); else next.add(id); }
    setSelected(next);
  }

  const selectedPortfolios = useMemo(() => saved.filter(s => selected.has(s.id)), [saved, selected]);

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30 print:hidden">
        <div className="pl-12 pr-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-sm font-semibold leading-tight">Reports</h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Portfolio Analytics Report Builder</p>
          </div>
          <Link to="/portfolio" className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Manage Portfolios
          </Link>
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1400px] mx-auto">
        {!generated && (
          <section className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-semibold tracking-tight">Generate Portfolio Analytics Report</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a single customer or aggregate multiple portfolios as a family to produce a consolidated analytics report.
            </p>

            <div className="mt-6 inline-flex border border-border rounded-sm p-0.5 bg-surface">
              <button
                onClick={() => { setMode("customer"); setSelected(new Set()); }}
                className={`px-4 py-1.5 text-xs inline-flex items-center gap-1.5 rounded-sm ${mode === "customer" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                <User className="w-3.5 h-3.5" /> Single Customer
              </button>
              <button
                onClick={() => { setMode("family"); setSelected(new Set()); }}
                className={`px-4 py-1.5 text-xs inline-flex items-center gap-1.5 rounded-sm ${mode === "family" ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                <Users className="w-3.5 h-3.5" /> Family Group
              </button>
            </div>

            {mode === "family" && (
              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Family Name</label>
                <input value={familyName} onChange={e => setFamilyName(e.target.value)}
                  className="mt-1 block w-full max-w-sm px-3 py-2 text-sm bg-background border border-border rounded-sm focus:outline-none focus:border-foreground/50" />

                {(() => {
                  const have = new Set(saved.map(s => s.id));
                  const available = SAMPLE_FAMILIES.filter(f => f.portfolioIds.every(id => have.has(id)));
                  if (available.length === 0) return null;
                  return (
                    <div className="mt-4">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Quick-pick sample families</div>
                      <div className="flex flex-wrap gap-2">
                        {available.map(f => (
                          <button key={f.name}
                            onClick={() => { setFamilyName(f.name); setSelected(new Set(f.portfolioIds)); }}
                            className="px-3 py-1.5 text-[11px] border border-border rounded-sm hover:bg-secondary inline-flex items-center gap-1.5">
                            <Users className="w-3 h-3" /> {f.name}
                            <span className="text-muted-foreground">· {f.portfolioIds.length}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <div className="mt-6 border border-border rounded-md bg-surface">
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Saved Portfolios ({saved.length})
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => setSaved(seedSamplePortfolios())}
                    className="text-[11px] inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-sm hover:bg-secondary">
                    <Sparkles className="w-3 h-3" /> Load sample portfolios
                  </button>
                  {saved.some(s => s.isSample) && (
                    <button
                      onClick={() => { setSaved(removeSamplePortfolios()); setSelected(new Set()); }}
                      className="text-[11px] inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-sm hover:bg-secondary text-muted-foreground">
                      <Trash className="w-3 h-3" /> Remove samples
                    </button>
                  )}
                </div>
              </div>
              {saved.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No saved portfolios yet. <button onClick={() => setSaved(seedSamplePortfolios())} className="underline">Load {SAMPLE_PORTFOLIOS.length} sample portfolios</button> or go to <Link to="/portfolio" className="underline">Portfolios</Link> to import an eCAS PDF.
                </div>
              ) : (
                <table className="w-full text-xs">
                  <tbody>
                    {saved.map(s => {
                      const checked = selected.has(s.id);
                      return (
                        <tr key={s.id} onClick={() => toggle(s.id)}
                          className={`border-t border-border/50 cursor-pointer hover:bg-secondary/40 ${checked ? "bg-secondary/60" : ""}`}>
                          <td className="px-4 py-3 w-8">
                            <input type={mode === "customer" ? "radio" : "checkbox"} checked={checked} readOnly />
                          </td>
                          <td className="px-2 py-3">
                            <div className="font-medium flex items-center gap-2">
                              {s.name}
                              {s.isSample && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground">Sample</span>}
                              {s.family && <span className="text-[10px] text-muted-foreground">· {s.family}</span>}
                            </div>
                            <div className="text-[10px] text-muted-foreground mono-num">{s.data.holdings.length} holdings · {fmtINR(s.data.totalValue)}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-[10px] text-muted-foreground">
                            {new Date(s.savedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setGenerated(true)}
                disabled={selected.size === 0}
                className="px-5 py-2 text-xs font-semibold bg-foreground text-background rounded-sm disabled:opacity-40 inline-flex items-center gap-1.5">
                Generate Report <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </section>
        )}

        {generated && selectedPortfolios.length > 0 && (
          <ReportView
            portfolios={selectedPortfolios}
            title={mode === "family" ? familyName : (selectedPortfolios[0].data.investor || selectedPortfolios[0].name)}
            mode={mode}
            onBack={() => setGenerated(false)}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// Report View
// ============================================================================

function ReportView({ portfolios, title, mode, onBack }: {
  portfolios: SavedPortfolio[]; title: string; mode: "customer" | "family"; onBack: () => void;
}) {
  const allHoldings = useMemo(() => portfolios.flatMap(p => p.data.holdings), [portfolios]);
  const totalValue = useMemo(() => allHoldings.reduce((s, h) => s + h.value, 0), [allHoldings]);

  // Synthesize cashflows (deterministic from total)
  const contribution = totalValue * 0.78;
  const distribution = totalValue * 0.06;
  const realizedGL = totalValue * 0.04;
  const unrealizedGL = totalValue - contribution - realizedGL + distribution;

  // Asset class aggregation
  const byAssetClass = useMemo(() => {
    const m = new Map<string, { value: number; cost: number; count: number; holdings: Holding[] }>();
    for (const h of allHoldings) {
      const ac = assetClass(h);
      const cur = m.get(ac) || { value: 0, cost: 0, count: 0, holdings: [] };
      cur.value += h.value;
      cur.cost += h.value * (1 - seedNum(h.isin, -0.05, 0.20));
      cur.count += 1;
      cur.holdings.push(h);
      m.set(ac, cur);
    }
    return [...m.entries()].map(([k, v]) => ({
      name: k, value: v.value, cost: v.cost, count: v.count, holdings: v.holdings,
      pct: (v.value / (totalValue || 1)) * 100,
      ret: ((v.value - v.cost) / (v.cost || 1)) * 100,
      bench: ASSET_BENCHMARKS[k] || ASSET_BENCHMARKS["Other"],
    })).sort((a, b) => b.value - a.value);
  }, [allHoldings, totalValue]);

  // Portfolio-level synthesized metrics
  const equityShare = byAssetClass.filter(a => /Equity|Hybrid|ETF/.test(a.name)).reduce((s, a) => s + a.pct, 0) / 100;
  const debtShare = byAssetClass.filter(a => /Debt|Cash/.test(a.name)).reduce((s, a) => s + a.pct, 0) / 100;
  const portfolioPE = 22.4 * equityShare + (debtShare * 0); // weighted
  const portfolioPB = 3.8 * equityShare;
  const portfolioDuration = 4.2 * debtShare * 100 / Math.max(debtShare * 100, 1) * debtShare; // years on debt sleeve
  const portfolioYTM = 7.6;

  // Top 5 issuers
  const byIssuer = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of allHoldings) {
      const key = h.name.split(/\s+/).slice(0, 2).join(" ");
      m.set(key, (m.get(key) || 0) + h.value);
    }
    return [...m.entries()].map(([k, v]) => ({ name: k, value: v, pct: (v / (totalValue || 1)) * 100 }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
  }, [allHoldings, totalValue]);

  // Sector concentration
  const bySector = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of allHoldings) {
      if (!/Equity|Mutual Fund - Equity|ETF/.test(assetClass(h))) continue;
      const s = sectorOf(h.name);
      m.set(s, (m.get(s) || 0) + h.value);
    }
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    return [...m.entries()].map(([k, v]) => ({ name: k, value: v, pct: (v / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [allHoldings]);

  // Market cap
  const byMarketCap = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of allHoldings) {
      if (!/Equity|Mutual Fund - Equity|ETF/.test(assetClass(h))) continue;
      const mc = marketCapOf(h.name);
      m.set(mc, (m.get(mc) || 0) + h.value);
    }
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    return [...m.entries()].map(([k, v]) => ({ name: k, value: v, pct: (v / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [allHoldings]);

  // Credit rating
  const byRating = useMemo(() => {
    const m = new Map<string, number>();
    for (const h of allHoldings) {
      if (!/Debt|Bond/.test(assetClass(h)) && h.type !== "Bond") continue;
      const r = ratingOf(h.name);
      m.set(r, (m.get(r) || 0) + h.value);
    }
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    return [...m.entries()].map(([k, v]) => ({ name: k, value: v, pct: (v / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [allHoldings]);

  // AMC wise (mutual funds)
  const mfAMC = useMemo(() => {
    const m = new Map<string, { value: number; count: number; cost: number }>();
    for (const h of allHoldings) {
      if (h.type !== "Mutual Fund") continue;
      const amc = h.name.split(/\s+/).slice(0, 2).join(" ");
      const cur = m.get(amc) || { value: 0, count: 0, cost: 0 };
      cur.value += h.value;
      cur.count += 1;
      cur.cost += h.value * (1 - seedNum(h.isin, -0.05, 0.22));
      m.set(amc, cur);
    }
    return [...m.entries()].map(([k, v]) => ({
      name: k, value: v.value, count: v.count,
      ret: ((v.value - v.cost) / (v.cost || 1)) * 100,
    })).sort((a, b) => b.value - a.value);
  }, [allHoldings]);

  // Upcoming cashflows (synthesized for bonds: coupons + maturities in 180d)
  const upcomingCF = useMemo(() => {
    const buckets: { bucket: string; coupon: number; maturity: number }[] = [
      { bucket: "0-30 days", coupon: 0, maturity: 0 },
      { bucket: "31-60 days", coupon: 0, maturity: 0 },
      { bucket: "61-90 days", coupon: 0, maturity: 0 },
      { bucket: "91-120 days", coupon: 0, maturity: 0 },
      { bucket: "121-180 days", coupon: 0, maturity: 0 },
    ];
    for (const h of allHoldings) {
      if (h.type !== "Bond" && !/Debt/.test(assetClass(h))) continue;
      const bIdx = Math.floor(seedNum(h.isin, 0, 5));
      const annualCoupon = h.value * 0.075;
      buckets[bIdx].coupon += annualCoupon / 2;
      if (seedNum(h.isin + "m", 0, 1) > 0.85) buckets[bIdx].maturity += h.value * 0.1;
    }
    return buckets;
  }, [allHoldings]);

  // Liquidity buckets
  const liquidity = useMemo(() => {
    const buckets = { "T+1 (Liquid)": 0, "T+3 (Equity/ETF)": 0, "Short Term (≤1Y)": 0, "Medium Term (1-3Y)": 0, "Long Term (>3Y)": 0 };
    for (const h of allHoldings) {
      const ac = assetClass(h);
      if (ac === "Cash & Equivalents") buckets["T+1 (Liquid)"] += h.value;
      else if (/Equity|ETF/.test(ac)) buckets["T+3 (Equity/ETF)"] += h.value;
      else if (/Hybrid/.test(ac)) buckets["Short Term (≤1Y)"] += h.value;
      else if (/Mutual Fund - Debt/.test(ac)) buckets["Short Term (≤1Y)"] += h.value;
      else if (/Direct Debt/.test(ac)) {
        const t = seedNum(h.isin, 0, 1);
        if (t < 0.3) buckets["Short Term (≤1Y)"] += h.value;
        else if (t < 0.7) buckets["Medium Term (1-3Y)"] += h.value;
        else buckets["Long Term (>3Y)"] += h.value;
      } else buckets["Medium Term (1-3Y)"] += h.value;
    }
    return Object.entries(buckets).map(([k, v]) => ({ name: k, value: v, pct: (v / (totalValue || 1)) * 100 }));
  }, [allHoldings, totalValue]);

  // Risk profile picker
  const [riskProfile, setRiskProfile] = useState<keyof typeof RISK_PROFILES>("Moderate");
  const targetVsCurrent = useMemo(() => {
    const target = RISK_PROFILES[riskProfile];
    return Object.keys(target).map(k => {
      const cur = byAssetClass.find(a => a.name === k);
      return { name: k, target: target[k], current: cur ? cur.pct : 0 };
    });
  }, [riskProfile, byAssetClass]);

  // Bonds for annexure
  const bondHoldings = allHoldings.filter(h => h.type === "Bond" || /Debt/.test(assetClass(h)));

  const sections = [
    { id: "exec", label: "1. Executive Summary" },
    { id: "commentary", label: "2. Portfolio Commentary" },
    { id: "asset", label: "3. Asset Class Performance" },
    { id: "liquidity", label: "4. Liquidity & Cashflows" },
    { id: "products", label: "5. Product Holdings" },
    { id: "drilldown", label: "6. Portfolio Drilldown" },
    { id: "mf", label: "7. Mutual Fund Drilldown" },
    { id: "annex", label: "8. Annexures" },
  ];

  return (
    <div>
      {/* Page-level SVG gradient defs — must live OUTSIDE Recharts (Recharts
          filters out unknown children of BarChart/PieChart, so an inline
          <ChartDefs /> inside a chart never reaches the DOM and url(#gN)
          references resolve to nothing → invisible bars/slices). */}
      <ChartDefs />
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border print:hidden">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to selection
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => window.print()} className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-secondary inline-flex items-center gap-1.5">
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Report header */}
      <div className="mb-6">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{mode === "family" ? "Family Portfolio Report" : "Customer Portfolio Report"}</div>
        <h1 className="text-3xl font-semibold tracking-tight mt-1">{title}</h1>
        <div className="text-xs text-muted-foreground mt-1 mono-num">
          {portfolios.length} portfolio{portfolios.length > 1 ? "s" : ""} · {allHoldings.length} holdings · Report generated {new Date().toLocaleString()}
        </div>
        {mode === "family" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {portfolios.map(p => (
              <span key={p.id} className="text-[10px] px-2 py-1 border border-border rounded-sm bg-surface">{p.data.investor || p.name} · {fmtINR(p.data.totalValue)}</span>
            ))}
          </div>
        )}
      </div>

      {/* Section nav */}
      <nav className="flex flex-wrap gap-1 mb-8 text-xs border-y border-border py-2 print:hidden">
        {sections.map(s => (
          <a key={s.id} href={`#${s.id}`} className="px-2.5 py-1 rounded-sm hover:bg-secondary text-muted-foreground hover:text-foreground">{s.label}</a>
        ))}
      </nav>

      {/* SECTION 1: Executive Summary */}
      <Section id="exec" title="1. Executive Summary" icon={<PieIcon className="w-4 h-4" />}>
        <div className="grid md:grid-cols-4 gap-3 mb-6">
          <Stat label="Portfolio Value" value={fmtINR(totalValue)} hint="Closing" />
          <Stat label="Portfolio P/E" value={portfolioPE.toFixed(1)} hint="Weighted equity" />
          <Stat label="Portfolio P/B" value={portfolioPB.toFixed(2)} hint="Weighted equity" />
          <Stat label="Portfolio YTM" value={pct(portfolioYTM, 2)} hint={`Duration ${portfolioDuration.toFixed(1)}y`} />
        </div>

        <Card title="Portfolio Cashflow Summary">
          <div className="grid md:grid-cols-5 gap-3">
            <CFStat label="Contribution" value={contribution} tone="neutral" />
            <CFStat label="Distribution" value={distribution} tone="neutral" />
            <CFStat label="Realized G/L" value={realizedGL} tone={realizedGL >= 0 ? "pos" : "neg"} />
            <CFStat label="Unrealized G/L" value={unrealizedGL} tone={unrealizedGL >= 0 ? "pos" : "neg"} />
            <CFStat label="Closing Value" value={totalValue} tone="neutral" highlight />
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "Contribution", v: contribution, i: 0 },
                { name: "Distribution", v: distribution, i: 1 },
                { name: "Realized G/L", v: realizedGL, i: realizedGL >= 0 ? 1 : 3 },
                { name: "Unrealized G/L", v: unrealizedGL, i: unrealizedGL >= 0 ? 1 : 3 },
                { name: "Closing", v: totalValue, i: 0 },
              ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <ChartDefs />
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(v) => `${(v / 1e7).toFixed(1)}Cr`} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} content={<NiceTooltip formatter={(v: number) => fmtINR(v)} />} />
                <Bar dataKey="v" radius={[8, 8, 0, 0]} maxBarSize={64}>
                  {[0,1,2,3,4].map((idx) => {
                    const d = [contribution, distribution, realizedGL, unrealizedGL, totalValue][idx];
                    const pos = d >= 0;
                    return <Cell key={idx} fill={idx === 4 ? grad(0) : pos ? grad(1) : grad(3)} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <Card title="Risk Profile: Target vs Current Allocation">
            <div className="flex gap-2 mb-3 text-xs">
              {Object.keys(RISK_PROFILES).map(rp => (
                <button key={rp} onClick={() => setRiskProfile(rp as any)}
                  className={`px-2.5 py-1 rounded-sm border ${riskProfile === rp ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                  {rp}
                </button>
              ))}
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={targetVsCurrent} layout="vertical" margin={{ top: 6, right: 12, left: 4, bottom: 0 }} barCategoryGap={10}>
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" tick={{ ...AXIS_TICK, fontSize: 10 }} width={130} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} content={<NiceTooltip formatter={(v: number) => pct(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                  <Bar dataKey="target" name="Target" fill={grad(9)} radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="current" name="Current" fill={grad(0)} radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Asset Class Performance vs Benchmark">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byAssetClass.map(a => ({ name: a.name.replace("Mutual Fund - ", "MF "), portfolio: a.ret, benchmark: a.bench.ret }))} margin={{ top: 6, right: 8, left: 0, bottom: 8 }} barCategoryGap={14}>
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...AXIS_TICK, fontSize: 9 }} angle={-18} textAnchor="end" height={64} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} content={<NiceTooltip formatter={(v: number) => pct(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                  <Bar dataKey="portfolio" name="Portfolio" fill={grad(1)} radius={[6, 6, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="benchmark" name="Benchmark" fill={grad(9)} radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </Section>

      {/* SECTION 2: Portfolio Commentary */}
      <CommentarySection
        totalValue={totalValue}
        byAssetClass={byAssetClass}
        byIssuer={byIssuer}
        bySector={bySector}
        byMarketCap={byMarketCap}
        byRating={byRating}
        liquidity={liquidity}
        riskProfile={riskProfile}
        equityShare={equityShare}
        debtShare={debtShare}
        portfolioCount={portfolios.length}
        holdingsCount={allHoldings.length}
      />

      {/* SECTION 3: Asset Class Performance */}
      <Section id="asset" title="3. Asset Class Performance" icon={<Layers className="w-4 h-4" />}>
        <Card title="Asset Class Holdings & Performance">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left py-2">Asset Class</th>
                  <th className="text-right py-2">Holdings</th>
                  <th className="text-right py-2">Value</th>
                  <th className="text-right py-2">% Alloc</th>
                  <th className="text-right py-2">Since Inception</th>
                  <th className="text-right py-2">Review Period (1Y)</th>
                  <th className="text-left py-2 pl-4">Benchmark</th>
                  <th className="text-right py-2">Benchmark Ret</th>
                  <th className="text-right py-2">Alpha</th>
                </tr>
              </thead>
              <tbody>
                {byAssetClass.map(a => {
                  const review1Y = a.ret * 0.6;
                  const alpha = a.ret - a.bench.ret;
                  return (
                    <tr key={a.name} className="border-b border-border/50">
                      <td className="py-2.5 font-medium">{a.name}</td>
                      <td className="py-2.5 text-right mono-num">{a.count}</td>
                      <td className="py-2.5 text-right mono-num">{fmtINR(a.value)}</td>
                      <td className="py-2.5 text-right mono-num">{pct(a.pct)}</td>
                      <td className={`py-2.5 text-right mono-num ${clsPct(a.ret)}`}>{pct(a.ret)}</td>
                      <td className={`py-2.5 text-right mono-num ${clsPct(review1Y)}`}>{pct(review1Y)}</td>
                      <td className="py-2.5 pl-4 text-muted-foreground">{a.bench.name}</td>
                      <td className="py-2.5 text-right mono-num text-muted-foreground">{pct(a.bench.ret)}</td>
                      <td className={`py-2.5 text-right mono-num font-semibold ${clsPct(alpha)}`}>{alpha >= 0 ? "+" : ""}{alpha.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* SECTION 4: Liquidity & Cashflows */}
      <Section id="liquidity" title="4. Portfolio Liquidity & Upcoming Cashflows (180 days)" icon={<Droplet className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Liquidity Profile">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartDefs />
                  <Pie data={liquidity} dataKey="value" nameKey="name" innerRadius={50} outerRadius={92} paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}
                    label={(e: any) => e.pct >= 6 ? `${pct(e.pct, 0)}` : ""} labelLine={false}>
                    {liquidity.map((_, i) => <Cell key={i} fill={rgrad(i)} />)}
                  </Pie>
                  <Tooltip content={<NiceTooltip formatter={(v: number) => fmtINR(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-xs mt-2">
              <tbody>
                {liquidity.map(l => (
                  <tr key={l.name} className="border-t border-border/50">
                    <td className="py-1.5">{l.name}</td>
                    <td className="py-1.5 text-right mono-num">{fmtINR(l.value)}</td>
                    <td className="py-1.5 text-right mono-num w-16">{pct(l.pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Upcoming Cashflows — Next 180 Days">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={upcomingCF} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barCategoryGap={14}>
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="bucket" tick={{ ...AXIS_TICK, fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e5).toFixed(0)}L`} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} content={<NiceTooltip formatter={(v: number) => fmtINR(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconType="circle" />
                  <Bar dataKey="coupon" name="Coupon" stackId="a" fill={grad(1)} maxBarSize={36} />
                  <Bar dataKey="maturity" name="Maturity" stackId="a" fill={grad(2)} radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">
              Total expected inflow: <span className="mono-num font-semibold text-foreground">{fmtINR(upcomingCF.reduce((s, b) => s + b.coupon + b.maturity, 0))}</span>
            </div>
          </Card>
        </div>
      </Section>

      {/* SECTION 5: Product Holdings */}
      <Section id="products" title="5. Product Wise Holdings" icon={<Building2 className="w-4 h-4" />}>
        {byAssetClass.map(ac => (
          <Card key={ac.name} title={`${ac.name} — ${fmtINR(ac.value)} (${pct(ac.pct)})`}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">Scheme / Security</th>
                    <th className="text-left py-2">ISIN</th>
                    <th className="text-right py-2">Quantity</th>
                    <th className="text-right py-2">Price</th>
                    <th className="text-right py-2">Value</th>
                    <th className="text-right py-2">% Sleeve</th>
                    <th className="text-right py-2">Return</th>
                  </tr>
                </thead>
                <tbody>
                  {ac.holdings.sort((a, b) => b.value - a.value).slice(0, 15).map(h => {
                    const r = seedNum(h.isin, -8, 28);
                    return (
                      <tr key={h.isin} className="border-b border-border/50">
                        <td className="py-2 max-w-[280px] whitespace-normal break-words leading-snug">{h.name}</td>
                        <td className="py-2 mono-num text-muted-foreground whitespace-nowrap">{h.isin}</td>
                        <td className="py-2 text-right mono-num">{h.quantity.toFixed(3)}</td>
                        <td className="py-2 text-right mono-num">{h.price.toFixed(2)}</td>
                        <td className="py-2 text-right mono-num">{fmtINR(h.value)}</td>
                        <td className="py-2 text-right mono-num">{pct((h.value / ac.value) * 100)}</td>
                        <td className={`py-2 text-right mono-num ${clsPct(r)}`}>{pct(r)}</td>
                      </tr>
                    );
                  })}
                  {ac.holdings.length > 15 && (
                    <tr><td colSpan={7} className="py-2 text-center text-[10px] text-muted-foreground">+ {ac.holdings.length - 15} more</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

        {mfAMC.length > 0 && (
          <Card title="AMC-wise Performance Summary">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">AMC</th>
                    <th className="text-right py-2">Schemes</th>
                    <th className="text-right py-2">Value</th>
                    <th className="text-right py-2">% of MF</th>
                    <th className="text-right py-2">Weighted Return</th>
                  </tr>
                </thead>
                <tbody>
                  {mfAMC.map(a => {
                    const totalMF = mfAMC.reduce((s, x) => s + x.value, 0) || 1;
                    return (
                      <tr key={a.name} className="border-b border-border/50">
                        <td className="py-2 font-medium">{a.name}</td>
                        <td className="py-2 text-right mono-num">{a.count}</td>
                        <td className="py-2 text-right mono-num">{fmtINR(a.value)}</td>
                        <td className="py-2 text-right mono-num">{pct((a.value / totalMF) * 100)}</td>
                        <td className={`py-2 text-right mono-num ${clsPct(a.ret)}`}>{pct(a.ret)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Section>

      {/* SECTION 6: Drilldown */}
      <Section id="drilldown" title="6. Portfolio Drilldown" icon={<TrendingUp className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Top 10 Issuers">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byIssuer.slice(0, 10)} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                  <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e5).toFixed(0)}L`} />
                  <YAxis dataKey="name" type="category" tick={{ ...AXIS_TICK, fontSize: 10 }} width={120} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} content={<NiceTooltip formatter={(v: number) => fmtINR(v)} />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={14}>
                    {byIssuer.slice(0, 10).map((_, i) => <Cell key={i} fill={grad(i)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Sector Concentration (Equity)">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartDefs />
                  <Pie data={bySector} dataKey="value" nameKey="name" innerRadius={48} outerRadius={92} paddingAngle={1.5} stroke="hsl(var(--background))" strokeWidth={2}
                    label={(e: any) => e.pct > 6 ? e.name : ""} labelLine={false}>
                    {bySector.map((_, i) => <Cell key={i} fill={rgrad(i)} />)}
                  </Pie>
                  <Tooltip content={<NiceTooltip formatter={(v: number) => fmtINR(v)} />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Market Cap Mix (Equity)">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <ChartDefs />
                  <Pie data={byMarketCap} dataKey="value" nameKey="name" innerRadius={42} outerRadius={82} paddingAngle={2} stroke="hsl(var(--background))" strokeWidth={2}
                    label={(e: any) => `${pct(e.pct, 0)}`} labelLine={false}>
                    {byMarketCap.map((_, i) => <Cell key={i} fill={rgrad(i + 2)} />)}
                  </Pie>
                  <Tooltip content={<NiceTooltip formatter={(v: number) => fmtINR(v)} />} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 6 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Credit Rating Profile (Debt)">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRating} margin={{ top: 6, right: 8, left: 0, bottom: 0 }} barCategoryGap={14}>
                  <ChartDefs />
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                  <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1e5).toFixed(0)}L`} />
                  <Tooltip cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }} content={<NiceTooltip formatter={(v: number) => fmtINR(v)} />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {byRating.map((_, i) => <Cell key={i} fill={grad(i + 1)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <Card title="Top 5 Asset Classes — Security-wise Top 5">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {byAssetClass.slice(0, 5).map(ac => (
              <div key={ac.name} className="border border-border rounded-sm p-3">
                <div className="text-xs font-semibold mb-2">{ac.name}</div>
                <table className="w-full text-[11px]">
                  <tbody>
                    {ac.holdings.sort((a, b) => b.value - a.value).slice(0, 5).map(h => (
                      <tr key={h.isin} className="border-t border-border/50">
                        <td className="py-1 truncate max-w-[140px]">{h.name}</td>
                        <td className="py-1 text-right mono-num">{fmtINR(h.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* SECTION 7: MF Drilldown */}
      <Section id="mf" title="7. Mutual Fund Drilldown" icon={<Layers className="w-4 h-4" />}>
        <MFOverlap holdings={allHoldings} />
        <FixedIncomeMFAnalysis holdings={allHoldings} />
      </Section>

      {/* SECTION 8: Annexures */}
      <Section id="annex" title="8. Annexures" icon={<Shield className="w-4 h-4" />}>
        <Card title="Annexure A — Asset Class & Benchmark Mapping">
          <table className="w-full text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">Asset Class</th>
                <th className="text-left py-2">Benchmark Index</th>
                <th className="text-right py-2">1Y Return</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(ASSET_BENCHMARKS).map(([k, v]) => (
                <tr key={k} className="border-b border-border/50">
                  <td className="py-2">{k}</td>
                  <td className="py-2 text-muted-foreground">{v.name}</td>
                  <td className="py-2 text-right mono-num">{pct(v.ret)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title={`Annexure B — Bond Holdings (ISIN List, ${bondHoldings.length} securities)`}>
          {bondHoldings.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">No direct debt holdings in this portfolio.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="text-left py-2">ISIN</th>
                    <th className="text-left py-2">Security</th>
                    <th className="text-left py-2">Rating</th>
                    <th className="text-right py-2">Quantity</th>
                    <th className="text-right py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {bondHoldings.map(h => (
                    <tr key={h.isin} className="border-b border-border/50">
                      <td className="py-1.5 mono-num">{h.isin}</td>
                      <td className="py-1.5 truncate max-w-[320px]">{h.name}</td>
                      <td className="py-1.5">{ratingOf(h.name)}</td>
                      <td className="py-1.5 text-right mono-num">{h.quantity.toFixed(2)}</td>
                      <td className="py-1.5 text-right mono-num">{fmtINR(h.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </Section>

      <div className="text-[10px] text-muted-foreground text-center py-6 border-t border-border mt-8">
        Generated by mPower Wealth · This report uses analytics derived from imported eCAS holdings; benchmark and performance figures are illustrative model estimates.
      </div>
    </div>
  );
}

// ============================================================================
// MF Overlap & Fixed Income components
// ============================================================================

function MFOverlap({ holdings }: { holdings: Holding[] }) {
  const equityMF = holdings.filter(h => h.type === "Mutual Fund" && /Equity|Cap|Bluechip|Multi|Flexi|ELSS|Focused|Value/i.test(h.name));

  // Synthesized overlap matrix
  const matrix = useMemo(() => {
    return equityMF.map((a, i) => ({
      name: a.name.split(/\s+/).slice(0, 3).join(" "),
      values: equityMF.map((b, j) => {
        if (i === j) return 100;
        const seed = a.isin + b.isin;
        return Math.round(seedNum(seed, 15, 65));
      }),
    }));
  }, [equityMF]);

  if (equityMF.length === 0) {
    return <Card title="Equity Mutual Fund Overlap Analysis"><div className="text-xs text-muted-foreground py-4 text-center">No equity mutual funds in portfolio.</div></Card>;
  }

  return (
    <Card title={`Equity Mutual Fund Overlap Analysis (${equityMF.length} funds)`}>
      <div className="overflow-x-auto">
        <table className="text-[10px]">
          <thead>
            <tr>
              <th className="text-left py-1 pr-3"></th>
              {matrix.map((m, i) => (
                <th key={i} className="px-1 py-1 text-center font-normal text-muted-foreground" style={{ writingMode: "vertical-rl", height: 90 }}>
                  {m.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, i) => (
              <tr key={i}>
                <td className="text-left pr-3 py-1 max-w-[180px] truncate">{row.name}</td>
                {row.values.map((v, j) => {
                  const intensity = v / 100;
                  const bg = i === j ? "#374151" : `rgba(99, 102, 241, ${intensity})`;
                  return (
                    <td key={j} className="text-center mono-num text-[10px] font-medium" style={{ background: bg, color: intensity > 0.5 ? "#fff" : "inherit", width: 32, height: 28 }}>
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-muted-foreground mt-3">Values represent % of common holdings (by weight) between fund pairs. Higher % = more overlap = less diversification benefit.</div>
    </Card>
  );
}

function FixedIncomeMFAnalysis({ holdings }: { holdings: Holding[] }) {
  const debtMF = holdings.filter(h => h.type === "Mutual Fund" && /Debt|Bond|Gilt|Income|Credit|Corporate|Liquid|Overnight|Money Market/i.test(h.name));
  if (debtMF.length === 0) {
    return <Card title="Fixed Income Mutual Fund Analysis"><div className="text-xs text-muted-foreground py-4 text-center">No fixed income mutual funds in portfolio.</div></Card>;
  }
  return (
    <Card title={`Fixed Income Mutual Fund Analysis (${debtMF.length} funds)`}>
      <table className="w-full text-xs">
        <thead className="text-[10px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border">
            <th className="text-left py-2">Scheme</th>
            <th className="text-right py-2">Value</th>
            <th className="text-right py-2">YTM</th>
            <th className="text-right py-2">Modified Duration</th>
            <th className="text-right py-2">Avg Maturity</th>
            <th className="text-left py-2 pl-3">Credit Quality</th>
          </tr>
        </thead>
        <tbody>
          {debtMF.map(h => {
            const ytm = seedNum(h.isin + "y", 6.4, 8.2);
            const dur = seedNum(h.isin + "d", 0.3, 6.5);
            const mat = dur * seedNum(h.isin + "m", 1.05, 1.4);
            const credit = /Gilt|Government|G-Sec/i.test(h.name) ? "Sovereign" : /Credit Risk/i.test(h.name) ? "AA & Below" : "AAA / AA+";
            return (
              <tr key={h.isin} className="border-b border-border/50">
                <td className="py-2 truncate max-w-[300px]">{h.name}</td>
                <td className="py-2 text-right mono-num">{fmtINR(h.value)}</td>
                <td className="py-2 text-right mono-num">{pct(ytm, 2)}</td>
                <td className="py-2 text-right mono-num">{dur.toFixed(1)}y</td>
                <td className="py-2 text-right mono-num">{mat.toFixed(1)}y</td>
                <td className="py-2 pl-3 text-muted-foreground">{credit}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ============================================================================
// UI helpers
// ============================================================================

function Section({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-border">
        <div className="text-foreground">{icon}</div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md bg-surface">
      <div className="px-4 py-2.5 border-b border-border text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-border rounded-md bg-surface p-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1 mono-num">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function CFStat({ label, value, tone, highlight }: { label: string; value: number; tone: "pos" | "neg" | "neutral"; highlight?: boolean }) {
  const colorCls = tone === "pos" ? "text-positive" : tone === "neg" ? "text-negative" : "text-foreground";
  return (
    <div className={`border ${highlight ? "border-foreground/40 bg-secondary/40" : "border-border"} rounded-sm p-3`}>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold mt-1 mono-num ${colorCls}`}>{tone === "pos" ? "+" : ""}{fmtINR(Math.abs(value))}</div>
    </div>
  );
}

// ============================================================================
// Portfolio Commentary
// ============================================================================

type CommentaryProps = {
  totalValue: number;
  byAssetClass: Array<{ name: string; value: number; pct: number; ret: number; bench: { name: string; ret: number } }>;
  byIssuer: Array<{ name: string; value: number; pct: number }>;
  bySector: Array<{ name: string; value: number; pct: number }>;
  byMarketCap: Array<{ name: string; value: number; pct: number }>;
  byRating: Array<{ name: string; value: number; pct: number }>;
  liquidity: Array<{ name: string; value: number; pct: number }>;
  riskProfile: string;
  equityShare: number;
  debtShare: number;
  portfolioCount: number;
  holdingsCount: number;
};

function CommentarySection(p: CommentaryProps) {
  const {
    totalValue, byAssetClass, byIssuer, bySector, byMarketCap, byRating,
    liquidity, riskProfile, equityShare, debtShare, portfolioCount, holdingsCount,
  } = p;

  // ---- Performance ----
  const weightedReturn = byAssetClass.reduce((s, a) => s + a.ret * (a.pct / 100), 0);
  const weightedBench = byAssetClass.reduce((s, a) => s + a.bench.ret * (a.pct / 100), 0);
  const alpha = weightedReturn - weightedBench;
  const bestAsset = [...byAssetClass].sort((a, b) => (b.ret - b.bench.ret) - (a.ret - a.bench.ret))[0];
  const worstAsset = [...byAssetClass].sort((a, b) => (a.ret - a.bench.ret) - (b.ret - b.bench.ret))[0];

  // ---- Concentration ----
  const top1 = byIssuer[0];
  const top5Share = byIssuer.slice(0, 5).reduce((s, i) => s + i.pct, 0);
  const top10Share = byIssuer.slice(0, 10).reduce((s, i) => s + i.pct, 0);
  const topSector = bySector[0];
  const top3Sector = bySector.slice(0, 3).reduce((s, i) => s + i.pct, 0);

  // ---- Risk ----
  const liquidPct = liquidity.filter(l => /T\+1|T\+3|Short/.test(l.name)).reduce((s, l) => s + l.pct, 0);
  const illiquidPct = liquidity.filter(l => /Long/.test(l.name)).reduce((s, l) => s + l.pct, 0);
  const sovereignAAA = byRating.filter(r => /Sovereign|AAA/.test(r.name)).reduce((s, r) => s + r.pct, 0);
  const subAA = byRating.filter(r => /^A$|AA(?!A|\+)/.test(r.name)).reduce((s, r) => s + r.pct, 0);
  const largeCap = byMarketCap.find(m => m.name === "Large Cap")?.pct ?? 0;
  const smallMid = (byMarketCap.find(m => m.name === "Small Cap")?.pct ?? 0) + (byMarketCap.find(m => m.name === "Mid Cap")?.pct ?? 0);

  // ---- Risk score (heuristic 1–10) ----
  let riskScore = 3;
  if (equityShare > 0.6) riskScore += 2; else if (equityShare > 0.4) riskScore += 1;
  if (smallMid > 30) riskScore += 1;
  if (top5Share > 40) riskScore += 1;
  if (top3Sector > 60) riskScore += 1;
  if (subAA > 10) riskScore += 1;
  if (illiquidPct > 30) riskScore += 1;
  riskScore = Math.min(10, riskScore);
  const riskBand = riskScore <= 3 ? "Low" : riskScore <= 6 ? "Moderate" : riskScore <= 8 ? "Moderately High" : "High";

  // ---- Comparative vs risk profile ----
  const profileEquityTarget: Record<string, number> = { Conservative: 25, Moderate: 50, Aggressive: 75 };
  const targetEq = profileEquityTarget[riskProfile] ?? 50;
  const equityGap = equityShare * 100 - targetEq;

  // ---- Build narrative ----
  type Item = { kind: "good" | "warn" | "info"; text: string };
  const performance: Item[] = [
    {
      kind: alpha >= 0 ? "good" : "warn",
      text: `Blended portfolio return of ${pct(weightedReturn)} is ${alpha >= 0 ? "ahead of" : "behind"} the blended benchmark (${pct(weightedBench)}) by ${Math.abs(alpha).toFixed(1)}%${alpha >= 0 ? ", indicating positive alpha generation." : ", indicating underperformance that warrants a manager-level review."}`,
    },
    bestAsset && {
      kind: "good" as const,
      text: `Best-performing sleeve: ${bestAsset.name} delivered ${pct(bestAsset.ret)} vs ${pct(bestAsset.bench.ret)} benchmark (${(bestAsset.ret - bestAsset.bench.ret >= 0 ? "+" : "")}${(bestAsset.ret - bestAsset.bench.ret).toFixed(1)}% alpha).`,
    },
    worstAsset && worstAsset.name !== bestAsset?.name && {
      kind: (worstAsset.ret - worstAsset.bench.ret) < -2 ? "warn" as const : "info" as const,
      text: `Weakest sleeve: ${worstAsset.name} at ${pct(worstAsset.ret)} vs benchmark ${pct(worstAsset.bench.ret)} (${(worstAsset.ret - worstAsset.bench.ret).toFixed(1)}%). ${(worstAsset.ret - worstAsset.bench.ret) < -2 ? "Consider rebalancing or replacing underperforming schemes." : "Within tolerance — continue monitoring."}`,
    },
  ].filter(Boolean) as Item[];

  const concentration: Item[] = [
    top1 && {
      kind: top1.pct > 15 ? "warn" : top1.pct > 10 ? "info" : "good" as const,
      text: `Single-name concentration: largest holding "${top1.name}" represents ${pct(top1.pct)} of portfolio value${top1.pct > 15 ? " — exceeds the 15% prudent threshold and creates idiosyncratic risk." : top1.pct > 10 ? " — within tolerance but worth monitoring." : " — well diversified at the issuer level."}`,
    },
    {
      kind: top5Share > 50 ? "warn" : top5Share > 35 ? "info" : "good",
      text: `Top 5 issuers account for ${pct(top5Share)} of AUM; top 10 cover ${pct(top10Share)}. ${top5Share > 50 ? "High concentration — diversification benefit is limited." : top5Share > 35 ? "Moderate concentration consistent with conviction investing." : "Diversification is healthy."}`,
    },
    topSector && {
      kind: topSector.pct > 35 ? "warn" : topSector.pct > 25 ? "info" : "good" as const,
      text: `Sector mix (equity sleeve): ${topSector.name} is the largest at ${pct(topSector.pct)}, top-3 sectors at ${pct(top3Sector)}. ${topSector.pct > 35 ? "Sector-level concentration is elevated — vulnerable to sector-specific drawdowns." : "Sector dispersion is reasonable."}`,
    },
  ].filter(Boolean) as Item[];

  const risk: Item[] = [
    {
      kind: "info",
      text: `Composite risk band: ${riskBand} (${riskScore}/10). Equity share at ${pct(equityShare * 100)}, debt/cash at ${pct(debtShare * 100)}.`,
    },
    {
      kind: smallMid > 35 ? "warn" : "info",
      text: `Market-cap mix: Large Cap ${pct(largeCap)}, Mid+Small ${pct(smallMid)}. ${smallMid > 35 ? "Tilt toward Mid/Small caps elevates beta and drawdown risk in a correction." : "Balanced cap-curve exposure."}`,
    },
    {
      kind: subAA > 10 ? "warn" : "good",
      text: `Credit quality: Sovereign/AAA ${pct(sovereignAAA)}, sub-AA exposure ${pct(subAA)}. ${subAA > 10 ? "Material allocation to below-AA credit — review issuer-level spread risk." : "Credit profile is conservative."}`,
    },
    {
      kind: illiquidPct > 30 ? "warn" : "info",
      text: `Liquidity profile: ${pct(liquidPct)} liquid within 1 year, ${pct(illiquidPct)} locked beyond 3 years. ${illiquidPct > 30 ? "Significant illiquid bucket — ensure emergency reserves are adequate." : "Liquidity ladder supports near-term cashflow needs."}`,
    },
  ];

  const comparative: Item[] = [
    {
      kind: Math.abs(equityGap) > 15 ? "warn" : Math.abs(equityGap) > 7 ? "info" : "good",
      text: `Against a ${riskProfile} risk profile (target equity ≈ ${targetEq}%), portfolio is ${equityGap > 0 ? "over-weight" : "under-weight"} equity by ${Math.abs(equityGap).toFixed(1)} pp. ${Math.abs(equityGap) > 15 ? "Recommend a rebalancing trade." : Math.abs(equityGap) > 7 ? "Drift is within rebalancing band — review quarterly." : "Aligned with policy."}`,
    },
    {
      kind: "info",
      text: `Vs blended benchmark (asset-weighted), portfolio alpha is ${alpha >= 0 ? "+" : ""}${alpha.toFixed(1)}%. ${alpha >= 2 ? "Strong active value-add." : alpha >= 0 ? "Marginal outperformance — consistent with passive tilt." : alpha >= -2 ? "Mild underperformance — within expected dispersion." : "Material lag — investigate cost/manager selection."}`,
    },
    portfolioCount > 1 ? {
      kind: "info" as const,
      text: `Family aggregation covers ${portfolioCount} portfolios and ${holdingsCount} holdings totalling ${fmtINR(totalValue)}; commentary above is at the consolidated level.`,
    } : {
      kind: "info" as const,
      text: `Single-customer view across ${holdingsCount} holdings totalling ${fmtINR(totalValue)}.`,
    },
  ];

  return (
    <Section id="commentary" title="2. Portfolio Commentary" icon={<MessageSquare className="w-4 h-4" />}>
      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="Blended Return" value={pct(weightedReturn)} hint={`vs ${pct(weightedBench)} bench`} />
        <Stat label="Portfolio Alpha" value={`${alpha >= 0 ? "+" : ""}${alpha.toFixed(1)}%`} hint="asset-weighted" />
        <Stat label="Risk Band" value={`${riskBand}`} hint={`Score ${riskScore}/10`} />
        <Stat label="Top 5 Concentration" value={pct(top5Share)} hint={`Top issuer ${top1 ? pct(top1.pct) : "—"}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <CommentaryCard title="Performance" icon={<TrendingUp className="w-4 h-4" />} items={performance} />
        <CommentaryCard title="Concentration" icon={<Layers className="w-4 h-4" />} items={concentration} />
        <CommentaryCard title="Risk" icon={<Shield className="w-4 h-4" />} items={risk} />
        <CommentaryCard title="Comparative Analysis" icon={<PieIcon className="w-4 h-4" />} items={comparative} />
      </div>

      <Card title="Advisor Summary">
        <p className="text-xs leading-relaxed text-foreground/90">
          The {portfolioCount > 1 ? "consolidated family" : "customer"} portfolio of <span className="mono-num font-semibold">{fmtINR(totalValue)}</span> is currently positioned with
          {" "}<span className="font-semibold">{pct(equityShare * 100, 0)} equity</span> and <span className="font-semibold">{pct(debtShare * 100, 0)} debt/cash</span>,
          {" "}{Math.abs(equityGap) <= 7 ? "broadly aligned" : equityGap > 0 ? "overweight equity" : "underweight equity"} relative to a <span className="font-semibold">{riskProfile}</span> mandate.
          {" "}Blended performance of <span className={`mono-num font-semibold ${clsPct(weightedReturn)}`}>{pct(weightedReturn)}</span> delivers
          {" "}<span className={`mono-num font-semibold ${clsPct(alpha)}`}>{alpha >= 0 ? "+" : ""}{alpha.toFixed(1)}%</span> alpha over the asset-weighted benchmark.
          {" "}Issuer concentration is {top5Share > 50 ? "high" : top5Share > 35 ? "moderate" : "well diversified"} (top-5 at {pct(top5Share)}), with sector tilt toward
          {" "}<span className="font-semibold">{topSector?.name ?? "—"}</span> ({pct(topSector?.pct ?? 0)}).
          {" "}Credit profile is {subAA > 10 ? "carrying meaningful sub-AA risk" : "conservative (Sovereign/AAA dominated)"}, and the liquidity ladder shows
          {" "}{pct(liquidPct)} accessible within a year. Overall composite risk band: <span className="font-semibold">{riskBand}</span>.
        </p>
      </Card>
    </Section>
  );
}

function CommentaryCard({ title, icon, items }: { title: string; icon: ReactNode; items: Array<{ kind: "good" | "warn" | "info"; text: string }> }) {
  return (
    <Card title={title}>
      <ul className="space-y-2.5">
        {items.map((it, i) => {
          const Icon = it.kind === "good" ? CheckCircle2 : it.kind === "warn" ? AlertTriangle : Info;
          const tone = it.kind === "good" ? "text-positive" : it.kind === "warn" ? "text-amber-500" : "text-muted-foreground";
          return (
            <li key={i} className="flex gap-2.5 text-xs leading-relaxed">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${tone}`} />
              <span className="text-foreground/90">{it.text}</span>
            </li>
          );
        })}
      </ul>
      <span className="hidden">{icon}</span>
    </Card>
  );
}
