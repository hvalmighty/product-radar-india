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
import { TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, Target, ShoppingBag, ShieldAlert, ChevronRight } from "lucide-react";

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

      {/* Product performance table with drill-down */}
      <Panel title="Product Performance Summary" subtitle="Click a product row to drill down into underlying holdings, purchase price, current valuation, returns and short/long-term capital gains.">
        <ProductPerformanceTable
          byProduct={byProduct}
          holdings={holdings}
          totalValue={totalValue}
          seed={seed}
        />
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

/* ---------- Product performance drill-down ---------- */

type HoldingDetail = {
  h: Holding;
  purchasePrice: number;
  invested: number;
  currentValue: number;
  gain: number;
  returnPct: number;
  holdingMonths: number;
  gainType: "LT" | "ST";
  ltGain: number;
  stGain: number;
  purchaseDate: Date;
};

function isEquityLike(h: Holding): string {
  const c = (h.productCategory || h.type || "").toLowerCase();
  if (c.includes("equity") || c.includes("stock") || c.includes("etf") || c.includes("reit")) return "equity";
  return "nonequity";
}

function buildHoldingDetail(h: Holding, seed: string): HoldingDetail {
  const key = seed + (h.isin || h.name);
  // Purchase price 55%-95% of current price → gains, occasional negatives via wider band
  const factor = pseudoRandom(key + "pp", 0.55, 1.15);
  const purchasePrice = +(h.price * factor).toFixed(2);
  const invested = +(purchasePrice * h.quantity).toFixed(2);
  const currentValue = h.value;
  const gain = +(currentValue - invested).toFixed(2);
  const returnPct = invested > 0 ? +(((currentValue - invested) / invested) * 100).toFixed(2) : 0;
  // Purchase 1-48 months ago
  const holdingMonths = Math.round(pseudoRandom(key + "hm", 1, 48));
  const purchaseDate = new Date();
  purchaseDate.setMonth(purchaseDate.getMonth() - holdingMonths);
  // LT / ST classification: equity >12m LT, non-equity >24m LT
  const cutoff = isEquityLike(h) === "equity" ? 12 : 24;
  const gainType: "LT" | "ST" = holdingMonths > cutoff ? "LT" : "ST";
  return {
    h, purchasePrice, invested, currentValue, gain, returnPct, holdingMonths, purchaseDate,
    gainType,
    ltGain: gainType === "LT" ? gain : 0,
    stGain: gainType === "ST" ? gain : 0,
  };
}

function ProductPerformanceTable({
  byProduct, holdings, totalValue, seed,
}: { byProduct: Row[]; holdings: Holding[]; totalValue: number; seed: string }) {
  const [openProduct, setOpenProduct] = useState<string | null>(null);

  // Group holdings by product name (matching assetClassOf) and precompute details
  const detailsByProduct = useMemo(() => {
    const m = new Map<string, HoldingDetail[]>();
    holdings.forEach(h => {
      const key = assetClassOf(h);
      const arr = m.get(key) ?? [];
      arr.push(buildHoldingDetail(h, seed));
      m.set(key, arr);
    });
    // sort by current value desc within each product
    m.forEach(v => v.sort((a, b) => b.currentValue - a.currentValue));
    return m;
  }, [holdings, seed]);

  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted-foreground border-b">
          <tr>
            <th className="text-left py-2 px-2 w-6"></th>
            <th className="text-left py-2 px-2">Product</th>
            <th className="text-right py-2 px-2">Invested</th>
            <th className="text-right py-2 px-2">Current Value</th>
            <th className="text-right py-2 px-2">Weight</th>
            <th className="text-right py-2 px-2">Unrealised G/L</th>
            <th className="text-right py-2 px-2">Return %</th>
            <th className="text-right py-2 px-2">LTCG</th>
            <th className="text-right py-2 px-2">STCG</th>
          </tr>
        </thead>
        <tbody>
          {byProduct.map(r => {
            const details = detailsByProduct.get(r.name) ?? [];
            const invested = details.reduce((s, d) => s + d.invested, 0);
            const gain = details.reduce((s, d) => s + d.gain, 0);
            const lt = details.reduce((s, d) => s + d.ltGain, 0);
            const st = details.reduce((s, d) => s + d.stGain, 0);
            const w = (r.value / totalValue) * 100;
            const ret = invested > 0 ? ((r.value - invested) / invested) * 100 : 0;
            const isOpen = openProduct === r.name;
            return (
              <>
                <tr
                  key={r.name}
                  className="border-b border-border/50 hover:bg-accent/40 cursor-pointer"
                  onClick={() => setOpenProduct(isOpen ? null : r.name)}
                >
                  <td className="py-2 px-2 text-muted-foreground">
                    <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </td>
                  <td className="py-2 px-2 font-medium">
                    {r.name}
                    <span className="ml-2 text-xs text-muted-foreground">({details.length})</span>
                  </td>
                  <td className="py-2 px-2 text-right mono-num">{fmtMoney(invested)}</td>
                  <td className="py-2 px-2 text-right mono-num">{fmtMoney(r.value)}</td>
                  <td className="py-2 px-2 text-right mono-num">{w.toFixed(2)}%</td>
                  <td className={`py-2 px-2 text-right mono-num ${gain >= 0 ? "text-positive" : "text-negative"}`}>
                    {gain >= 0 ? "+" : ""}{fmtMoney(gain)}
                  </td>
                  <td className={`py-2 px-2 text-right mono-num ${ret >= 0 ? "text-positive" : "text-negative"}`}>
                    {ret >= 0 ? "+" : ""}{ret.toFixed(2)}%
                  </td>
                  <td className={`py-2 px-2 text-right mono-num ${lt >= 0 ? "text-positive" : "text-negative"}`}>
                    {lt >= 0 ? "+" : ""}{fmtMoney(lt)}
                  </td>
                  <td className={`py-2 px-2 text-right mono-num ${st >= 0 ? "text-positive" : "text-negative"}`}>
                    {st >= 0 ? "+" : ""}{fmtMoney(st)}
                  </td>
                </tr>
                {isOpen && (
                  <tr key={r.name + "-drill"} className="bg-muted/20">
                    <td colSpan={9} className="p-3">
                      <HoldingsDrilldown details={details} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HoldingsDrilldown({ details }: { details: HoldingDetail[] }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="px-3 py-2 border-b border-border text-xs font-medium text-muted-foreground">
        Underlying Holdings — {details.length} securities
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead className="text-[11px] text-muted-foreground border-b">
            <tr>
              <th className="text-left py-2 px-2">Security</th>
              <th className="text-left py-2 px-2">ISIN</th>
              <th className="text-right py-2 px-2">Qty</th>
              <th className="text-right py-2 px-2">Avg Cost</th>
              <th className="text-right py-2 px-2">Current Price</th>
              <th className="text-right py-2 px-2">Invested</th>
              <th className="text-right py-2 px-2">Current Value</th>
              <th className="text-right py-2 px-2">Unrealised G/L</th>
              <th className="text-right py-2 px-2">Return %</th>
              <th className="text-left py-2 px-2">Purchase Date</th>
              <th className="text-center py-2 px-2">Holding</th>
              <th className="text-right py-2 px-2">LTCG</th>
              <th className="text-right py-2 px-2">STCG</th>
            </tr>
          </thead>
          <tbody>
            {details.map(d => (
              <tr key={d.h.isin || d.h.name} className="border-b border-border/40">
                <td className="py-2 px-2 font-medium">{d.h.name}</td>
                <td className="py-2 px-2 mono-num text-muted-foreground">{d.h.isin || "—"}</td>
                <td className="py-2 px-2 text-right mono-num">{d.h.quantity.toLocaleString()}</td>
                <td className="py-2 px-2 text-right mono-num">{d.purchasePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right mono-num">{d.h.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td className="py-2 px-2 text-right mono-num">{fmtMoney(d.invested)}</td>
                <td className="py-2 px-2 text-right mono-num">{fmtMoney(d.currentValue)}</td>
                <td className={`py-2 px-2 text-right mono-num ${d.gain >= 0 ? "text-positive" : "text-negative"}`}>
                  {d.gain >= 0 ? "+" : ""}{fmtMoney(d.gain)}
                </td>
                <td className={`py-2 px-2 text-right mono-num ${d.returnPct >= 0 ? "text-positive" : "text-negative"}`}>
                  {d.returnPct >= 0 ? "+" : ""}{d.returnPct.toFixed(2)}%
                </td>
                <td className="py-2 px-2 mono-num">
                  {d.purchaseDate.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="py-2 px-2 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    d.gainType === "LT" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}>
                    {d.holdingMonths}m · {d.gainType}
                  </span>
                </td>
                <td className={`py-2 px-2 text-right mono-num ${d.ltGain >= 0 ? "text-positive" : "text-negative"}`}>
                  {d.ltGain !== 0 ? (d.ltGain >= 0 ? "+" : "") + fmtMoney(d.ltGain) : "—"}
                </td>
                <td className={`py-2 px-2 text-right mono-num ${d.stGain >= 0 ? "text-positive" : "text-negative"}`}>
                  {d.stGain !== 0 ? (d.stGain >= 0 ? "+" : "") + fmtMoney(d.stGain) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground">
        LT/ST basis: equity &amp; equity-oriented &gt; 12 months = long-term; other assets &gt; 24 months = long-term. Purchase price and dates are illustrative.
      </div>
    </div>
  );
}

