import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
                <BarChart3 className="h-5 w-5 text-primary" /> Business Analytics
              </h1>
              <p className="text-[11px] text-muted-foreground">CXO cockpit · Advisor performance, AUM growth, revenue, client analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(["QTD","YTD","TTM","FY25"] as const).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-[11px] rounded-md border ${period === p ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
              >{p}</button>
            ))}
          </div>
        </div>
      </header>

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
