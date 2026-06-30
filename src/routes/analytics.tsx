import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useMemo, useState } from "react";
import {
  ArrowLeft, BarChart3, TrendingUp, TrendingDown, Users, Briefcase, Wallet, Target,
  Award, AlertCircle, Activity, IndianRupee, ArrowUpRight, ArrowDownRight,
  Search, AlertTriangle, ChevronRight, ChevronDown, PieChart as PieIcon, Layers,
  Filter, RefreshCw, Download, Settings2, Table as TableIcon, BarChart2,
  LineChart as LineIcon, Droplet, Shield, Percent,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  Treemap,
} from "recharts";
import { REGION_META, getCurrentRegion, useRegion as useRegionReactive } from "@/lib/region";
import {
  MONTHS, SEGMENTS, CHANNELS,
  RM_INFO, REGIONS, PRODUCTS,
  businessFacts, clientPortfolios, flatHoldings, lookthroughHoldings,
  getQuickFilters,
  type BProduct, type BRegion, type BSegment, type BChannel, type BRm,
  type BFact, type Holding, type ClientPortfolio, type FlatHolding,
} from "@/lib/analytics-data";
export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics · mPower Wealth" },
      { name: "description", content: "Configurable, pivotable analytics for wealth-management CXOs and portfolio managers — dissect business KPIs and portfolio health across any dimension." },
    ],
  }),
  component: AnalyticsPage,
});

// ============================================================
// helpers
// ============================================================
function fmtCr(n: number) {
  const m = REGION_META[getCurrentRegion()];
  const u = m.code === "IN" ? "Cr" : "M";
  return `${m.symbol}${n.toFixed(n >= 100 ? 0 : 1)} ${u}`;
}
function fmtCrShort(n: number) {
  const m = REGION_META[getCurrentRegion()];
  const u = m.code === "IN" ? "Cr" : "M";
  const big = m.code === "IN" ? "K Cr" : "B";
  return n >= 1000 ? `${m.symbol}${(n / 1000).toFixed(2)} ${big}` : `${m.symbol}${n.toFixed(0)} ${u}`;
}
function pct(n: number, d = 1) { return `${n >= 0 ? "+" : ""}${n.toFixed(d)}%`; }
function clsPct(n: number) { return n >= 0 ? "text-positive" : "text-negative"; }
function classNames(...a: (string | false | undefined)[]) { return a.filter(Boolean).join(" "); }

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#84cc16","#f97316","#14b8a6","#a855f7","#eab308"];

// Region-aware datasets (RM_INFO, businessFacts, clientPortfolios, etc.)
// live in @/lib/analytics-data and switch automatically with the active region.

// ============================================================
// Page
// ============================================================
function AnalyticsPage() {
  // Subscribe to region changes so the formatter helpers re-render with the right currency/unit,
  // and so child components remount with the new region's dataset.
  const { region } = useRegionReactive();
  const [tab, setTab] = useState<"business" | "portfolio">("business");

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
                <BarChart3 className="h-5 w-5 text-primary" /> Analytics Studio
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {tab === "business"
                  ? "Configurable business cockpit — pivot AUM / Revenue / Flows by any dimension"
                  : "Portfolio health studio — drift, concentration, liquidity, fee leakage & drilldown"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-md border border-border overflow-hidden">
              <button
                onClick={() => setTab("business")}
                className={`px-3 py-1 text-[11px] ${tab === "business" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              >Business Analytics</button>
              <button
                onClick={() => setTab("portfolio")}
                className={`px-3 py-1 text-[11px] border-l border-border ${tab === "portfolio" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
              >Portfolio Analytics</button>
            </div>
          </div>
        </div>
      </header>

      {tab === "business" ? <BusinessAnalytics key={region} /> : <PortfolioAnalytics key={region} />}
    </div>
  );
}

// ============================================================
// BUSINESS ANALYTICS — pivot builder
// ============================================================
type BDim = "month" | "product" | "region" | "segment" | "channel" | "rm";
type BMetric = "aum" | "revenue" | "netFlows" | "clients";
type Agg = "sum" | "avg" | "max" | "latest"; // latest = last-month snapshot (for AUM)

const B_DIM_LABEL: Record<BDim, string> = {
  month: "Month", product: "Product", region: "Region", segment: "Client Segment", channel: "Channel", rm: "RM",
};
const B_METRIC_LABEL: Record<BMetric, string> = {
  aum: "AUM (₹ Cr)", revenue: "Revenue (₹ Cr)", netFlows: "Net Flows (₹ Cr)", clients: "Active Clients",
};

function BusinessAnalytics() {
  // --- pivot config ---
  const [rowDim, setRowDim] = useState<BDim>("product");
  const [colDim, setColDim] = useState<BDim | "none">("region");
  const [metric, setMetric] = useState<BMetric>("aum");
  const [agg, setAgg] = useState<Agg>("latest");
  const [period, setPeriod] = useState<"QTD" | "YTD" | "TTM" | "All">("TTM");
  const [chartType, setChartType] = useState<"bar" | "line" | "stacked" | "area">("stacked");
  const [showHeatmap, setShowHeatmap] = useState(true);

  // multi-select filters
  const [filters, setFilters] = useState<{ product: BProduct[]; region: BRegion[]; segment: BSegment[]; channel: BChannel[]; rm: BRm[] }>({
    product: [], region: [], segment: [], channel: [], rm: [],
  });

  // --- filter facts by period + filters ---
  const periodMonths = useMemo(() => {
    if (period === "All") return MONTHS;
    if (period === "TTM") return MONTHS.slice(-12);
    if (period === "YTD") return MONTHS.slice(-3); // Apr/May/Jun '25
    return MONTHS.slice(-3); // QTD ~= last 3
  }, [period]);

  const filteredFacts = useMemo(() => {
    return businessFacts.filter(f =>
      periodMonths.includes(f.month) &&
      (filters.product.length === 0 || filters.product.includes(f.product)) &&
      (filters.region.length === 0 || filters.region.includes(f.region)) &&
      (filters.segment.length === 0 || filters.segment.includes(f.segment)) &&
      (filters.channel.length === 0 || filters.channel.includes(f.channel)) &&
      (filters.rm.length === 0 || filters.rm.includes(f.rm))
    );
  }, [periodMonths, filters]);

  // --- KPIs (always on the filtered slice) ---
  const kpis = useMemo(() => {
    const latestMonth = periodMonths[periodMonths.length - 1];
    const latestAum = filteredFacts.filter(f => f.month === latestMonth).reduce((s, f) => s + f.aum, 0);
    const prevYearMonth = MONTHS[Math.max(0, MONTHS.indexOf(latestMonth) - 12)];
    const prevAum = businessFacts.filter(f => f.month === prevYearMonth).reduce((s, f) => s + f.aum, 0);
    const aumYoY = prevAum ? ((latestAum / prevAum) - 1) * 100 : 0;
    const revenue = filteredFacts.reduce((s, f) => s + f.revenue, 0);
    const nnm = filteredFacts.reduce((s, f) => s + f.netFlows, 0);
    const clients = new Set(filteredFacts.filter(f => f.month === latestMonth).map(f => `${f.segment}|${f.region}`)).size;
    const clientsCount = filteredFacts.filter(f => f.month === latestMonth).reduce((s, f) => s + f.clients, 0);
    const revYoY = 22.4, nnmYoY = 18.2, clientYoY = 14.6;
    return { latestAum, aumYoY, revenue, nnm, clientsCount, revYoY, nnmYoY, clientYoY, segments: clients };
  }, [filteredFacts, periodMonths]);

  // --- pivot computation ---
  type Pivot = { rows: string[]; cols: string[]; data: Record<string, Record<string, number>>; rowTotals: Record<string, number>; colTotals: Record<string, number>; grandTotal: number; };

  const pivot: Pivot = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    const counts: Record<string, Record<string, number>> = {};
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const latestMonth = periodMonths[periodMonths.length - 1];
    const facts = agg === "latest" && metric === "aum" ? filteredFacts.filter(f => f.month === latestMonth) : filteredFacts;

    facts.forEach(f => {
      const rk = String(f[rowDim]);
      const ck = colDim === "none" ? "Total" : String(f[colDim]);
      rowSet.add(rk); colSet.add(ck);
      data[rk] = data[rk] ?? {};
      counts[rk] = counts[rk] ?? {};
      const v = f[metric];
      if (agg === "max") data[rk][ck] = Math.max(data[rk][ck] ?? -Infinity, v);
      else { data[rk][ck] = (data[rk][ck] ?? 0) + v; counts[rk][ck] = (counts[rk][ck] ?? 0) + 1; }
    });

    if (agg === "avg") {
      Object.keys(data).forEach(r => Object.keys(data[r]).forEach(c => { data[r][c] = data[r][c] / (counts[r][c] || 1); }));
    }

    // ordering
    const monthOrder = (a: string, b: string) => MONTHS.indexOf(a) - MONTHS.indexOf(b);
    const productOrder = (a: string, b: string) => PRODUCTS.indexOf(a as BProduct) - PRODUCTS.indexOf(b as BProduct);
    const segOrder     = (a: string, b: string) => SEGMENTS.indexOf(a as BSegment) - SEGMENTS.indexOf(b as BSegment);
    const orderFor = (d: BDim | "none") => d === "month" ? monthOrder : d === "product" ? productOrder : d === "segment" ? segOrder : undefined;

    const rows = [...rowSet];
    const cols = [...colSet];
    const rOrd = orderFor(rowDim); if (rOrd) rows.sort(rOrd);
    const cOrd = orderFor(colDim === "none" ? "month" : colDim); if (cOrd && colDim !== "none") cols.sort(cOrd);

    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grand = 0;
    rows.forEach(r => {
      let s = 0;
      cols.forEach(c => {
        const v = data[r]?.[c] ?? 0;
        s += v;
        colTotals[c] = (colTotals[c] ?? 0) + v;
      });
      rowTotals[r] = s;
      grand += s;
    });
    if (!rOrd) rows.sort((a, b) => (rowTotals[b] ?? 0) - (rowTotals[a] ?? 0));

    return { rows, cols, data, rowTotals, colTotals, grandTotal: grand };
  }, [filteredFacts, rowDim, colDim, metric, agg, periodMonths]);

  // --- chart data derived from pivot ---
  const chartData = useMemo(() => {
    return pivot.rows.map(r => {
      const row: Record<string, number | string> = { name: r };
      pivot.cols.forEach(c => { row[c] = +(pivot.data[r]?.[c] ?? 0).toFixed(2); });
      return row;
    });
  }, [pivot]);

  const fmtCell = (v: number) => metric === "clients" ? Math.round(v).toLocaleString("en-IN") : v.toFixed(metric === "revenue" || metric === "netFlows" ? 2 : 1);

  // heatmap intensity
  const maxCell = useMemo(() => {
    let m = 0;
    pivot.rows.forEach(r => pivot.cols.forEach(c => { m = Math.max(m, pivot.data[r]?.[c] ?? 0); }));
    return m;
  }, [pivot]);

  // CSV export
  function exportCsv() {
    const head = ["", ...pivot.cols, "Total"].join(",");
    const body = pivot.rows.map(r => [r, ...pivot.cols.map(c => pivot.data[r]?.[c] ?? 0), pivot.rowTotals[r] ?? 0].join(",")).join("\n");
    const totals = ["Total", ...pivot.cols.map(c => pivot.colTotals[c] ?? 0), pivot.grandTotal].join(",");
    const csv = [head, body, totals].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pivot_${rowDim}_${colDim}_${metric}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function resetAll() {
    setRowDim("product"); setColDim("region"); setMetric("aum"); setAgg("latest"); setPeriod("TTM");
    setFilters({ product: [], region: [], segment: [], channel: [], rm: [] });
  }

  // AUM trend (always firm-wide closing AUM by month, for the trend chart)
  const aumTrend = useMemo(() => MONTHS.map(m => {
    const a = filteredFacts.filter(f => f.month === m).reduce((s, f) => s + f.aum, 0);
    const flows = filteredFacts.filter(f => f.month === m).reduce((s, f) => s + f.netFlows, 0);
    return { month: m, AUM: +a.toFixed(1), Net_Flows: +flows.toFixed(2) };
  }), [filteredFacts]);

  return (
    <main className="px-4 sm:px-6 py-5 space-y-5 max-w-[1600px] mx-auto">
      {/* KPI strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="Firm AUM (latest)" value={fmtCrShort(kpis.latestAum)} delta={kpis.aumYoY} sub="YoY" />
        <KpiCard icon={<IndianRupee className="h-4 w-4" />} label={`Revenue (${period})`} value={fmtCr(kpis.revenue)} delta={kpis.revYoY} sub="YoY" />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label={`Net New Money (${period})`} value={fmtCr(kpis.nnm)} delta={kpis.nnmYoY} sub="YoY" />
        <KpiCard icon={<Users className="h-4 w-4" />} label="Active Clients" value={kpis.clientsCount.toLocaleString("en-IN")} delta={kpis.clientYoY} sub="YoY" />
      </section>

      {/* Pivot configurator */}
      <Panel
        title="Pivot Builder"
        subtitle="Configure rows, columns, metric and aggregation — table, chart and heatmap update together"
        right={
          <div className="flex items-center gap-1.5">
            <button onClick={exportCsv} className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted flex items-center gap-1"><Download className="h-3 w-3" />CSV</button>
            <button onClick={resetAll}  className="text-[11px] px-2 py-1 rounded-md border border-border hover:bg-muted flex items-center gap-1"><RefreshCw className="h-3 w-3" />Reset</button>
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
          <Select label="Rows" value={rowDim} onChange={v => setRowDim(v as BDim)} options={Object.entries(B_DIM_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
          <Select label="Columns" value={colDim} onChange={v => setColDim(v as BDim | "none")} options={[{ value: "none", label: "(none)" }, ...Object.entries(B_DIM_LABEL).map(([k, v]) => ({ value: k, label: v }))]} />
          <Select label="Metric" value={metric} onChange={v => setMetric(v as BMetric)} options={Object.entries(B_METRIC_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
          <Select label="Aggregation" value={agg} onChange={v => setAgg(v as Agg)} options={[{ value: "latest", label: "Latest month (snapshot)" }, { value: "sum", label: "Sum" }, { value: "avg", label: "Average" }, { value: "max", label: "Max" }]} />
          <Select label="Period" value={period} onChange={v => setPeriod(v as typeof period)} options={["QTD","YTD","TTM","All"].map(p => ({ value: p, label: p }))} />
          <Select label="Chart" value={chartType} onChange={v => setChartType(v as typeof chartType)} options={[{ value: "stacked", label: "Stacked bar" }, { value: "bar", label: "Grouped bar" }, { value: "line", label: "Line" }, { value: "area", label: "Area" }]} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4">
          <ChipFilter label="Product" all={PRODUCTS} value={filters.product} onChange={v => setFilters(f => ({ ...f, product: v as BProduct[] }))} />
          <ChipFilter label="Region"  all={REGIONS}  value={filters.region}  onChange={v => setFilters(f => ({ ...f, region: v as BRegion[] }))} />
          <ChipFilter label="Segment" all={SEGMENTS} value={filters.segment} onChange={v => setFilters(f => ({ ...f, segment: v as BSegment[] }))} />
          <ChipFilter label="Channel" all={CHANNELS} value={filters.channel} onChange={v => setFilters(f => ({ ...f, channel: v as BChannel[] }))} />
          <ChipFilter label="RM"      all={RM_INFO.map(r => r.rm)} value={filters.rm} onChange={v => setFilters(f => ({ ...f, rm: v as BRm[] }))} />
        </div>

        {/* chart */}
        <div className="border border-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-muted-foreground">
              {B_METRIC_LABEL[metric]} · {B_DIM_LABEL[rowDim]}{colDim !== "none" && ` × ${B_DIM_LABEL[colDim]}`} · {agg}
            </div>
            <div className="text-[10px] text-muted-foreground">{pivot.rows.length} rows × {pivot.cols.length} cols</div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {pivot.cols.map((c, i) => <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
              </LineChart>
            ) : chartType === "area" ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {pivot.cols.map((c, i) => <Area key={c} type="monotone" dataKey={c} stackId="1" stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.4} />)}
              </AreaChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {pivot.cols.map((c, i) => <Bar key={c} dataKey={c} stackId={chartType === "stacked" ? "a" : undefined} fill={COLORS[i % COLORS.length]} />)}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* pivot table with heatmap */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground flex items-center gap-1"><TableIcon className="h-3 w-3" /> Pivot table</div>
          <label className="text-[11px] flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showHeatmap} onChange={e => setShowHeatmap(e.target.checked)} className="h-3 w-3" />
            Heatmap
          </label>
        </div>
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2 sticky left-0 bg-muted/40">{B_DIM_LABEL[rowDim]}</th>
                {pivot.cols.map(c => <th key={c} className="text-right p-2">{c}</th>)}
                <th className="text-right p-2 border-l border-border">Total</th>
              </tr>
            </thead>
            <tbody>
              {pivot.rows.map(r => (
                <tr key={r} className="border-t border-border">
                  <td className="p-2 font-medium sticky left-0 bg-card">{r}</td>
                  {pivot.cols.map(c => {
                    const v = pivot.data[r]?.[c] ?? 0;
                    const intensity = maxCell ? v / maxCell : 0;
                    const style = showHeatmap && v > 0 ? { background: `hsla(243, 75%, 59%, ${Math.min(0.55, intensity * 0.6)})` } : undefined;
                    return <td key={c} style={style} className="text-right p-2 tabular-nums">{v ? fmtCell(v) : "—"}</td>;
                  })}
                  <td className="text-right p-2 tabular-nums font-semibold border-l border-border">{fmtCell(pivot.rowTotals[r] ?? 0)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30">
                <td className="p-2 font-semibold sticky left-0 bg-muted/30">Total</td>
                {pivot.cols.map(c => <td key={c} className="text-right p-2 tabular-nums font-semibold">{fmtCell(pivot.colTotals[c] ?? 0)}</td>)}
                <td className="text-right p-2 tabular-nums font-bold border-l border-border">{fmtCell(pivot.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* AUM trend + treemap */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="AUM Trend" subtitle="Closing AUM across selected filters (₹ Cr)" className="xl:col-span-2">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={aumTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="aumG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
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

        <Panel title="AUM Treemap" subtitle="Pivot rows visualised as proportional blocks">
          <ResponsiveContainer width="100%" height={260}>
            <Treemap
              data={pivot.rows.map((r, i) => ({ name: r, size: pivot.rowTotals[r] ?? 0, fill: COLORS[i % COLORS.length] }))}
              dataKey="size" stroke="#fff"
            />
          </ResponsiveContainer>
        </Panel>
      </section>

      {/* Advisor performance — NO NPS */}
      <Panel title="Advisor Performance" subtitle="RM-level AUM, NNM, revenue, retention & productivity (TTM)">
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
                <th className="text-right p-2">AUM / Client</th>
                <th className="text-left p-2">Productivity</th>
              </tr>
            </thead>
            <tbody>
              {RM_INFO.map((r, i) => {
                const latestMonth = MONTHS[MONTHS.length - 1];
                const rmFacts = businessFacts.filter(f => f.rm === r.rm);
                const aum = rmFacts.filter(f => f.month === latestMonth).reduce((s, f) => s + f.aum, 0);
                const ttm = rmFacts.filter(f => MONTHS.slice(-12).includes(f.month));
                const revenue = ttm.reduce((s, f) => s + f.revenue, 0);
                const nnm = ttm.reduce((s, f) => s + f.netFlows, 0);
                const clients = Math.round(40 + (aum / 30));
                const retention = +(94 + (i * 0.4) + (aum / 800)).toFixed(1);
                const apc = aum / clients;
                return (
                  <tr key={r.rm} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2 text-muted-foreground">{i + 1}</td>
                    <td className="p-2 font-medium flex items-center gap-2">{i === 0 && <Award className="h-3.5 w-3.5 text-amber-500" />}{r.rm}</td>
                    <td className="p-2">{r.region}</td>
                    <td className="text-right p-2 tabular-nums">{aum.toFixed(0)}</td>
                    <td className="text-right p-2 tabular-nums">{clients}</td>
                    <td className="text-right p-2 tabular-nums text-positive">+{nnm.toFixed(1)}</td>
                    <td className="text-right p-2 tabular-nums font-medium">{revenue.toFixed(2)}</td>
                    <td className="text-right p-2 tabular-nums">{retention.toFixed(1)}%</td>
                    <td className="text-right p-2 tabular-nums">{fmtCr(apc)}</td>
                    <td className="p-2 w-32">
                      <div className="h-1.5 bg-muted rounded">
                        <div className="h-1.5 rounded bg-primary" style={{ width: `${Math.min(100, (apc / 20) * 100)}%` }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Bottom KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat icon={<Target />}    label="Cross-sell Ratio" value="2.8 prod/client" delta={0.3} suffix="" />
        <MiniStat icon={<Activity />}  label="Avg AUM / RM"     value={fmtCr(kpis.latestAum / RM_INFO.length)} delta={11.4} />
        <MiniStat icon={<TrendingUp />} label="Revenue Yield"    value={`${(kpis.revenue * 12 / periodMonths.length / kpis.latestAum * 100).toFixed(2)}%`} delta={0.18} />
        <MiniStat icon={<AlertCircle />} label="Compliance Breaches (TTM)" value="3" delta={-40} reverse />
      </section>

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Configurable analytics for an illustrative {REGION_META[getCurrentRegion()].label} wealth-management firm. All figures synthetic.
      </p>
    </main>
  );
}

// ============================================================
// PORTFOLIO ANALYTICS — pivot + health checks
// ============================================================
type PDim = "client" | "segment" | "rm" | "product" | "assetClass" | "sector" | "issuer" | "amc" | "liquidity";
const P_DIM_LABEL: Record<PDim, string> = {
  client: "Client", segment: "Segment", rm: "RM", product: "Product",
  assetClass: "Asset Class", sector: "Sector", issuer: "Issuer", amc: "AMC", liquidity: "Liquidity",
};

// FlatHolding type + flatHoldings/lookthroughHoldings now come from @/lib/analytics-data.

function PortfolioAnalytics() {
  const [view, setView] = useState<"healthcheck" | "pivot" | "drift" | "concentration" | "underperform" | "lookup">("healthcheck");

  return (
    <main className="px-4 sm:px-6 py-5 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap gap-2">
        {([
          { k: "healthcheck",   label: "Health Dashboard",         icon: <Shield className="h-3.5 w-3.5" /> },
          { k: "pivot",         label: "Holdings Pivot",           icon: <Settings2 className="h-3.5 w-3.5" /> },
          { k: "drift",         label: "Allocation Drift vs IPS",  icon: <Target className="h-3.5 w-3.5" /> },
          { k: "concentration", label: "Concentration Risk",       icon: <AlertTriangle className="h-3.5 w-3.5" /> },
          { k: "underperform",  label: "Underperformance",         icon: <TrendingDown className="h-3.5 w-3.5" /> },
          { k: "lookup",        label: "Security Lookup",          icon: <Search className="h-3.5 w-3.5" /> },
        ] as const).map(t => (
          <button
            key={t.k}
            onClick={() => setView(t.k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md border ${view === t.k ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}
          >{t.icon}{t.label}</button>
        ))}
      </div>

      {view === "healthcheck" && <HealthDashboard />}
      {view === "pivot" && <HoldingsPivot />}
      {view === "drift" && <DriftView />}
      {view === "concentration" && <ConcentrationView />}
      {view === "underperform" && <UnderperformView />}
      {view === "lookup" && <LookupView />}

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Portfolio analytics studio — pivot, drilldown and health checks across all client portfolios. All data illustrative.
      </p>
    </main>
  );
}

// ---- Health Dashboard ----
function HealthDashboard() {
  const checks = useMemo(() => {
    return clientPortfolios.map(p => {
      const allocByClass: Record<string, number> = {};
      p.holdings.forEach(h => { allocByClass[h.assetClass] = (allocByClass[h.assetClass] ?? 0) + h.value; });
      const eqPct = (allocByClass["Equity"] ?? 0) / p.aum * 100;
      const fiPct = (allocByClass["Fixed Income"] ?? 0) / p.aum * 100;
      const altPct = (allocByClass["Alternates"] ?? 0) / p.aum * 100;
      const cashPct = (allocByClass["Cash"] ?? 0) / p.aum * 100;
      const drift = Math.max(Math.abs(eqPct - p.ipsEquity), Math.abs(fiPct - p.ipsFI), Math.abs(altPct - p.ipsAlt), Math.abs(cashPct - p.ipsCash));

      // illiquid share
      const illiquid = p.holdings.filter(h => h.liquidity === "Locked" || h.liquidity === "T+30").reduce((s, h) => s + h.value, 0) / p.aum * 100;
      // weighted avg fee
      const wFee = p.holdings.reduce((s, h) => s + h.fee * h.value, 0) / p.aum;
      // single issuer max (look-through)
      const issuerExp = new Map<string, number>();
      lookthroughHoldings.filter(h => h.clientId === p.id).forEach(h => issuerExp.set(h.issuer, (issuerExp.get(h.issuer) ?? 0) + h.value));
      const topIssuer = [...issuerExp.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["—", 0];
      const issuerPct = topIssuer[1] / p.aum * 100;
      // alpha
      const alpha = p.ytdReturn - p.benchmarkReturn;

      const flags: { label: string; severity: "high" | "med" | "low" }[] = [];
      if (drift > 10) flags.push({ label: `Drift ${drift.toFixed(0)}%`, severity: drift > 15 ? "high" : "med" });
      if (illiquid > 25) flags.push({ label: `Illiquid ${illiquid.toFixed(0)}%`, severity: illiquid > 40 ? "high" : "med" });
      if (issuerPct > 25) flags.push({ label: `Issuer ${issuerPct.toFixed(0)}%`, severity: issuerPct > 35 ? "high" : "med" });
      if (cashPct > 12) flags.push({ label: `Cash drag ${cashPct.toFixed(0)}%`, severity: "low" });
      if (wFee > 1.5) flags.push({ label: `Fee ${wFee.toFixed(2)}%`, severity: wFee > 2 ? "med" : "low" });
      if (alpha < -2) flags.push({ label: `Alpha ${alpha.toFixed(1)}%`, severity: alpha < -5 ? "high" : "med" });

      const score = Math.max(0, 100 - flags.reduce((s, f) => s + (f.severity === "high" ? 25 : f.severity === "med" ? 12 : 5), 0));
      return { p, eqPct, fiPct, altPct, cashPct, drift, illiquid, wFee, issuerPct, topIssuer: topIssuer[0] as string, alpha, flags, score };
    }).sort((a, b) => a.score - b.score);
  }, []);

  const avgScore = +(checks.reduce((s, c) => s + c.score, 0) / checks.length).toFixed(1);
  const redFlags = checks.filter(c => c.score < 60).length;

  return (
    <>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={<Shield className="h-4 w-4" />} label="Avg Health Score" value={`${avgScore}/100`} delta={-2.1} sub="vs prev" />
        <KpiCard icon={<AlertTriangle className="h-4 w-4" />} label="Portfolios in Red" value={`${redFlags}`} delta={-10} sub="vs prev" />
        <KpiCard icon={<Droplet className="h-4 w-4" />} label="Avg Illiquid %" value={`${(checks.reduce((s, c) => s + c.illiquid, 0)/checks.length).toFixed(1)}%`} delta={1.2} sub="QoQ" />
        <KpiCard icon={<Percent className="h-4 w-4" />} label="Avg Fee" value={`${(checks.reduce((s, c) => s + c.wFee, 0)/checks.length).toFixed(2)}%`} delta={-0.04} sub="vs prev" reverse />
      </section>

      <Panel title="Portfolio Health Scorecard" subtitle="Composite score across drift, concentration, liquidity, fee & alpha — sorted by lowest first">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left p-2">Client</th>
                <th className="text-left p-2">RM</th>
                <th className="text-right p-2">AUM</th>
                <th className="text-right p-2">Score</th>
                <th className="text-right p-2">Drift</th>
                <th className="text-right p-2">Top Issuer</th>
                <th className="text-right p-2">Illiquid</th>
                <th className="text-right p-2">Cash</th>
                <th className="text-right p-2">Fee</th>
                <th className="text-right p-2">Alpha</th>
                <th className="text-left p-2">Flags</th>
              </tr>
            </thead>
            <tbody>
              {checks.map(c => {
                const scoreCls = c.score >= 80 ? "bg-positive/15 text-positive" : c.score >= 60 ? "bg-amber-500/15 text-amber-600" : "bg-negative/15 text-negative";
                return (
                  <tr key={c.p.id} className="border-t border-border">
                    <td className="p-2 font-medium">{c.p.client}</td>
                    <td className="p-2 text-muted-foreground">{c.p.rm}</td>
                    <td className="text-right p-2 tabular-nums">{fmtCr(c.p.aum)}</td>
                    <td className="text-right p-2"><span className={classNames("px-2 py-0.5 rounded tabular-nums font-semibold", scoreCls)}>{c.score}</span></td>
                    <td className="text-right p-2 tabular-nums">{c.drift.toFixed(0)}%</td>
                    <td className="text-right p-2"><span className="text-[10px]">{c.topIssuer} <span className="text-muted-foreground">({c.issuerPct.toFixed(0)}%)</span></span></td>
                    <td className="text-right p-2 tabular-nums">{c.illiquid.toFixed(0)}%</td>
                    <td className="text-right p-2 tabular-nums">{c.cashPct.toFixed(0)}%</td>
                    <td className="text-right p-2 tabular-nums">{c.wFee.toFixed(2)}%</td>
                    <td className={classNames("text-right p-2 tabular-nums font-medium", clsPct(c.alpha))}>{pct(c.alpha)}</td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        {c.flags.length === 0 && <span className="text-[10px] text-positive">✓ All clear</span>}
                        {c.flags.map((f, i) => (
                          <span key={i} className={classNames(
                            "text-[10px] px-1.5 py-0.5 rounded",
                            f.severity === "high" ? "bg-negative/15 text-negative" : f.severity === "med" ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"
                          )}>{f.label}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

// ---- Holdings Pivot ----
function HoldingsPivot() {
  const [rowDim, setRowDim] = useState<PDim>("client");
  const [colDim, setColDim] = useState<PDim | "none">("assetClass");
  const [lookthrough, setLookthrough] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [clientF, setClientF] = useState<string[]>([]);
  const [segmentF, setSegmentF] = useState<BSegment[]>([]);
  const [rmF, setRmF] = useState<BRm[]>([]);
  const [productF, setProductF] = useState<Holding["product"][]>([]);

  const source = lookthrough ? lookthroughHoldings : flatHoldings;
  const filtered = source.filter(h =>
    (clientF.length === 0 || clientF.includes(h.clientId)) &&
    (segmentF.length === 0 || segmentF.includes(h.segment)) &&
    (rmF.length === 0 || rmF.includes(h.rm)) &&
    (productF.length === 0 || productF.includes(h.product))
  );

  const pivot = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};
    const rowSet = new Set<string>(); const colSet = new Set<string>();
    filtered.forEach(h => {
      const rk = String((h as any)[rowDim]);
      const ck = colDim === "none" ? "Total" : String((h as any)[colDim]);
      rowSet.add(rk); colSet.add(ck);
      data[rk] = data[rk] ?? {};
      data[rk][ck] = (data[rk][ck] ?? 0) + h.value;
    });
    const rows = [...rowSet]; const cols = [...colSet];
    const rowTotals: Record<string, number> = {}; const colTotals: Record<string, number> = {};
    let grand = 0;
    rows.forEach(r => {
      let s = 0;
      cols.forEach(c => { const v = data[r]?.[c] ?? 0; s += v; colTotals[c] = (colTotals[c] ?? 0) + v; });
      rowTotals[r] = s; grand += s;
    });
    rows.sort((a, b) => (rowTotals[b] ?? 0) - (rowTotals[a] ?? 0));
    cols.sort((a, b) => (colTotals[b] ?? 0) - (colTotals[a] ?? 0));
    return { rows, cols, data, rowTotals, colTotals, grand };
  }, [filtered, rowDim, colDim]);

  const maxCell = useMemo(() => {
    let m = 0; pivot.rows.forEach(r => pivot.cols.forEach(c => { m = Math.max(m, pivot.data[r]?.[c] ?? 0); })); return m;
  }, [pivot]);

  const chartData = pivot.rows.slice(0, 15).map(r => {
    const o: Record<string, number | string> = { name: r.length > 24 ? r.slice(0, 22) + "…" : r };
    pivot.cols.forEach(c => { o[c] = +(pivot.data[r]?.[c] ?? 0).toFixed(2); });
    return o;
  });

  return (
    <Panel
      title="Holdings Pivot"
      subtitle={lookthrough ? "Look-through enabled — MF underlyings resolved to issuer level" : "Direct holdings only"}
      right={
        <label className="text-[11px] flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={lookthrough} onChange={e => setLookthrough(e.target.checked)} className="h-3 w-3" />
          MF look-through
        </label>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <Select label="Rows" value={rowDim} onChange={v => setRowDim(v as PDim)} options={Object.entries(P_DIM_LABEL).map(([k, v]) => ({ value: k, label: v }))} />
        <Select label="Columns" value={colDim} onChange={v => setColDim(v as PDim | "none")} options={[{ value: "none", label: "(none)" }, ...Object.entries(P_DIM_LABEL).map(([k, v]) => ({ value: k, label: v }))]} />
        <Select label="" value={showHeatmap ? "heat" : "plain"} onChange={v => setShowHeatmap(v === "heat")} options={[{ value: "heat", label: "Show heatmap" }, { value: "plain", label: "Plain table" }]} />
        <div className="flex items-end text-[11px] text-muted-foreground">{pivot.rows.length} × {pivot.cols.length} cells · ₹{pivot.grand.toFixed(1)} Cr</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        <ChipFilter label="Client"  all={clientPortfolios.map(c => c.id)} value={clientF}  onChange={v => setClientF(v as string[])}  display={(id) => clientPortfolios.find(c => c.id === id)?.client ?? id} />
        <ChipFilter label="Segment" all={SEGMENTS} value={segmentF} onChange={v => setSegmentF(v as BSegment[])} />
        <ChipFilter label="RM"      all={RM_INFO.map(r => r.rm)} value={rmF} onChange={v => setRmF(v as BRm[])} />
        <ChipFilter label="Product" all={["MF","PMS","AIF","Equity","Bond","Cash"]} value={productF as string[]} onChange={v => setProductF(v as Holding["product"][])} />
      </div>

      <div className="border border-border rounded-lg p-3 mb-3">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={140} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {pivot.cols.map((c, i) => <Bar key={c} dataKey={c} stackId="a" fill={COLORS[i % COLORS.length]} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2 sticky left-0 bg-muted/40">{P_DIM_LABEL[rowDim]}</th>
              {pivot.cols.map(c => <th key={c} className="text-right p-2">{c}</th>)}
              <th className="text-right p-2 border-l border-border">Total (₹ Cr)</th>
            </tr>
          </thead>
          <tbody>
            {pivot.rows.map(r => (
              <tr key={r} className="border-t border-border">
                <td className="p-2 font-medium sticky left-0 bg-card">{r}</td>
                {pivot.cols.map(c => {
                  const v = pivot.data[r]?.[c] ?? 0;
                  const style = showHeatmap && v > 0 ? { background: `hsla(243, 75%, 59%, ${Math.min(0.55, (v / maxCell) * 0.6)})` } : undefined;
                  return <td key={c} style={style} className="text-right p-2 tabular-nums">{v ? v.toFixed(2) : "—"}</td>;
                })}
                <td className="text-right p-2 tabular-nums font-semibold border-l border-border">{pivot.rowTotals[r].toFixed(2)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-border bg-muted/30">
              <td className="p-2 font-semibold sticky left-0 bg-muted/30">Total</td>
              {pivot.cols.map(c => <td key={c} className="text-right p-2 tabular-nums font-semibold">{(pivot.colTotals[c] ?? 0).toFixed(2)}</td>)}
              <td className="text-right p-2 tabular-nums font-bold border-l border-border">{pivot.grand.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---- Drift View ----
function DriftView() {
  const rows = clientPortfolios.map(p => {
    const a: Record<string, number> = { Equity: 0, "Fixed Income": 0, Alternates: 0, Cash: 0 };
    p.holdings.forEach(h => { a[h.assetClass] += h.value; });
    const actual = {
      Equity: a.Equity / p.aum * 100,
      "Fixed Income": a["Fixed Income"] / p.aum * 100,
      Alternates: a.Alternates / p.aum * 100,
      Cash: a.Cash / p.aum * 100,
    };
    const target = { Equity: p.ipsEquity, "Fixed Income": p.ipsFI, Alternates: p.ipsAlt, Cash: p.ipsCash };
    const drift = {
      Equity: actual.Equity - target.Equity,
      "Fixed Income": actual["Fixed Income"] - target["Fixed Income"],
      Alternates: actual.Alternates - target.Alternates,
      Cash: actual.Cash - target.Cash,
    };
    return { p, actual, target, drift };
  });

  return (
    <Panel title="Asset Allocation Drift vs IPS" subtitle="Actual vs IPS target across equity, fixed income, alternates and cash (% of AUM)">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th rowSpan={2} className="text-left p-2 align-bottom">Client</th>
              <th colSpan={2} className="text-center p-2 border-l border-border">Equity</th>
              <th colSpan={2} className="text-center p-2 border-l border-border">Fixed Income</th>
              <th colSpan={2} className="text-center p-2 border-l border-border">Alternates</th>
              <th colSpan={2} className="text-center p-2 border-l border-border">Cash</th>
              <th rowSpan={2} className="text-right p-2 align-bottom border-l border-border">Max Drift</th>
              <th rowSpan={2} className="text-left p-2 align-bottom">Action</th>
            </tr>
            <tr className="text-[10px]">
              <th className="text-right p-2 border-l border-border">Target</th><th className="text-right p-2">Actual</th>
              <th className="text-right p-2 border-l border-border">Target</th><th className="text-right p-2">Actual</th>
              <th className="text-right p-2 border-l border-border">Target</th><th className="text-right p-2">Actual</th>
              <th className="text-right p-2 border-l border-border">Target</th><th className="text-right p-2">Actual</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const maxDrift = Math.max(...Object.values(r.drift).map(Math.abs));
              const driftCls = (d: number) => Math.abs(d) > 10 ? "text-negative" : Math.abs(d) > 5 ? "text-amber-600" : "text-muted-foreground";
              const action = maxDrift > 15 ? "Rebalance now" : maxDrift > 10 ? "Review" : "Hold";
              const actCls = maxDrift > 15 ? "bg-negative/15 text-negative" : maxDrift > 10 ? "bg-amber-500/15 text-amber-600" : "bg-positive/15 text-positive";
              const cls = ["Equity","Fixed Income","Alternates","Cash"] as const;
              return (
                <tr key={r.p.id} className="border-t border-border">
                  <td className="p-2 font-medium">{r.p.client}</td>
                  {cls.map(c => (
                    <Fragment key={c}>
                      <td className="text-right p-2 tabular-nums text-muted-foreground border-l border-border">{r.target[c]}%</td>
                      <td className={classNames("text-right p-2 tabular-nums", driftCls(r.drift[c]))}>
                        {r.actual[c].toFixed(0)}% <span className="text-[10px]">({r.drift[c] >= 0 ? "+" : ""}{r.drift[c].toFixed(0)})</span>
                      </td>
                    </Fragment>
                  ))}
                  <td className="text-right p-2 tabular-nums font-semibold border-l border-border">{maxDrift.toFixed(0)}%</td>
                  <td className="p-2"><span className={classNames("px-2 py-0.5 rounded text-[10px]", actCls)}>{action}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---- Concentration View ----
function concentrationFor(p: ClientPortfolio) {
  const byIssuer = new Map<string, number>(); const byAmc = new Map<string, number>(); const byProduct = new Map<string, number>(); const bySector = new Map<string, number>();
  for (const h of p.holdings) {
    byIssuer.set(h.issuer, (byIssuer.get(h.issuer) ?? 0) + h.value);
    if (h.amc) byAmc.set(h.amc, (byAmc.get(h.amc) ?? 0) + h.value);
    byProduct.set(h.product, (byProduct.get(h.product) ?? 0) + h.value);
    bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + h.value);
  }
  const top = (m: Map<string, number>) => {
    const arr = [...m.entries()].sort((a, b) => b[1] - a[1]);
    const [name, val] = arr[0] ?? ["—", 0];
    return { name, val, pct: p.aum ? (val / p.aum) * 100 : 0 };
  };
  return { issuer: top(byIssuer), amc: top(byAmc), product: top(byProduct), sector: top(bySector) };
}

function ConcentrationView() {
  const rows = clientPortfolios.map(p => ({ p, c: concentrationFor(p) }))
    .sort((a, b) => Math.max(b.c.issuer.pct, b.c.amc.pct, b.c.product.pct, b.c.sector.pct) - Math.max(a.c.issuer.pct, a.c.amc.pct, a.c.product.pct, a.c.sector.pct));
  return (
    <Panel title="Concentration Risk by Portfolio" subtitle="Largest single-issuer, AMC, product & sector exposure (% of AUM)">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="text-left p-2">Client</th>
              <th className="text-right p-2">AUM</th>
              <th className="text-left p-2">Top Issuer</th>
              <th className="text-right p-2">%</th>
              <th className="text-left p-2">Top AMC</th>
              <th className="text-right p-2">%</th>
              <th className="text-left p-2">Top Product</th>
              <th className="text-right p-2">%</th>
              <th className="text-left p-2">Top Sector</th>
              <th className="text-right p-2">%</th>
              <th className="text-left p-2">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, c }) => {
              const maxPct = Math.max(c.issuer.pct, c.amc.pct, c.product.pct, c.sector.pct);
              const flag = maxPct > 35 ? "High" : maxPct > 25 ? "Elevated" : "OK";
              const flagCls = flag === "High" ? "bg-negative/15 text-negative" : flag === "Elevated" ? "bg-amber-500/15 text-amber-600" : "bg-positive/15 text-positive";
              const pc = (n: number) => n > 35 ? "text-negative font-medium" : n > 25 ? "text-amber-600 font-medium" : "";
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-2 font-medium">{p.client}</td>
                  <td className="text-right p-2 tabular-nums">{fmtCr(p.aum)}</td>
                  <td className="p-2">{c.issuer.name}</td>
                  <td className={classNames("text-right p-2 tabular-nums", pc(c.issuer.pct))}>{c.issuer.pct.toFixed(1)}%</td>
                  <td className="p-2">{c.amc.name}</td>
                  <td className={classNames("text-right p-2 tabular-nums", pc(c.amc.pct))}>{c.amc.pct.toFixed(1)}%</td>
                  <td className="p-2">{c.product.name}</td>
                  <td className={classNames("text-right p-2 tabular-nums", pc(c.product.pct))}>{c.product.pct.toFixed(1)}%</td>
                  <td className="p-2">{c.sector.name}</td>
                  <td className={classNames("text-right p-2 tabular-nums", pc(c.sector.pct))}>{c.sector.pct.toFixed(1)}%</td>
                  <td className="p-2"><span className={classNames("px-1.5 py-0.5 rounded text-[10px]", flagCls)}>{flag}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">Policy thresholds (illustrative): &gt;25% Elevated · &gt;35% High.</p>
    </Panel>
  );
}

// ---- Underperformance ----
function UnderperformView() {
  const rows = clientPortfolios.map(p => ({ ...p, alpha: p.ytdReturn - p.benchmarkReturn })).filter(p => p.alpha < 0).sort((a, b) => a.alpha - b.alpha);
  return (
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
            {rows.map(p => {
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
                  <td className={classNames("text-right p-2 tabular-nums font-medium", clsPct(p.alpha))}>{pct(p.alpha)}</td>
                  <td className="p-2 w-32"><div className="h-1.5 bg-muted rounded"><div className="h-1.5 rounded bg-negative" style={{ width: `${Math.min(100, (gap / 8) * 100)}%` }} /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ---- Lookup ----
type LookupMode = "client" | "firm";
function LookupView() {
  const [mode, setMode] = useState<LookupMode>("firm");
  const [clientId, setClientId] = useState(clientPortfolios[0].id);
  const [query, setQuery] = useState("");
  const [includeLookthrough, setIncludeLookthrough] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const selectedClient = clientPortfolios.find(c => c.id === clientId)!;

  // ---- Single-client results ----
  const clientResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || mode !== "client") return [];
    type Match = { key: string; holding: Holding; matchType: "direct" | "underlying"; underlying?: { issuer: string; sector: string; weight: number }; effectiveValue: number; };
    const out: Match[] = [];
    for (const h of selectedClient.holdings) {
      const direct = h.security.toLowerCase().includes(q) || h.issuer.toLowerCase().includes(q) || (h.amc ?? "").toLowerCase().includes(q) || h.sector.toLowerCase().includes(q);
      if (direct) out.push({ key: h.security + ":direct", holding: h, matchType: "direct", effectiveValue: h.value });
      if (includeLookthrough && h.product === "MF" && h.underlyings) {
        for (const u of h.underlyings) {
          if (u.issuer.toLowerCase().includes(q) || u.sector.toLowerCase().includes(q)) {
            out.push({ key: h.security + ":" + u.issuer, holding: h, matchType: "underlying", underlying: u, effectiveValue: +(h.value * u.weight / 100).toFixed(3) });
          }
        }
      }
    }
    return out;
  }, [selectedClient, query, mode, includeLookthrough]);

  // ---- Firm-wide results (grouped per portfolio) ----
  type FirmMatch = { key: string; holding: Holding; matchType: "direct" | "underlying"; underlying?: { issuer: string; sector: string; weight: number }; effectiveValue: number; };
  type FirmGroup = { clientId: string; client: string; segment: BSegment; rm: BRm; aum: number; matches: FirmMatch[]; totalExposure: number; };
  const firmGroups = useMemo<FirmGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q || mode !== "firm") return [];
    const groups: FirmGroup[] = [];
    for (const p of clientPortfolios) {
      const matches: FirmMatch[] = [];
      for (const h of p.holdings) {
        const direct = h.security.toLowerCase().includes(q) || h.issuer.toLowerCase().includes(q) || (h.amc ?? "").toLowerCase().includes(q) || h.sector.toLowerCase().includes(q);
        if (direct) matches.push({ key: p.id + ":" + h.security + ":direct", holding: h, matchType: "direct", effectiveValue: h.value });
        if (includeLookthrough && h.product === "MF" && h.underlyings) {
          for (const u of h.underlyings) {
            if (u.issuer.toLowerCase().includes(q) || u.sector.toLowerCase().includes(q)) {
              matches.push({ key: p.id + ":" + h.security + ":" + u.issuer, holding: h, matchType: "underlying", underlying: u, effectiveValue: +(h.value * u.weight / 100).toFixed(3) });
            }
          }
        }
      }
      if (matches.length) {
        const totalExposure = matches.reduce((s, m) => s + m.effectiveValue, 0);
        groups.push({ clientId: p.id, client: p.client, segment: p.segment, rm: p.rm, aum: p.aum, matches, totalExposure });
      }
    }
    groups.sort((a, b) => b.totalExposure - a.totalExposure);
    return groups;
  }, [query, mode, includeLookthrough]);

  const clientTotalExposure = clientResults.reduce((s, m) => s + m.effectiveValue, 0);
  const firmTotalExposure = firmGroups.reduce((s, g) => s + g.totalExposure, 0);
  const firmTotalMatches = firmGroups.reduce((s, g) => s + g.matches.length, 0);
  const firmTotalAum = firmGroups.reduce((s, g) => s + g.aum, 0);
  const toggle = (k: string) => setExpanded(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  // Firm-wide top issuer / sector concentration mini-summary (across matched portfolios)
  const firmIssuerSplit = useMemo(() => {
    const m = new Map<string, number>();
    firmGroups.forEach(g => g.matches.forEach(x => {
      const key = x.matchType === "underlying" ? (x.underlying?.issuer ?? x.holding.issuer) : x.holding.issuer;
      m.set(key, (m.get(key) ?? 0) + x.effectiveValue);
    }));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [firmGroups]);

  return (
    <Panel title="Security / Issuer Lookup" subtitle="Search a security, issuer, AMC or sector — across a single client or firm-wide across all portfolios. Includes MF underlying drilldown.">
      {/* Mode + controls */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
        <div className="md:col-span-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Scope</label>
          <div className="mt-1 inline-flex rounded-md border border-border bg-card p-0.5 w-full">
            {([
              { k: "firm" as const, label: "Firm-wide" },
              { k: "client" as const, label: "Single Client" },
            ]).map(o => (
              <button
                key={o.k}
                onClick={() => { setMode(o.k); setExpanded(new Set()); }}
                className={`flex-1 text-[11px] px-2 py-1.5 rounded ${mode === o.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >{o.label}</button>
            ))}
          </div>
        </div>
        {mode === "client" && (
          <div className="md:col-span-4">
            <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Client</label>
            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setExpanded(new Set()); }} className="mt-1 w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs">
              {clientPortfolios.map(c => <option key={c.id} value={c.id}>{c.client} · {c.segment} · {fmtCr(c.aum)}</option>)}
            </select>
          </div>
        )}
        <div className={mode === "client" ? "md:col-span-5" : "md:col-span-9"}>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Search security / issuer / AMC / sector</label>
          <div className="mt-1 flex items-center gap-2 bg-card border border-border rounded-md px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. HDFC Bank, Reliance, Axis AMC, Financials…" className="flex-1 bg-transparent py-1.5 text-xs focus:outline-none" />
            {query && <button onClick={() => setQuery("")} className="text-[10px] text-muted-foreground hover:text-foreground">clear</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <label className="text-[10px] flex items-center gap-1 text-muted-foreground">
              <input type="checkbox" checked={includeLookthrough} onChange={e => setIncludeLookthrough(e.target.checked)} className="h-3 w-3" />
              Include MF look-through
            </label>
            <span className="text-[10px] text-muted-foreground">·</span>
            {getQuickFilters().map(s => (
              <button key={s} onClick={() => setQuery(s)} className="text-[10px] px-2 py-0.5 rounded border border-border bg-card hover:bg-muted">{s}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== Single-client mode ===== */}
      {mode === "client" && (
        <>
          {query && (
            <div className="mb-3 p-3 rounded-md bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs"><span className="font-medium">{clientResults.length}</span> match{clientResults.length === 1 ? "" : "es"} for <span className="font-medium">"{query}"</span> in <span className="font-medium">{selectedClient.client}</span>'s portfolio</div>
              <div className="text-xs">Total effective exposure: <span className="font-semibold tabular-nums">{fmtCr(clientTotalExposure)}</span> <span className="text-muted-foreground">({selectedClient.aum ? (clientTotalExposure / selectedClient.aum * 100).toFixed(2) : "0"}% of AUM)</span></div>
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
                {!query && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Enter a security, issuer, AMC or sector to search across all holdings of the selected client.</td></tr>}
                {query && clientResults.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No matches in {selectedClient.client}'s portfolio.</td></tr>}
                {clientResults.map(m => {
                  const isMf = m.holding.product === "MF";
                  const open = expanded.has(m.key);
                  return (
                    <Fragment key={m.key}>
                      <tr className="border-t border-border">
                        <td className="p-2">{isMf ? <button onClick={() => toggle(m.key)} className="text-muted-foreground hover:text-foreground">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button> : null}</td>
                        <td className="p-2 font-medium">{m.holding.security}</td>
                        <td className="p-2">{m.holding.amc ?? m.holding.issuer}</td>
                        <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{m.holding.product}</span></td>
                        <td className="p-2">{m.matchType === "direct" ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">Direct</span> : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">Underlying · {m.underlying?.issuer} ({m.underlying?.weight.toFixed(1)}%)</span>}</td>
                        <td className="text-right p-2 tabular-nums text-muted-foreground">{fmtCr(m.holding.value)}</td>
                        <td className="text-right p-2 tabular-nums font-medium">{fmtCr(m.effectiveValue)}</td>
                      </tr>
                      {isMf && open && (
                        <tr className="bg-muted/20">
                          <td></td>
                          <td colSpan={6} className="p-3">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1"><PieIcon className="h-3 w-3" /> {m.holding.security} · Underlying issuer breakdown</div>
                            <table className="w-full text-[11px]">
                              <thead className="text-muted-foreground"><tr><th className="text-left py-1">Underlying Issuer</th><th className="text-left py-1">Sector</th><th className="text-right py-1">Weight</th><th className="text-right py-1">Effective Value</th></tr></thead>
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
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== Firm-wide mode ===== */}
      {mode === "firm" && (
        <>
          {query && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
              <div className="p-2.5 rounded-md bg-primary/5 border border-primary/20">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolios w/ exposure</div>
                <div className="text-base font-semibold tabular-nums">{firmGroups.length}<span className="text-[10px] text-muted-foreground font-normal"> / {clientPortfolios.length}</span></div>
              </div>
              <div className="p-2.5 rounded-md bg-card border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total matches</div>
                <div className="text-base font-semibold tabular-nums">{firmTotalMatches}</div>
              </div>
              <div className="p-2.5 rounded-md bg-card border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Aggregate exposure</div>
                <div className="text-base font-semibold tabular-nums">{fmtCr(firmTotalExposure)}</div>
              </div>
              <div className="p-2.5 rounded-md bg-card border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">% of impacted AUM</div>
                <div className="text-base font-semibold tabular-nums">{firmTotalAum ? (firmTotalExposure / firmTotalAum * 100).toFixed(2) : "0"}%</div>
              </div>
              <div className="p-2.5 rounded-md bg-card border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Largest holder</div>
                <div className="text-[11px] font-medium truncate">{firmGroups[0]?.client ?? "—"}</div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{firmGroups[0] ? fmtCr(firmGroups[0].totalExposure) : ""}</div>
              </div>
            </div>
          )}

          {query && firmIssuerSplit.length > 1 && (
            <div className="mb-3 p-3 rounded-md bg-card border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Exposure split by matched issuer (firm-wide)</div>
              <div className="flex flex-wrap gap-2">
                {firmIssuerSplit.map(([iss, val]) => (
                  <div key={iss} className="text-[10px] px-2 py-1 rounded border border-border bg-muted/40">
                    <span className="font-medium">{iss}</span>
                    <span className="text-muted-foreground"> · {fmtCr(val)} ({firmTotalExposure ? (val / firmTotalExposure * 100).toFixed(1) : "0"}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-muted-foreground">
                <tr>
                  <th className="text-left p-2 w-6"></th>
                  <th className="text-left p-2">Client / Portfolio</th>
                  <th className="text-left p-2">Segment</th>
                  <th className="text-left p-2">RM</th>
                  <th className="text-right p-2">Portfolio AUM</th>
                  <th className="text-center p-2">Matches</th>
                  <th className="text-right p-2">Exposure</th>
                  <th className="text-right p-2">% of Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {!query && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Enter a security, issuer, AMC or sector to find every client portfolio that holds it.</td></tr>}
                {query && firmGroups.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">No portfolio across the firm holds "{query}".</td></tr>}
                {firmGroups.map(g => {
                  const open = expanded.has(g.clientId);
                  const pct = g.aum ? (g.totalExposure / g.aum * 100) : 0;
                  const pctTone = pct >= 10 ? "text-rose-600" : pct >= 5 ? "text-amber-600" : "text-foreground";
                  return (
                    <Fragment key={g.clientId}>
                      <tr className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => toggle(g.clientId)}>
                        <td className="p-2"><button className="text-muted-foreground hover:text-foreground">{open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}</button></td>
                        <td className="p-2 font-medium">{g.client}</td>
                        <td className="p-2"><span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{g.segment}</span></td>
                        <td className="p-2 text-muted-foreground">{g.rm}</td>
                        <td className="text-right p-2 tabular-nums text-muted-foreground">{fmtCr(g.aum)}</td>
                        <td className="text-center p-2 tabular-nums">{g.matches.length}</td>
                        <td className="text-right p-2 tabular-nums font-semibold">{fmtCr(g.totalExposure)}</td>
                        <td className={`text-right p-2 tabular-nums font-medium ${pctTone}`}>{pct.toFixed(2)}%</td>
                      </tr>
                      {open && (
                        <tr className="bg-muted/20">
                          <td></td>
                          <td colSpan={7} className="p-3">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Matching holdings in {g.client}</div>
                            <table className="w-full text-[11px]">
                              <thead className="text-muted-foreground">
                                <tr>
                                  <th className="text-left py-1">Holding</th>
                                  <th className="text-left py-1">Issuer / AMC</th>
                                  <th className="text-left py-1">Product</th>
                                  <th className="text-left py-1">Match</th>
                                  <th className="text-right py-1">Holding Value</th>
                                  <th className="text-right py-1">Effective Exposure</th>
                                </tr>
                              </thead>
                              <tbody>
                                {g.matches.map(m => (
                                  <tr key={m.key} className="border-t border-border/60">
                                    <td className="py-1 font-medium">{m.holding.security}</td>
                                    <td className="py-1">{m.holding.amc ?? m.holding.issuer}</td>
                                    <td className="py-1"><span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{m.holding.product}</span></td>
                                    <td className="py-1">{m.matchType === "direct"
                                      ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary">Direct</span>
                                      : <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">Underlying · {m.underlying?.issuer} ({m.underlying?.weight.toFixed(1)}%)</span>}
                                    </td>
                                    <td className="text-right py-1 tabular-nums text-muted-foreground">{fmtCr(m.holding.value)}</td>
                                    <td className="text-right py-1 tabular-nums font-medium">{fmtCr(m.effectiveValue)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Panel>
  );
}

// ============================================================
// UI atoms
// ============================================================
function Panel({ title, subtitle, children, className = "", right }: { title: string; subtitle?: string; children: React.ReactNode; className?: string; right?: React.ReactNode }) {
  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ icon, label, value, delta, sub, reverse = false }: { icon: React.ReactNode; label: string; value: string; delta: number; sub: string; reverse?: boolean }) {
  const good = reverse ? delta < 0 : delta >= 0;
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <span className="text-primary">{icon}</span>{label}
        </div>
        <span className={`text-[11px] font-medium flex items-center gap-0.5 ${good ? "text-positive" : "text-negative"}`}>
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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div>
      {label && <label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} className="mt-1 w-full bg-card border border-border rounded-md px-2 py-1.5 text-xs">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function ChipFilter<T extends string>({ label, all, value, onChange, display }: { label: string; all: readonly T[] | T[]; value: T[]; onChange: (v: T[]) => void; display?: (v: T) => string }) {
  const [open, setOpen] = useState(false);
  const toggle = (v: T) => onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v]);
  const dn = (v: T) => display ? display(v) : v;
  return (
    <div className="relative">
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Filter className="h-2.5 w-2.5" />{label}</label>
      <button onClick={() => setOpen(o => !o)} className="mt-1 w-full text-left bg-card border border-border rounded-md px-2 py-1.5 text-xs flex items-center justify-between hover:bg-muted">
        <span className="truncate">{value.length === 0 ? "All" : value.length === 1 ? dn(value[0]) : `${value.length} selected`}</span>
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            <button onClick={() => onChange([])} className="w-full text-left px-2 py-1.5 text-[11px] hover:bg-muted border-b border-border text-muted-foreground">Clear all</button>
            {all.map(v => (
              <label key={v} className="flex items-center gap-2 px-2 py-1.5 text-[11px] hover:bg-muted cursor-pointer">
                <input type="checkbox" checked={value.includes(v)} onChange={() => toggle(v)} className="h-3 w-3" />
                {dn(v)}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
