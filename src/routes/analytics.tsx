import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, Users, Briefcase, Wallet, Target,
  Award, AlertCircle, Activity, IndianRupee, UserCheck, ArrowUpRight, ArrowDownRight,
  Search, AlertTriangle, ChevronRight, ChevronDown, PieChart as PieIcon, Layers,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · mPower Wealth" },
      { name: "description", content: "Business analytics for CXOs plus portfolio analytics: underperformance, concentration, and security-level drilldown across client holdings including MF underlyings." },
    ],
  }),
  component: AnalyticsPage,
});

// ---- helpers ----
function fmtCr(n: number) { return `₹${n.toFixed(n >= 100 ? 0 : 1)} Cr`; }
function fmtL(n: number) { return `₹${n.toFixed(1)} L`; }
function pct(n: number, d = 1) { return `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`; }
function clsPct(n: number) { return n >= 0 ? "text-positive" : "text-negative"; }

// ---- synthetic data (CXO dashboard for an Indian WM firm) ----
const MONTHS = ["Apr'24","May'24","Jun'24","Jul'24","Aug'24","Sep'24","Oct'24","Nov'24","Dec'24","Jan'25","Feb'25","Mar'25","Apr'25","May'25","Jun'25"];

// AUM trend in Cr
const aumTrend = MONTHS.map((m, i) => {
  const base = 8420 + i * 185 + Math.sin(i / 2) * 90;
  return {
    month: m,
    AUM: Math.round(base),
    Net_Flows: Math.round(120 + Math.cos(i / 1.6) * 60 + i * 5),
    Market_Return: Math.round(60 + Math.sin(i / 1.3) * 40),
  };
});

const productAUM = [
  { product: "Mutual Funds", aum: 4820, revenue: 38.6, yoy: 18.2, margin: 0.80 },
  { product: "PMS",          aum: 2640, revenue: 52.8, yoy: 24.6, margin: 2.00 },
  { product: "AIF Cat-II",   aum: 1850, revenue: 37.0, yoy: 31.4, margin: 2.00 },
  { product: "AIF Cat-III",  aum:  720, revenue: 18.0, yoy: 28.1, margin: 2.50 },
  { product: "Direct Equity",aum:  640, revenue:  5.8, yoy:  9.4, margin: 0.90 },
  { product: "Bonds / FD",   aum:  920, revenue:  6.4, yoy:  6.8, margin: 0.70 },
  { product: "Insurance",    aum:  410, revenue:  8.2, yoy: 12.3, margin: 2.00 },
  { product: "Unlisted / PE",aum:  280, revenue:  7.0, yoy: 41.2, margin: 2.50 },
];

const totalAUM = productAUM.reduce((s, p) => s + p.aum, 0);
const totalRevenue = productAUM.reduce((s, p) => s + p.revenue, 0);

const revenueByProductTrend = MONTHS.slice(-12).map((m, i) => ({
  month: m,
  MF:  Math.round(2.6 + i * 0.08 + Math.sin(i) * 0.2),
  PMS: Math.round(3.4 + i * 0.14 + Math.cos(i) * 0.3),
  AIF: Math.round(3.2 + i * 0.18 + Math.sin(i / 1.4) * 0.25),
  Others: Math.round(1.6 + i * 0.05),
}));

const clientSegments = [
  { segment: "UHNI (>₹25 Cr)", clients: 84,  aum: 5680, share: 0,   arpu: 0 },
  { segment: "HNI (₹5–25 Cr)", clients: 312, aum: 4120, share: 0,   arpu: 0 },
  { segment: "Affluent (₹1–5 Cr)", clients: 1240, aum: 1820, share: 0, arpu: 0 },
  { segment: "Mass Affluent (<₹1 Cr)", clients: 3860, aum: 660, share: 0, arpu: 0 },
].map(c => ({ ...c, share: +(c.aum / totalAUM * 100).toFixed(1), arpu: +(c.aum * 100 / c.clients).toFixed(1) }));

const advisorPerformance = [
  { rm: "Anika Mehra",       region: "West",  aum: 1240, clients: 86,  netNew: 142, revenue: 18.4, retention: 98.2, nps: 72 },
  { rm: "Karthik Iyer",      region: "South", aum: 1080, clients: 74,  netNew: 124, revenue: 16.8, retention: 97.6, nps: 68 },
  { rm: "Rohan Bhattacharya",region: "East",  aum:  920, clients: 92,  netNew:  88, revenue: 13.2, retention: 96.1, nps: 64 },
  { rm: "Priya Nair",        region: "South", aum:  860, clients: 68,  netNew: 110, revenue: 14.6, retention: 98.8, nps: 76 },
  { rm: "Vikram Sethi",      region: "North", aum:  780, clients: 54,  netNew:  72, revenue: 11.8, retention: 95.4, nps: 61 },
  { rm: "Sneha Kapoor",      region: "North", aum:  640, clients: 48,  netNew:  64, revenue:  9.4, retention: 96.8, nps: 70 },
  { rm: "Aditya Rao",        region: "West",  aum:  580, clients: 62,  netNew:  56, revenue:  8.2, retention: 94.2, nps: 58 },
  { rm: "Meera Joshi",       region: "Central",aum: 420, clients: 38,  netNew:  48, revenue:  6.4, retention: 97.1, nps: 66 },
];

const regionMix = [
  { region: "West",    aum: 3320 },
  { region: "South",   aum: 2890 },
  { region: "North",   aum: 2160 },
  { region: "East",    aum: 1180 },
  { region: "Central", aum:  730 },
];

const channelMix = [
  { channel: "Direct RM",       aum: 6420, share: 0 },
  { channel: "Digital Platform",aum: 1640, share: 0 },
  { channel: "IFA Partners",    aum: 1280, share: 0 },
  { channel: "Family Office",   aum:  940, share: 0 },
].map(c => ({ ...c, share: +(c.aum / totalAUM * 100).toFixed(1) }));

const ageMix = [
  { bucket: "<35 yrs",  aum: 720 },
  { bucket: "35-50 yrs",aum: 4280 },
  { bucket: "50-65 yrs",aum: 3920 },
  { bucket: ">65 yrs",  aum: 1360 },
];

const cohortRetention = [
  { cohort: "FY21", y1: 100, y2: 96, y3: 92, y4: 89 },
  { cohort: "FY22", y1: 100, y2: 97, y3: 94, y4: 0 },
  { cohort: "FY23", y1: 100, y2: 98, y3: 0,  y4: 0 },
  { cohort: "FY24", y1: 100, y2: 0,  y3: 0,  y4: 0 },
];

const balancedScorecard = [
  { kpi: "Growth",      score: 88 },
  { kpi: "Profitability",score: 76 },
  { kpi: "Client NPS",  score: 71 },
  { kpi: "Retention",   score: 92 },
  { kpi: "Cross-sell",  score: 64 },
  { kpi: "Compliance",  score: 95 },
];

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16"];

function AnalyticsPage() {
  const [period, setPeriod] = useState<"YTD" | "TTM" | "FY25" | "QTD">("TTM");
  const [tab, setTab] = useState<"business" | "portfolio">("business");


  // KPI top cards
  const latestAUM = aumTrend[aumTrend.length - 1].AUM;
  const aumYoY = ((latestAUM / aumTrend[Math.max(0, aumTrend.length - 13)].AUM) - 1) * 100;
  const ttmRevenue = totalRevenue;
  const revYoY = 22.4;
  const totalClients = clientSegments.reduce((s, c) => s + c.clients, 0);
  const clientYoY = 14.6;
  const netNewMoneyTTM = 1820;
  const nnmYoY = 18.2;

  const topRM = useMemo(() => [...advisorPerformance].sort((a, b) => b.revenue - a.revenue)[0], []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 bg-card border-b border-border">
        <div className="px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-md hover:bg-muted">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Analytics
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {tab === "business"
                  ? "CXO cockpit · Advisor performance, AUM growth, revenue, client analytics"
                  : "Portfolio cockpit · Underperformance, concentration & security-level drilldown"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setTab("business")}
                className={`px-3 py-1 text-[11px] ${tab === "business" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              >Business</button>
              <button
                onClick={() => setTab("portfolio")}
                className={`px-3 py-1 text-[11px] border-l border-border ${tab === "portfolio" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              >Portfolio</button>
            </div>
            {tab === "business" && (["QTD","YTD","TTM","FY25"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-[11px] rounded-md border ${period === p ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
              >{p}</button>
            ))}
          </div>
        </div>
      </header>

      {tab === "portfolio" ? <PortfolioAnalytics /> : (
      <main className="px-4 sm:px-6 py-5 space-y-5 max-w-[1600px] mx-auto">
        {/* KPI strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard icon={<Wallet className="h-4 w-4" />} label="Firm AUM" value={fmtCr(latestAUM)} delta={aumYoY} sub="YoY" />
          <KpiCard icon={<IndianRupee className="h-4 w-4" />} label="Revenue (TTM)" value={`₹${ttmRevenue.toFixed(1)} Cr`} delta={revYoY} sub="YoY" />
          <KpiCard icon={<Users className="h-4 w-4" />} label="Active Clients" value={totalClients.toLocaleString("en-IN")} delta={clientYoY} sub="YoY" />
          <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Net New Money (TTM)" value={fmtCr(netNewMoneyTTM)} delta={nnmYoY} sub="YoY" />
        </section>

        {/* AUM trend + decomposition */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel title="AUM Trend (15-month)" subtitle="Closing AUM in ₹ Cr" className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={aumTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="aumG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Area type="monotone" dataKey="AUM" stroke="#6366f1" strokeWidth={2} fill="url(#aumG)" />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="AUM Growth Decomposition" subtitle="Net flows vs market return (₹ Cr / month)">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={aumTrend.slice(-12)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Net_Flows" stackId="a" fill="#10b981" />
                <Bar dataKey="Market_Return" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </section>

        {/* Product-wise */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel title="AUM by Product" subtitle={`Total ₹${totalAUM.toLocaleString("en-IN")} Cr`}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={productAUM} dataKey="aum" nameKey="product" innerRadius={50} outerRadius={95} paddingAngle={2}>
                  {productAUM.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmtCr(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Revenue Growth by Product" subtitle="₹ Cr per month (last 12)" className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={revenueByProductTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="MF"  stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="PMS" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="AIF" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="Others" stroke="#94a3b8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </section>

        {/* Product table */}
        <Panel title="Product P&L Scorecard" subtitle="AUM, revenue, take-rate & YoY growth across product lines">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Product</th>
                  <th className="text-right p-2">AUM (₹ Cr)</th>
                  <th className="text-right p-2">AUM Share</th>
                  <th className="text-right p-2">Revenue (₹ Cr)</th>
                  <th className="text-right p-2">Take-rate</th>
                  <th className="text-right p-2">YoY Growth</th>
                  <th className="text-left p-2">Bar</th>
                </tr>
              </thead>
              <tbody>
                {productAUM.map((p, i) => (
                  <tr key={p.product} className="border-t border-border">
                    <td className="p-2 font-medium flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {p.product}
                    </td>
                    <td className="text-right p-2 tabular-nums">{p.aum.toLocaleString("en-IN")}</td>
                    <td className="text-right p-2 tabular-nums">{((p.aum / totalAUM) * 100).toFixed(1)}%</td>
                    <td className="text-right p-2 tabular-nums">{p.revenue.toFixed(1)}</td>
                    <td className="text-right p-2 tabular-nums">{p.margin.toFixed(2)}%</td>
                    <td className={`text-right p-2 tabular-nums font-medium ${clsPct(p.yoy)}`}>{pct(p.yoy)}</td>
                    <td className="p-2 w-40">
                      <div className="h-2 bg-muted rounded">
                        <div className="h-2 rounded" style={{ width: `${(p.aum / Math.max(...productAUM.map(x => x.aum))) * 100}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* AUM attribution */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel title="AUM by Client Segment" subtitle="UHNI / HNI / Affluent / Mass">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={clientSegments} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="segment" tick={{ fontSize: 9 }} width={140} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmtCr(v)} />
                <Bar dataKey="aum" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
            <div className="text-[10px] text-muted-foreground mt-2">
              UHNI = 1.7% of clients, contributing <strong className="text-foreground">{clientSegments[0].share}%</strong> of AUM.
            </div>
          </Panel>

          <Panel title="AUM by Region">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={regionMix} dataKey="aum" nameKey="region" outerRadius={85}>
                  {regionMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmtCr(v)} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="AUM by Sourcing Channel">
            <div className="space-y-2 mt-1">
              {channelMix.map((c, i) => (
                <div key={c.channel}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>{c.channel}</span>
                    <span className="tabular-nums text-muted-foreground">{fmtCr(c.aum)} · {c.share}%</span>
                  </div>
                  <div className="h-2 rounded bg-muted">
                    <div className="h-2 rounded" style={{ width: `${c.share}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-[10px] uppercase text-muted-foreground mb-2 tracking-wider">By Client Age</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={ageMix}>
                  <XAxis dataKey="bucket" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: number) => fmtCr(v)} />
                  <Bar dataKey="aum" fill="#10b981" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>

        {/* Advisor / RM Performance */}
        <Panel title="Advisor Performance League Table" subtitle={`Top RM: ${topRM.rm} · ${topRM.region} · ${fmtCr(topRM.aum)} AUM · ₹${topRM.revenue.toFixed(1)} Cr revenue (TTM)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left p-2">#</th>
                  <th className="text-left p-2">Relationship Manager</th>
                  <th className="text-left p-2">Region</th>
                  <th className="text-right p-2">AUM (₹ Cr)</th>
                  <th className="text-right p-2">Clients</th>
                  <th className="text-right p-2">NNM (₹ Cr)</th>
                  <th className="text-right p-2">Revenue (₹ Cr)</th>
                  <th className="text-right p-2">Retention</th>
                  <th className="text-right p-2">NPS</th>
                  <th className="text-left p-2">Productivity</th>
                </tr>
              </thead>
              <tbody>
                {advisorPerformance.map((r, i) => {
                  const aumPerClient = r.aum / r.clients;
                  return (
                    <tr key={r.rm} className="border-t border-border">
                      <td className="p-2 text-muted-foreground">{i + 1}</td>
                      <td className="p-2 font-medium flex items-center gap-2">
                        {i === 0 && <Award className="h-3.5 w-3.5 text-amber-500" />}
                        {r.rm}
                      </td>
                      <td className="p-2">{r.region}</td>
                      <td className="text-right p-2 tabular-nums">{r.aum.toLocaleString("en-IN")}</td>
                      <td className="text-right p-2 tabular-nums">{r.clients}</td>
                      <td className="text-right p-2 tabular-nums text-positive">+{r.netNew}</td>
                      <td className="text-right p-2 tabular-nums font-medium">{r.revenue.toFixed(1)}</td>
                      <td className="text-right p-2 tabular-nums">{r.retention.toFixed(1)}%</td>
                      <td className={`text-right p-2 tabular-nums font-medium ${r.nps >= 70 ? "text-positive" : r.nps >= 60 ? "text-amber-500" : "text-negative"}`}>{r.nps}</td>
                      <td className="p-2 w-32">
                        <div className="text-[10px] text-muted-foreground mb-0.5">{fmtCr(aumPerClient)}/client</div>
                        <div className="h-1.5 bg-muted rounded">
                          <div className="h-1.5 rounded bg-primary" style={{ width: `${Math.min(100, (aumPerClient / 20) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Scorecard + Cohort */}
        <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel title="Balanced Business Scorecard" subtitle="Composite KPI health (0-100)">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={balancedScorecard}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="kpi" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Client Cohort Retention" subtitle="% of opening clients still active by year" className="xl:col-span-2">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={[
                { yr: "Y1", FY21: 100, FY22: 100, FY23: 100, FY24: 100 },
                { yr: "Y2", FY21: 96,  FY22: 97,  FY23: 98 },
                { yr: "Y3", FY21: 92,  FY22: 94 },
                { yr: "Y4", FY21: 89 },
              ]} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="yr" tick={{ fontSize: 10 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="FY21" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="FY22" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="FY23" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="FY24" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </section>

        {/* Bottom KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat icon={<UserCheck />} label="Client Retention" value="97.1%" delta={0.6} />
          <MiniStat icon={<Target />}    label="Cross-sell Ratio" value="2.8 prod/client" delta={0.3} suffix="" />
          <MiniStat icon={<Activity />}  label="AUM / RM"        value={fmtCr(latestAUM / advisorPerformance.length)} delta={11.4} />
          <MiniStat icon={<AlertCircle />} label="Compliance Breaches (TTM)" value="3" delta={-40} reverse />
        </section>

        <p className="text-[10px] text-muted-foreground text-center pt-2">
          Illustrative analytics for demo purposes. Data reflects an Indian wealth-management firm with diversified MF / PMS / AIF / direct securities exposure.
        </p>
      </main>
      )}
    </div>
  );
}

// ---- UI atoms ----
function Panel({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon, label, value, delta, sub }: { icon: React.ReactNode; label: string; value: string; delta: number; sub: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>{label}
        </div>
        <span className={`text-[11px] font-medium flex items-center gap-0.5 ${clsPct(delta)}`}>
          {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {pct(delta)} <span className="text-muted-foreground font-normal">{sub}</span>
        </span>
      </div>
      <div className="text-2xl font-semibold mt-2 tabular-nums">{value}</div>
    </div>
  );
}

function MiniStat({ icon, label, value, delta, suffix = "%", reverse = false }: { icon: React.ReactNode; label: string; value: string; delta: number; suffix?: string; reverse?: boolean }) {
  const good = reverse ? delta < 0 : delta >= 0;
  return (
    <div className="bg-card border border-border rounded-lg p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center">
        <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold tabular-nums">{value}</div>
        <div className={`text-[10px] tabular-nums ${good ? "text-positive" : "text-negative"}`}>
          {delta >= 0 ? "+" : ""}{delta}{suffix} YoY
        </div>
      </div>
    </div>
  );
}

// ==================== Portfolio Analytics ====================

type Holding = {
  security: string;
  issuer: string;
  amc?: string;
  product: "MF" | "PMS" | "AIF" | "Equity" | "Bond";
  sector: string;
  value: number; // ₹ Cr
  // for MF: underlying issuer breakdown of the holding (% of holding value)
  underlyings?: { issuer: string; sector: string; weight: number }[];
};

type ClientPortfolio = {
  id: string;
  client: string;
  segment: string;
  rm: string;
  benchmark: string;
  ytdReturn: number;   // %
  benchmarkReturn: number; // %
  aum: number; // ₹ Cr
  holdings: Holding[];
};

const MF_UNDERLYINGS: Record<string, { issuer: string; sector: string; weight: number }[]> = {
  "HDFC Flexi Cap Fund": [
    { issuer: "HDFC Bank",      sector: "Financials", weight: 9.2 },
    { issuer: "ICICI Bank",     sector: "Financials", weight: 7.8 },
    { issuer: "Reliance Inds.", sector: "Energy",     weight: 6.4 },
    { issuer: "Infosys",        sector: "IT",         weight: 5.1 },
    { issuer: "L&T",            sector: "Industrials",weight: 4.2 },
    { issuer: "Others",         sector: "Mixed",      weight: 67.3 },
  ],
  "Mirae Asset Large Cap": [
    { issuer: "HDFC Bank",      sector: "Financials", weight: 8.9 },
    { issuer: "Reliance Inds.", sector: "Energy",     weight: 8.1 },
    { issuer: "ICICI Bank",     sector: "Financials", weight: 7.2 },
    { issuer: "TCS",            sector: "IT",         weight: 5.8 },
    { issuer: "Bharti Airtel",  sector: "Telecom",    weight: 3.6 },
    { issuer: "Others",         sector: "Mixed",      weight: 66.4 },
  ],
  "Axis Bluechip Fund": [
    { issuer: "ICICI Bank",     sector: "Financials", weight: 9.0 },
    { issuer: "HDFC Bank",      sector: "Financials", weight: 8.4 },
    { issuer: "Infosys",        sector: "IT",         weight: 6.7 },
    { issuer: "Bajaj Finance",  sector: "Financials", weight: 4.8 },
    { issuer: "Others",         sector: "Mixed",      weight: 71.1 },
  ],
  "SBI Small Cap Fund": [
    { issuer: "Blue Star",      sector: "Consumer",   weight: 3.4 },
    { issuer: "CDSL",           sector: "Financials", weight: 3.1 },
    { issuer: "Carborundum",    sector: "Industrials",weight: 2.8 },
    { issuer: "Others",         sector: "Mixed",      weight: 90.7 },
  ],
  "ICICI Pru Corporate Bond": [
    { issuer: "REC Ltd",        sector: "Financials", weight: 9.2 },
    { issuer: "PFC Ltd",        sector: "Financials", weight: 8.1 },
    { issuer: "HDFC Bank",      sector: "Financials", weight: 6.4 },
    { issuer: "GoI Bonds",      sector: "Sovereign",  weight: 18.6 },
    { issuer: "Others",         sector: "Mixed",      weight: 57.7 },
  ],
};

function mfHolding(name: string, amc: string, value: number): Holding {
  return {
    security: name, issuer: name, amc, product: "MF",
    sector: "Diversified", value, underlyings: MF_UNDERLYINGS[name] ?? [],
  };
}

const clientPortfolios: ClientPortfolio[] = [
  {
    id: "C001", client: "Rajiv Malhotra", segment: "UHNI", rm: "Anika Mehra",
    benchmark: "Nifty 50 TRI", ytdReturn: 9.4, benchmarkReturn: 12.6, aum: 42.6,
    holdings: [
      mfHolding("HDFC Flexi Cap Fund", "HDFC AMC", 6.8),
      mfHolding("Mirae Asset Large Cap", "Mirae AMC", 4.2),
      mfHolding("ICICI Pru Corporate Bond", "ICICI Pru AMC", 5.1),
      { security: "HDFC Bank",      issuer: "HDFC Bank",      product: "Equity", sector: "Financials", value: 8.4 },
      { security: "Reliance Inds.", issuer: "Reliance Inds.", product: "Equity", sector: "Energy",     value: 6.2 },
      { security: "Kotak PMS - India Focus", issuer: "Kotak AMC", amc: "Kotak AMC", product: "PMS", sector: "Diversified", value: 7.4 },
      { security: "Edelweiss AIF Cat-II", issuer: "Edelweiss", amc: "Edelweiss", product: "AIF", sector: "Credit", value: 4.5 },
    ],
  },
  {
    id: "C002", client: "Suman Iyer Family Trust", segment: "UHNI", rm: "Karthik Iyer",
    benchmark: "Crisil Hybrid 65+35", ytdReturn: 11.2, benchmarkReturn: 10.4, aum: 38.2,
    holdings: [
      mfHolding("Axis Bluechip Fund", "Axis AMC", 7.8),
      mfHolding("SBI Small Cap Fund", "SBI AMC", 3.4),
      { security: "ICICI Bank",     issuer: "ICICI Bank",    product: "Equity", sector: "Financials", value: 6.2 },
      { security: "Infosys",        issuer: "Infosys",       product: "Equity", sector: "IT",         value: 5.4 },
      { security: "Motilal PMS - Value Strategy", issuer: "Motilal Oswal AMC", amc: "Motilal Oswal AMC", product: "PMS", sector: "Diversified", value: 9.8 },
      { security: "GoI 7.18% 2033", issuer: "GoI Bonds",     product: "Bond",   sector: "Sovereign",  value: 5.6 },
    ],
  },
  {
    id: "C003", client: "Priya Kapoor", segment: "HNI", rm: "Priya Nair",
    benchmark: "Nifty 50 TRI", ytdReturn: 6.8, benchmarkReturn: 12.6, aum: 14.8,
    holdings: [
      mfHolding("HDFC Flexi Cap Fund", "HDFC AMC", 4.6),
      mfHolding("Axis Bluechip Fund", "Axis AMC", 3.2),
      { security: "HDFC Bank", issuer: "HDFC Bank", product: "Equity", sector: "Financials", value: 3.4 },
      { security: "TCS",       issuer: "TCS",       product: "Equity", sector: "IT",         value: 2.1 },
      { security: "Bajaj Finance", issuer: "Bajaj Finance", product: "Equity", sector: "Financials", value: 1.5 },
    ],
  },
  {
    id: "C004", client: "Arun Khanna HUF", segment: "HNI", rm: "Vikram Sethi",
    benchmark: "Nifty 500 TRI", ytdReturn: 14.6, benchmarkReturn: 13.1, aum: 22.4,
    holdings: [
      mfHolding("Mirae Asset Large Cap", "Mirae AMC", 5.2),
      mfHolding("SBI Small Cap Fund", "SBI AMC", 4.4),
      { security: "Reliance Inds.", issuer: "Reliance Inds.", product: "Equity", sector: "Energy", value: 4.2 },
      { security: "Edelweiss AIF Cat-III", issuer: "Edelweiss", amc: "Edelweiss", product: "AIF", sector: "Long-Short", value: 8.6 },
    ],
  },
  {
    id: "C005", client: "Sunita Reddy", segment: "Affluent", rm: "Sneha Kapoor",
    benchmark: "Crisil Hybrid 65+35", ytdReturn: 4.2, benchmarkReturn: 10.4, aum: 4.8,
    holdings: [
      mfHolding("HDFC Flexi Cap Fund", "HDFC AMC", 2.2),
      mfHolding("ICICI Pru Corporate Bond", "ICICI Pru AMC", 1.6),
      { security: "HDFC Bank", issuer: "HDFC Bank", product: "Equity", sector: "Financials", value: 1.0 },
    ],
  },
  {
    id: "C006", client: "Vivek Shah Family Office", segment: "UHNI", rm: "Anika Mehra",
    benchmark: "Nifty 50 TRI", ytdReturn: 8.1, benchmarkReturn: 12.6, aum: 56.2,
    holdings: [
      mfHolding("HDFC Flexi Cap Fund", "HDFC AMC", 9.8),
      mfHolding("Axis Bluechip Fund", "Axis AMC", 8.4),
      mfHolding("ICICI Pru Corporate Bond", "ICICI Pru AMC", 7.2),
      { security: "HDFC Bank",  issuer: "HDFC Bank",  product: "Equity", sector: "Financials", value: 10.4 },
      { security: "ICICI Bank", issuer: "ICICI Bank", product: "Equity", sector: "Financials", value: 6.2 },
      { security: "Kotak PMS - India Focus", issuer: "Kotak AMC", amc: "Kotak AMC", product: "PMS", sector: "Diversified", value: 14.2 },
    ],
  },
];

// ---- portfolio-level concentration helpers ----
function concentrationFor(p: ClientPortfolio) {
  const byIssuer = new Map<string, number>();
  const byAmc = new Map<string, number>();
  const byProduct = new Map<string, number>();
  for (const h of p.holdings) {
    byIssuer.set(h.issuer, (byIssuer.get(h.issuer) ?? 0) + h.value);
    if (h.amc) byAmc.set(h.amc, (byAmc.get(h.amc) ?? 0) + h.value);
    byProduct.set(h.product, (byProduct.get(h.product) ?? 0) + h.value);
  }
  const top = (m: Map<string, number>) => {
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
    const [name, val] = arr[0] ?? ["—", 0];
    return { name, val, pct: p.aum ? (val / p.aum) * 100 : 0 };
  };
  return { issuer: top(byIssuer), amc: top(byAmc), product: top(byProduct) };
}

function PortfolioAnalytics() {
  const [view, setView] = useState<"underperform" | "concentration" | "lookup">("underperform");

  const underperformers = useMemo(
    () => clientPortfolios
      .map(p => ({ ...p, alpha: p.ytdReturn - p.benchmarkReturn }))
      .filter(p => p.alpha < 0)
      .sort((a, b) => a.alpha - b.alpha),
    []
  );

  const concentrationRows = useMemo(
    () => clientPortfolios.map(p => ({ p, c: concentrationFor(p) }))
      .sort((a, b) => Math.max(b.c.issuer.pct, b.c.amc.pct, b.c.product.pct) - Math.max(a.c.issuer.pct, a.c.amc.pct, a.c.product.pct)),
    []
  );

  // Single-client security/issuer lookup
  const [clientId, setClientId] = useState(clientPortfolios[0].id);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const selectedClient = clientPortfolios.find(c => c.id === clientId)!;

  const lookupResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    type Match = {
      key: string; holding: Holding; matchType: "direct" | "underlying";
      underlying?: { issuer: string; sector: string; weight: number };
      effectiveValue: number;
    };
    const out: Match[] = [];
    for (const h of selectedClient.holdings) {
      const direct = h.security.toLowerCase().includes(q) || h.issuer.toLowerCase().includes(q) || (h.amc ?? "").toLowerCase().includes(q);
      if (direct) out.push({ key: h.security + ":direct", holding: h, matchType: "direct", effectiveValue: h.value });
      if (h.product === "MF" && h.underlyings) {
        for (const u of h.underlyings) {
          if (u.issuer.toLowerCase().includes(q) || u.sector.toLowerCase().includes(q)) {
            out.push({
              key: h.security + ":" + u.issuer,
              holding: h, matchType: "underlying", underlying: u,
              effectiveValue: +(h.value * u.weight / 100).toFixed(3),
            });
          }
        }
      }
    }
    return out;
  }, [selectedClient, query]);

  const totalExposure = lookupResults.reduce((s, m) => s + m.effectiveValue, 0);

  const toggle = (k: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(k) ? next.delete(k) : next.add(k);
      return next;
    });
  };

  return (
    <main className="px-4 sm:px-6 py-5 space-y-5 max-w-[1600px] mx-auto">
      {/* sub-tabs */}
      <div className="flex flex-wrap gap-2">
        {([
          { k: "underperform",  label: "Underperformance vs Benchmark", icon: <TrendingDown className="h-3.5 w-3.5" /> },
          { k: "concentration", label: "Concentration Risk",            icon: <AlertTriangle className="h-3.5 w-3.5" /> },
          { k: "lookup",        label: "Security / Issuer Lookup",      icon: <Search className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md border ${view === t.k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
          >{t.icon}{t.label}</button>
        ))}
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Briefcase className="h-4 w-4" />} label="Portfolios" value={clientPortfolios.length.toString()} delta={6.2} sub="QoQ" />
        <KpiCard icon={<TrendingDown className="h-4 w-4" />} label="Underperforming" value={underperformers.length.toString()} delta={-12.5} sub="vs prev" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="High Concentration (>25%)" value={concentrationRows.filter(r => Math.max(r.c.issuer.pct, r.c.amc.pct, r.c.product.pct) > 25).length.toString()} delta={-8.3} sub="vs prev" />
        <KpiCard icon={<Layers className="h-4 w-4" />} label="Combined Portfolio AUM" value={fmtCr(clientPortfolios.reduce((s, p) => s + p.aum, 0))} delta={9.1} sub="YoY" />
      </section>

      {view === "underperform" && (
        <Panel title="Portfolios Underperforming Their Benchmark" subtitle="YTD return vs assigned benchmark (negative alpha)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Client</th>
                  <th className="text-left p-2">Segment</th>
                  <th className="text-left p-2">RM</th>
                  <th className="text-right p-2">AUM</th>
                  <th className="text-left p-2">Benchmark</th>
                  <th className="text-right p-2">Portfolio YTD</th>
                  <th className="text-right p-2">Benchmark YTD</th>
                  <th className="text-right p-2">Alpha</th>
                  <th className="text-left p-2">Gap</th>
                </tr>
              </thead>
              <tbody>
                {underperformers.map(p => {
                  const gap = Math.abs(p.alpha);
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-2 font-medium">{p.client}</td>
                      <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{p.segment}</span></td>
                      <td className="p-2">{p.rm}</td>
                      <td className="text-right p-2 tabular-nums">{fmtCr(p.aum)}</td>
                      <td className="p-2 text-muted-foreground">{p.benchmark}</td>
                      <td className="text-right p-2 tabular-nums">{p.ytdReturn.toFixed(1)}%</td>
                      <td className="text-right p-2 tabular-nums text-muted-foreground">{p.benchmarkReturn.toFixed(1)}%</td>
                      <td className={`text-right p-2 tabular-nums font-medium ${clsPct(p.alpha)}`}>{pct(p.alpha)}</td>
                      <td className="p-2 w-32">
                        <div className="h-1.5 bg-muted rounded">
                          <div className="h-1.5 rounded bg-negative" style={{ width: `${Math.min(100, (gap / 8) * 100)}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {underperformers.length === 0 && (
                  <tr><td colSpan={9} className="p-4 text-center text-muted-foreground">No portfolios are underperforming their benchmarks.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {view === "concentration" && (
        <Panel title="Concentration Risk by Portfolio" subtitle="Largest single-issuer, single-AMC and single-product exposure per portfolio (% of AUM)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left p-2">Client</th>
                  <th className="text-right p-2">AUM</th>
                  <th className="text-left p-2">Top Issuer</th>
                  <th className="text-right p-2">% AUM</th>
                  <th className="text-left p-2">Top AMC</th>
                  <th className="text-right p-2">% AUM</th>
                  <th className="text-left p-2">Top Product</th>
                  <th className="text-right p-2">% AUM</th>
                  <th className="text-left p-2">Flag</th>
                </tr>
              </thead>
              <tbody>
                {concentrationRows.map(({ p, c }) => {
                  const maxPct = Math.max(c.issuer.pct, c.amc.pct, c.product.pct);
                  const flag = maxPct > 35 ? "High" : maxPct > 25 ? "Elevated" : "OK";
                  const flagCls = flag === "High" ? "bg-negative/15 text-negative" : flag === "Elevated" ? "bg-amber-500/15 text-amber-600" : "bg-positive/15 text-positive";
                  const cellPct = (n: number) => n > 35 ? "text-negative font-medium" : n > 25 ? "text-amber-600 font-medium" : "";
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-2 font-medium">{p.client}</td>
                      <td className="text-right p-2 tabular-nums">{fmtCr(p.aum)}</td>
                      <td className="p-2">{c.issuer.name}</td>
                      <td className={`text-right p-2 tabular-nums ${cellPct(c.issuer.pct)}`}>{c.issuer.pct.toFixed(1)}%</td>
                      <td className="p-2">{c.amc.name}</td>
                      <td className={`text-right p-2 tabular-nums ${cellPct(c.amc.pct)}`}>{c.amc.pct.toFixed(1)}%</td>
                      <td className="p-2">{c.product.name}</td>
                      <td className={`text-right p-2 tabular-nums ${cellPct(c.product.pct)}`}>{c.product.pct.toFixed(1)}%</td>
                      <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-[10px] ${flagCls}`}>{flag}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">Policy thresholds (illustrative): Issuer/AMC/Product exposure &gt; 25% = Elevated, &gt; 35% = High.</p>
        </Panel>
      )}

      {view === "lookup" && (
        <Panel title="Security / Issuer Lookup Across Client Holdings" subtitle="Search any security, issuer, AMC or sector — includes MF underlying drilldown">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Client</label>
              <select
                value={clientId}
                onChange={(e) => { setClientId(e.target.value); setExpanded(new Set()); }}
                className="mt-1 w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs"
              >
                {clientPortfolios.map(c => (
                  <option key={c.id} value={c.id}>{c.client} · {c.segment} · {fmtCr(c.aum)}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Search security / issuer / AMC / sector</label>
              <div className="mt-1 flex items-center gap-2 bg-card border border-border rounded-md px-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. HDFC Bank, Reliance, Axis AMC, Financials…"
                  className="flex-1 bg-transparent py-1.5 text-xs focus:outline-none"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-[10px] text-muted-foreground hover:text-foreground">clear</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["HDFC Bank","Reliance Inds.","ICICI Bank","Infosys","Axis AMC","Financials"].map(s => (
                  <button key={s} onClick={() => setQuery(s)} className="text-[10px] px-2 py-0.5 rounded border border-border bg-card hover:bg-muted">{s}</button>
                ))}
              </div>
            </div>
          </div>

          {query && (
            <div className="mb-3 p-3 rounded-md bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs">
                <span className="font-medium">{lookupResults.length}</span> match{lookupResults.length === 1 ? "" : "es"} for
                <span className="font-medium"> "{query}"</span> in <span className="font-medium">{selectedClient.client}</span>'s portfolio
              </div>
              <div className="text-xs">
                Total effective exposure: <span className="font-semibold tabular-nums">{fmtCr(totalExposure)}</span>
                <span className="text-muted-foreground"> ({selectedClient.aum ? (totalExposure / selectedClient.aum * 100).toFixed(2) : "0"}% of AUM)</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left p-2 w-6"></th>
                  <th className="text-left p-2">Holding</th>
                  <th className="text-left p-2">Issuer / AMC</th>
                  <th className="text-left p-2">Product</th>
                  <th className="text-left p-2">Match Type</th>
                  <th className="text-right p-2">Holding Value</th>
                  <th className="text-right p-2">Effective Exposure</th>
                </tr>
              </thead>
              <tbody>
                {!query && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Enter a security, issuer, AMC or sector to search across all holdings of the selected client.</td></tr>
                )}
                {query && lookupResults.length === 0 && (
                  <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No matches in {selectedClient.client}'s portfolio.</td></tr>
                )}
                {lookupResults.map(m => {
                  const isMf = m.holding.product === "MF";
                  const key = m.key;
                  const open = expanded.has(key);
                  return (
                    <FragmentRow key={key}>
                      <tr key={key} className="border-t border-border">
                        <td className="p-2">
                          {isMf ? (
                            <button onClick={() => toggle(key)} className="text-muted-foreground hover:text-foreground">
                              {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          ) : null}
                        </td>
                        <td className="p-2 font-medium">{m.holding.security}</td>
                        <td className="p-2">{m.holding.amc ?? m.holding.issuer}</td>
                        <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{m.holding.product}</span></td>
                        <td className="p-2">
                          {m.matchType === "direct" ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">Direct</span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                              Underlying · {m.underlying?.issuer} ({m.underlying?.weight.toFixed(1)}%)
                            </span>
                          )}
                        </td>
                        <td className="text-right p-2 tabular-nums text-muted-foreground">{fmtCr(m.holding.value)}</td>
                        <td className="text-right p-2 tabular-nums font-medium">{fmtCr(m.effectiveValue)}</td>
                      </tr>
                      {isMf && open && (
                        <tr className="bg-muted/20">
                          <td></td>
                          <td colSpan={6} className="p-3">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                              <PieIcon className="h-3 w-3" /> {m.holding.security} · Underlying issuer breakdown
                            </div>
                            <table className="w-full text-[11px]">
                              <thead className="text-muted-foreground">
                                <tr>
                                  <th className="text-left py-1">Underlying Issuer</th>
                                  <th className="text-left py-1">Sector</th>
                                  <th className="text-right py-1">Weight</th>
                                  <th className="text-right py-1">Effective Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(m.holding.underlyings ?? []).map(u => (
                                  <tr key={u.issuer} className="border-t border-border/60">
                                    <td className="py-1">{u.issuer}</td>
                                    <td className="py-1 text-muted-foreground">{u.sector}</td>
                                    <td className="text-right py-1 tabular-nums">{u.weight.toFixed(1)}%</td>
                                    <td className="text-right py-1 tabular-nums">{fmtCr(+(m.holding.value * u.weight / 100).toFixed(3))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </FragmentRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Illustrative portfolio analytics. Returns, benchmarks and MF underlying weights are synthetic for demonstration.
      </p>
    </main>
  );
}
