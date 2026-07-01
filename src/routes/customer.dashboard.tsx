import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getSession, getSessionPortfolio, pseudoRandom, type CustomerSession } from "@/lib/customer-auth";
import type { Holding } from "@/lib/ecas-parser";
import { fmtMoney, REGION_META } from "@/lib/region";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, Target, ShoppingBag, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/customer/dashboard")({
  component: DashboardPage,
});

const COLORS = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#84cc16", "#f97316"];

function assetClassOf(h: Holding): string {
  if (h.productCategory) {
    if (h.productCategory.startsWith("Mutual Fund")) return h.productCategory.replace("Mutual Fund - ", "MF ");
    return h.productCategory;
  }
  return h.type;
}

function broadClassOf(h: Holding): string {
  const c = assetClassOf(h);
  if (/Equity|Stock|MF Equity|Direct Equity|REIT/.test(c)) return "Equity";
  if (/Bond|Debt|MF Debt|G-Sec|NCD/.test(c)) return "Fixed Income";
  if (/Hybrid/.test(c)) return "Hybrid";
  if (/PMS|AIF|InvIT|Private/.test(c)) return "Alternatives";
  if (/ETF/.test(c)) return "ETF";
  return "Other";
}

function issuerOf(h: Holding): string {
  const parts = h.name.split(/[ -]+/);
  return parts.slice(0, 2).join(" ").replace(/\.$/, "").trim() || h.name;
}

const SECTOR_MAP: Array<{ re: RegExp; sector: string }> = [
  { re: /bank|hdfc|icici|sbi|axis|kotak|indusind|yes/i, sector: "Financials" },
  { re: /tech|infy|tcs|wipro|hcl|persistent|coforge|mindtree|infosys/i, sector: "IT" },
  { re: /pharma|sun\s*pharm|dr\s*reddy|cipla|lupin|biocon/i, sector: "Pharma" },
  { re: /auto|maruti|tata\s*motor|bajaj\s*auto|hero|eicher|mahindra/i, sector: "Auto" },
  { re: /oil|gas|reliance|ongc|bpcl|hpcl|petro/i, sector: "Energy" },
  { re: /power|ntpc|adani|tata\s*power/i, sector: "Utilities" },
  { re: /cement|ultratech|acc|shree/i, sector: "Materials" },
  { re: /consumer|hul|itc|nestle|dabur|britannia|godrej/i, sector: "Consumer" },
  { re: /realty|dlf|oberoi|godrej\s*prop/i, sector: "Realty" },
  { re: /telecom|bharti|airtel|jio/i, sector: "Telecom" },
];

function sectorOf(h: Holding): string {
  if (broadClassOf(h) === "Fixed Income") return "Fixed Income";
  if (broadClassOf(h) === "Hybrid") return "Hybrid";
  if (broadClassOf(h) === "Alternatives") return "Alternatives";
  for (const s of SECTOR_MAP) if (s.re.test(h.name)) return s.sector;
  return "Diversified";
}

function DashboardPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<CustomerSession | null>(null);
  const portfolio = useMemo(() => getSessionPortfolio(), [session?.portfolioId]);

  useEffect(() => {
    const s = getSession();
    if (!s) { navigate({ to: "/customer/login" }); return; }
    setSession(s);
  }, [navigate]);

  if (!session || !portfolio) return null;

  const holdings = portfolio.data.holdings;
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  const byClass = groupSum(holdings, broadClassOf);
  const byProduct = groupSum(holdings, assetClassOf);
  const bySector = groupSum(holdings, sectorOf);
  const byIssuer = groupSum(holdings, issuerOf).slice(0, 10);

  // Mocked KPIs derived deterministically from portfolio id
  const seed = portfolio.id;
  const ytdReturn = pseudoRandom(seed + "ytd", -4, 22);
  const oneYear = pseudoRandom(seed + "1y", 4, 26);
  const threeYearCagr = pseudoRandom(seed + "3y", 6, 18);
  const xirr = pseudoRandom(seed + "xirr", 8, 17);
  const invested = totalValue * pseudoRandom(seed + "inv", 0.65, 0.9);
  const gain = totalValue - invested;

  // Benchmark comparison (mocked)
  const benchmark = pseudoRandom(seed + "bm", 6, 18);

  // Time-series (rebased to 100). Monthly points for last 36 months, deterministic walk.
  const perfSeries = (() => {
    const months = 36;
    const now = new Date();
    const pDrift = xirr / 12 / 100;
    const bDrift = benchmark / 12 / 100;
    const pVol = 0.028;
    const bVol = 0.022;
    let p = 100, b = 100;
    const rows: { date: string; portfolio: number; benchmark: number }[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const pShock = (pseudoRandom(seed + "p" + i, -1, 1)) * pVol;
      const bShock = (pseudoRandom(seed + "b" + i, -1, 1)) * bVol;
      p = p * (1 + pDrift + pShock);
      b = b * (1 + bDrift + bShock);
      rows.push({
        date: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
        portfolio: +p.toFixed(2),
        benchmark: +b.toFixed(2),
      });
    }
    return rows;
  })();

  // Risk profile radar (target vs current)
  const target = riskTargetFor(session.riskProfile);
  const current = currentRiskAllocation(byClass, totalValue);
  const radar = Object.keys(target).map(k => ({ dimension: k, target: target[k], current: current[k] ?? 0 }));

  const riskScore = riskScoreFor(session.riskProfile);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {session.name.split(" ")[0]}</h1>
          <p className="text-sm text-muted-foreground">
            {portfolio.name} · {REGION_META[session.region].label} · Risk profile: <span className="font-medium">{session.riskProfile}</span>
          </p>
        </div>
        <Link to="/customer/invest" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          <ShoppingBag className="w-4 h-4" /> Invest Now
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi icon={<Wallet className="w-4 h-4" />} label="Current Value" value={fmtMoney(totalValue)} sub={`Invested ${fmtMoney(invested)}`} />
        <Kpi icon={gain >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          label="Unrealised G/L" value={fmtMoney(gain)}
          sub={`${((gain / invested) * 100).toFixed(2)}%`} tone={gain >= 0 ? "pos" : "neg"} />
        <Kpi icon={<PieIcon className="w-4 h-4" />} label="XIRR (since inception)" value={`${xirr.toFixed(2)}%`} sub={`1Y ${oneYear.toFixed(2)}%`} tone={xirr >= 0 ? "pos" : "neg"} />
        <Kpi icon={<Target className="w-4 h-4" />} label="Products / Holdings" value={`${holdings.length}`}
          sub={`${new Set(holdings.map(assetClassOf)).size} product types`} />
      </div>

      {/* Performance vs benchmark — time series */}
      <Panel title="Performance vs Benchmark" subtitle="Rebased to 100 · monthly · trailing 36 months.">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={perfSeries} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={11} minTickGap={20} />
              <YAxis fontSize={11} domain={["auto", "auto"]} />
              <Tooltip formatter={(v: number) => v.toFixed(2)} />
              <Legend />
              <Line type="monotone" dataKey="portfolio" name="Your Portfolio" stroke="#4f46e5" strokeWidth={2.2} dot={false} />
              <Line type="monotone" dataKey="benchmark" name="Benchmark" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Risk radar + Unified exposure switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Risk Profile" subtitle={`Target allocation for "${session.riskProfile}" vs your current mix.`}>
          <div className="flex items-center gap-3 mb-2 text-xs">
            <ShieldAlert className="w-4 h-4 text-primary" />
            <span>Risk score: <span className="font-semibold">{riskScore}/10</span></span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" fontSize={11} />
                <PolarRadiusAxis fontSize={10} />
                <Radar name="Target" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                <Radar name="Current" dataKey="current" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.35} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <ExposureSwitcher
          byClass={byClass}
          byProduct={byProduct}
          bySector={bySector}
          totalValue={totalValue}
        />
      </div>


      <Panel title="Top Issuers" subtitle="Top 10 issuer / instrument level exposure.">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 px-2">Issuer</th>
                <th className="text-right py-2 px-2">Value</th>
                <th className="text-right py-2 px-2">% of Portfolio</th>
                <th className="text-left py-2 px-2 w-1/3">Concentration</th>
              </tr>
            </thead>
            <tbody>
              {byIssuer.map((r) => {
                const pct = (r.value / totalValue) * 100;
                return (
                  <tr key={r.name} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium">{r.name}</td>
                    <td className="py-2 px-2 text-right mono-num">{fmtMoney(r.value)}</td>
                    <td className="py-2 px-2 text-right mono-num">{pct.toFixed(2)}%</td>
                    <td className="py-2 px-2">
                      <div className="h-2 rounded bg-muted overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Product performance table */}
      <Panel title="Product Performance Summary" subtitle="Blended return per product category.">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 px-2">Product</th>
                <th className="text-right py-2 px-2">Value</th>
                <th className="text-right py-2 px-2">Weight</th>
                <th className="text-right py-2 px-2">1Y Return</th>
                <th className="text-right py-2 px-2">3Y CAGR</th>
              </tr>
            </thead>
            <tbody>
              {byProduct.map(r => {
                const w = (r.value / totalValue) * 100;
                const oneY = pseudoRandom(seed + r.name + "1y", -4, 24);
                const threeY = pseudoRandom(seed + r.name + "3y", 4, 18);
                return (
                  <tr key={r.name} className="border-b border-border/50">
                    <td className="py-2 px-2 font-medium">{r.name}</td>
                    <td className="py-2 px-2 text-right mono-num">{fmtMoney(r.value)}</td>
                    <td className="py-2 px-2 text-right mono-num">{w.toFixed(2)}%</td>
                    <td className={`py-2 px-2 text-right mono-num ${oneY >= 0 ? "text-positive" : "text-negative"}`}>{oneY >= 0 ? "+" : ""}{oneY.toFixed(2)}%</td>
                    <td className={`py-2 px-2 text-right mono-num ${threeY >= 0 ? "text-positive" : "text-negative"}`}>{threeY >= 0 ? "+" : ""}{threeY.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ---------- helpers ---------- */

type Row = { name: string; value: number };
function groupSum(hs: Holding[], key: (h: Holding) => string): Row[] {
  const map = new Map<string, number>();
  hs.forEach(h => map.set(key(h), (map.get(key(h)) ?? 0) + h.value));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function riskTargetFor(profile: CustomerSession["riskProfile"]): Record<string, number> {
  switch (profile) {
    case "Conservative": return { Equity: 25, "Fixed Income": 60, Hybrid: 10, Alternatives: 5 };
    case "Moderate":     return { Equity: 50, "Fixed Income": 35, Hybrid: 10, Alternatives: 5 };
    case "Balanced":     return { Equity: 60, "Fixed Income": 25, Hybrid: 10, Alternatives: 5 };
    case "Aggressive":   return { Equity: 75, "Fixed Income": 10, Hybrid: 5,  Alternatives: 10 };
  }
}
function riskScoreFor(profile: CustomerSession["riskProfile"]): number {
  return { Conservative: 3, Moderate: 5, Balanced: 6, Aggressive: 8 }[profile];
}
function currentRiskAllocation(rows: Row[], total: number): Record<string, number> {
  const out: Record<string, number> = { Equity: 0, "Fixed Income": 0, Hybrid: 0, Alternatives: 0 };
  rows.forEach(r => {
    if (out[r.name] !== undefined) out[r.name] = +((r.value / total) * 100).toFixed(1);
  });
  return out;
}

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: "pos" | "neg" }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className={`mt-1 text-lg font-semibold mono-num ${tone === "pos" ? "text-positive" : tone === "neg" ? "text-negative" : ""}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ExposureChart({ data, totalValue }: { data: Row[]; totalValue: number }) {
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90} paddingAngle={2}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number, n: string) => [`${fmtMoney(v)} (${((v / totalValue) * 100).toFixed(1)}%)`, n]} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExposureBar({ data, totalValue }: { data: Row[]; totalValue: number }) {
  const chart = data.map(d => ({ name: d.name, pct: +((d.value / totalValue) * 100).toFixed(2) }));
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} layout="vertical" margin={{ left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" unit="%" fontSize={11} />
          <YAxis type="category" dataKey="name" width={140} fontSize={11} />
          <Tooltip formatter={(v: number) => `${v}%`} />
          <Bar dataKey="pct" fill="#4f46e5" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExposureSwitcher({
  byClass, byProduct, bySector, totalValue,
}: { byClass: Row[]; byProduct: Row[]; bySector: Row[]; totalValue: number }) {
  const [view, setView] = useState<"class" | "product" | "sector">("class");
  const map = {
    class:   { data: byClass,   subtitle: "Split across equity, fixed income, hybrids and alternatives.", kind: "pie" as const },
    product: { data: byProduct, subtitle: "By product category (MF, PMS, AIF, Direct Equity, etc.).",    kind: "bar" as const },
    sector:  { data: bySector,  subtitle: "Underlying sector concentration.",                             kind: "pie" as const },
  };
  const active = map[view];
  const btn = (k: "class" | "product" | "sector", label: string) => (
    <button
      key={k}
      onClick={() => setView(k)}
      className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
        view === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      }`}
    >
      {label}
    </button>
  );
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Portfolio Exposure</h2>
          <p className="text-xs text-muted-foreground">{active.subtitle}</p>
        </div>
        <div className="inline-flex items-center gap-1 p-1 rounded-md bg-muted">
          {btn("class",   "Asset Class")}
          {btn("product", "Product")}
          {btn("sector",  "Sector")}
        </div>
      </div>
      {active.kind === "pie"
        ? <ExposureChart data={active.data} totalValue={totalValue} />
        : <ExposureBar   data={active.data} totalValue={totalValue} />}
    </section>
  );
}

