import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { mutualFunds, fixedDeposits, insurance, pmsSchemes, aifSchemes, type MutualFund, type FixedDeposit, type Insurance, type PMS, type AIF, type Category } from "@/lib/research-data";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SlidersHorizontal, Star, TrendingUp, Layers, Filter, Download, BookmarkPlus, ChevronDown, Activity, X, Trophy } from "lucide-react";
import kfintechLogo from "@/assets/kfintech.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vantage Research — MF, FD & Insurance Intelligence for RMs" },
      { name: "description", content: "Institutional-grade research terminal comparing mutual funds, fixed deposits and insurance products across India." },
    ],
  }),
  component: ResearchTerminal,
});

type SortDir = "asc" | "desc";

const CATEGORIES: { key: Category; label: string; count: number; tone: string }[] = [
  { key: "MF", label: "Mutual Funds", count: mutualFunds.length, tone: "text-mf" },
  { key: "PMS", label: "PMS", count: pmsSchemes.length, tone: "text-pms" },
  { key: "AIF", label: "AIF", count: aifSchemes.length, tone: "text-aif" },
  { key: "FD", label: "Fixed Deposits", count: fixedDeposits.length, tone: "text-fd" },
  { key: "INS", label: "Insurance", count: insurance.length, tone: "text-ins" },
];

function fmtINR(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

function pctClass(v: number) {
  return v >= 0 ? "text-positive" : "text-negative";
}

function ResearchTerminal() {
  const [cat, setCat] = useState<Category>("MF");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("returns3y");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  // category-specific filters
  const [mfSub, setMfSub] = useState<string>("All");
  const [mfRiskMax, setMfRiskMax] = useState<number>(6);
  const [mfMinReturn, setMfMinReturn] = useState<number>(0);
  const [mfMaxExpense, setMfMaxExpense] = useState<number>(2.5);
  const [mfAssetClass, setMfAssetClass] = useState<string>("All");

  const [fdIssuer, setFdIssuer] = useState<string>("All");
  const [fdMinRate, setFdMinRate] = useState<number>(6);
  const [fdTenure, setFdTenure] = useState<string>("All");
  const [fdSenior, setFdSenior] = useState<boolean>(false);
  const [fdInsured, setFdInsured] = useState<boolean>(false);

  const [insSub, setInsSub] = useState<string>("All");
  const [insMinClaim, setInsMinClaim] = useState<number>(94);
  const [insMinRating, setInsMinRating] = useState<number>(1);

  const [pmsStrategy, setPmsStrategy] = useState<string>("All");
  const [pmsStructure, setPmsStructure] = useState<string>("All");
  const [pmsMinReturn, setPmsMinReturn] = useState<number>(0);
  const [pmsMaxFee, setPmsMaxFee] = useState<number>(2.5);

  const [aifCategory, setAifCategory] = useState<string>("All");
  const [aifStrategy, setAifStrategy] = useState<string>("All");
  const [aifMinIRR, setAifMinIRR] = useState<number>(0);
  const [aifVintageFrom, setAifVintageFrom] = useState<number>(2018);

  const data = useMemo(() => {
    if (cat === "MF") {
      return mutualFunds.filter(p => {
        if (mfSub !== "All" && p.subCategory !== mfSub) return false;
        if (mfAssetClass !== "All" && p.assetClass !== mfAssetClass) return false;
        if (p.returns3y < mfMinReturn) return false;
        if (p.expenseRatio > mfMaxExpense) return false;
        const riskOrder = ["Low", "Low-Mod", "Moderate", "Mod-High", "High", "Very High"];
        if (riskOrder.indexOf(p.risk) + 1 > mfRiskMax) return false;
        if (query && !`${p.name} ${p.amc} ${p.subCategory}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      });
    }
    if (cat === "FD") {
      return fixedDeposits.filter(p => {
        if (fdIssuer !== "All" && p.subCategory !== fdIssuer) return false;
        const rate = fdSenior ? p.seniorRate : p.interestRate;
        if (rate < fdMinRate) return false;
        if (fdTenure !== "All" && String(p.tenureMonths) !== fdTenure) return false;
        if (fdInsured && !p.insuredDICGC) return false;
        if (query && !`${p.name} ${p.issuer}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      });
    }
    if (cat === "INS") {
      return insurance.filter(p => {
        if (insSub !== "All" && p.subCategory !== insSub) return false;
        if (p.claimSettlement < insMinClaim) return false;
        if (p.rating < insMinRating) return false;
        if (query && !`${p.name} ${p.insurer} ${p.subCategory}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      });
    }
    if (cat === "PMS") {
      return pmsSchemes.filter(p => {
        if (pmsStrategy !== "All" && p.strategy !== pmsStrategy) return false;
        if (pmsStructure !== "All" && p.structure !== pmsStructure) return false;
        if (p.returns3y < pmsMinReturn) return false;
        if (p.fixedFee > pmsMaxFee) return false;
        if (query && !`${p.name} ${p.manager} ${p.strategy}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      });
    }
    return aifSchemes.filter(p => {
      if (aifCategory !== "All" && p.sebiCategory !== aifCategory) return false;
      if (aifStrategy !== "All" && p.subStrategy !== aifStrategy) return false;
      if (p.netIRR < aifMinIRR) return false;
      if (p.vintage < aifVintageFrom) return false;
      if (query && !`${p.name} ${p.manager} ${p.subStrategy} ${p.sebiCategory}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cat, query, mfSub, mfRiskMax, mfMinReturn, mfMaxExpense, mfAssetClass, fdIssuer, fdMinRate, fdTenure, fdSenior, fdInsured, insSub, insMinClaim, insMinRating, pmsStrategy, pmsStructure, pmsMinReturn, pmsMaxFee, aifCategory, aifStrategy, aifMinIRR, aifVintageFrom]);

  const sorted = useMemo(() => {
    const arr = [...data] as any[];
    arr.sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const grouped = useMemo(() => {
    if (groupBy === "none") return [{ key: "All Results", items: sorted }];
    const m = new Map<string, any[]>();
    for (const item of sorted) {
      const k = String((item as any)[groupBy] ?? "—");
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(item);
    }
    return Array.from(m.entries()).map(([key, items]) => ({ key, items }));
  }, [sorted, groupBy]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const groupOptions = cat === "MF"
    ? [["none", "No Grouping"], ["amc", "AMC"], ["subCategory", "Sub-Category"], ["assetClass", "Asset Class"], ["risk", "Risk"]]
    : cat === "FD"
      ? [["none", "No Grouping"], ["issuer", "Issuer"], ["subCategory", "Issuer Type"], ["tenureMonths", "Tenure"], ["rating", "Credit Rating"]]
      : cat === "INS"
        ? [["none", "No Grouping"], ["insurer", "Insurer"], ["subCategory", "Product Type"], ["rating", "Rating"]]
        : cat === "PMS"
          ? [["none", "No Grouping"], ["manager", "Manager"], ["strategy", "Strategy"], ["structure", "Structure"], ["risk", "Risk"]]
          : [["none", "No Grouping"], ["manager", "Manager"], ["sebiCategory", "SEBI Category"], ["subStrategy", "Sub-Strategy"], ["vintage", "Vintage"], ["domicile", "Domicile"]];

  // Quick stats
  const stats = useMemo(() => {
    if (cat === "MF") {
      const a = sorted as MutualFund[];
      return [
        { l: "Funds", v: a.length },
        { l: "Avg 3Y", v: a.length ? `${(a.reduce((s, x) => s + x.returns3y, 0) / a.length).toFixed(2)}%` : "—" },
        { l: "Avg Expense", v: a.length ? `${(a.reduce((s, x) => s + x.expenseRatio, 0) / a.length).toFixed(2)}%` : "—" },
        { l: "Top AUM", v: a.length ? fmtINR(Math.max(...a.map(x => x.aum)) * 1e7) : "—" },
      ];
    }
    if (cat === "FD") {
      const a = sorted as FixedDeposit[];
      return [
        { l: "Schemes", v: a.length },
        { l: "Best Rate", v: a.length ? `${Math.max(...a.map(x => x.interestRate)).toFixed(2)}%` : "—" },
        { l: "Best Senior", v: a.length ? `${Math.max(...a.map(x => x.seniorRate)).toFixed(2)}%` : "—" },
        { l: "DICGC Insured", v: `${a.filter(x => x.insuredDICGC).length}/${a.length}` },
      ];
    }
    if (cat === "INS") {
      const a = sorted as Insurance[];
      return [
        { l: "Policies", v: a.length },
        { l: "Avg Claim%", v: a.length ? `${(a.reduce((s, x) => s + x.claimSettlement, 0) / a.length).toFixed(2)}%` : "—" },
        { l: "Avg Solvency", v: a.length ? `${(a.reduce((s, x) => s + x.solvencyRatio, 0) / a.length).toFixed(2)}` : "—" },
        { l: "5★ Plans", v: a.filter(x => x.rating === 5).length },
      ];
    }
    if (cat === "PMS") {
      const a = sorted as PMS[];
      return [
        { l: "Strategies", v: a.length },
        { l: "Avg 3Y", v: a.length ? `${(a.reduce((s, x) => s + x.returns3y, 0) / a.length).toFixed(2)}%` : "—" },
        { l: "Avg Fixed Fee", v: a.length ? `${(a.reduce((s, x) => s + x.fixedFee, 0) / a.length).toFixed(2)}%` : "—" },
        { l: "Top AUM", v: a.length ? fmtINR(Math.max(...a.map(x => x.aum)) * 1e7) : "—" },
      ];
    }
    const a = sorted as AIF[];
    return [
      { l: "Funds", v: a.length },
      { l: "Avg Net IRR", v: a.length ? `${(a.reduce((s, x) => s + x.netIRR, 0) / a.length).toFixed(2)}%` : "—" },
      { l: "Total Corpus", v: a.length ? fmtINR(a.reduce((s, x) => s + x.corpusTarget, 0) * 1e7) : "—" },
      { l: "Cat-III Funds", v: a.filter(x => x.sebiCategory === "Category III").length },
    ];
  }, [sorted, cat]);

  return (
    <div className="min-h-screen text-foreground">
      {/* Top Bar */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={kfintechLogo.url} alt="KFintech" className="h-8 w-auto object-contain" />
            <div className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold leading-tight tracking-tight">mPower Wealth</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-tight">RM Intelligence Terminal · IN</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs">
            {["Screener", "Compare", "Portfolios", "Watchlists", "Alerts", "Reports"].map((n, i) => {
              const cls = `px-3 py-1.5 rounded-sm transition-colors ${i === 0 ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`;
              if (n === "Portfolios") return <Link key={n} to="/portfolio" className={cls}>{n}</Link>;
              return <button key={n} className={cls}>{n}</button>;
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground mono-num">
              <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-positive" /> NIFTY 24,856.20 <span className="text-positive">+0.42%</span></span>
              <span className="opacity-40">|</span>
              <span>SENSEX 81,432.10 <span className="text-positive">+0.38%</span></span>
              <span className="opacity-40">|</span>
              <span>10Y G-Sec 6.92%</span>
            </div>
            <div className="text-[11px] text-muted-foreground border-l border-border pl-3">RM · A. Mehta</div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-6 flex items-end gap-1 border-t border-border/60">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => { setCat(c.key); setSortKey(c.key === "MF" ? "returns3y" : c.key === "FD" ? "interestRate" : c.key === "INS" ? "claimSettlement" : c.key === "PMS" ? "returns3y" : "netIRR"); setGroupBy("none"); setSelected(new Set()); }}
              className={`px-4 py-2.5 text-xs font-medium tracking-wide border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                cat === c.key
                  ? `border-foreground text-foreground ${c.tone}`
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.key === "MF" ? "bg-mf" : c.key === "FD" ? "bg-fd" : c.key === "INS" ? "bg-ins" : c.key === "PMS" ? "bg-pms" : "bg-aif"}`} />
              {c.label.toUpperCase()}
              <span className="text-[10px] opacity-60 mono-num">[{c.count}]</span>
            </button>
          ))}
          <div className="ml-auto pb-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Data as of 14 Jun 2026 · 16:30 IST
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Filter Sidebar */}
        <aside className="w-72 shrink-0 border-r border-border bg-surface/40 min-h-[calc(100vh-105px)]">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
            </div>
            <button className="text-[10px] uppercase text-muted-foreground hover:text-foreground tracking-wider">Reset</button>
          </div>

          <div className="p-4 space-y-5 text-xs">
            {cat === "MF" && (
              <>
                <FilterSelect label="Sub-Category" value={mfSub} onChange={setMfSub}
                  options={["All", ...Array.from(new Set(mutualFunds.map(m => m.subCategory)))]} />
                <FilterSelect label="Asset Class" value={mfAssetClass} onChange={setMfAssetClass}
                  options={["All", "Equity", "Debt", "Hybrid"]} />
                <FilterRange label="Min 3Y Return" value={mfMinReturn} onChange={setMfMinReturn} min={-5} max={25} step={0.5} suffix="%" />
                <FilterRange label="Max Expense Ratio" value={mfMaxExpense} onChange={setMfMaxExpense} min={0.1} max={2.5} step={0.05} suffix="%" />
                <FilterRange label="Risk Ceiling" value={mfRiskMax} onChange={setMfRiskMax} min={1} max={6} step={1}
                  format={v => ["Low", "Low-Mod", "Moderate", "Mod-High", "High", "Very High"][v - 1]} />
              </>
            )}
            {cat === "FD" && (
              <>
                <FilterSelect label="Issuer Type" value={fdIssuer} onChange={setFdIssuer}
                  options={["All", "Public Bank", "Private Bank", "Small Finance", "NBFC", "Corporate"]} />
                <FilterSelect label="Tenure" value={fdTenure} onChange={setFdTenure}
                  options={["All", "3", "6", "12", "18", "24", "36", "60", "84", "120"]} formatLabel={v => v === "All" ? "All" : `${v} months`} />
                <FilterRange label="Min Interest Rate" value={fdMinRate} onChange={setFdMinRate} min={5} max={9.5} step={0.1} suffix="%" />
                <FilterToggle label="Senior Citizen Rates" value={fdSenior} onChange={setFdSenior} />
                <FilterToggle label="DICGC Insured Only" value={fdInsured} onChange={setFdInsured} />
              </>
            )}
            {cat === "INS" && (
              <>
                <FilterSelect label="Product Type" value={insSub} onChange={setInsSub}
                  options={["All", "Term", "ULIP", "Endowment", "Health", "Annuity", "Child"]} />
                <FilterRange label="Min Claim Settlement" value={insMinClaim} onChange={setInsMinClaim} min={90} max={100} step={0.5} suffix="%" />
                <FilterRange label="Min Rating" value={insMinRating} onChange={setInsMinRating} min={1} max={5} step={1} format={v => `${v}★ & above`} />
              </>
            )}
            {cat === "PMS" && (
              <>
                <FilterSelect label="Strategy" value={pmsStrategy} onChange={setPmsStrategy}
                  options={["All", ...Array.from(new Set(pmsSchemes.map(p => p.strategy)))]} />
                <FilterSelect label="Structure" value={pmsStructure} onChange={setPmsStructure}
                  options={["All", "Discretionary", "Non-Discretionary", "Advisory"]} />
                <FilterRange label="Min 3Y Return" value={pmsMinReturn} onChange={setPmsMinReturn} min={-5} max={30} step={0.5} suffix="%" />
                <FilterRange label="Max Fixed Fee" value={pmsMaxFee} onChange={setPmsMaxFee} min={0.5} max={2.5} step={0.05} suffix="%" />
                <div className="text-[10px] text-muted-foreground italic pt-1">SEBI min ticket: ₹50 Lakhs</div>
              </>
            )}
            {cat === "AIF" && (
              <>
                <FilterSelect label="SEBI Category" value={aifCategory} onChange={setAifCategory}
                  options={["All", "Category I", "Category II", "Category III"]} />
                <FilterSelect label="Sub-Strategy" value={aifStrategy} onChange={setAifStrategy}
                  options={["All", ...Array.from(new Set(aifSchemes.map(a => a.subStrategy)))]} />
                <FilterRange label="Min Net IRR" value={aifMinIRR} onChange={setAifMinIRR} min={-5} max={30} step={0.5} suffix="%" />
                <FilterRange label="Vintage from" value={aifVintageFrom} onChange={setAifVintageFrom} min={2018} max={2025} step={1} format={v => String(v)} />
                <div className="text-[10px] text-muted-foreground italic pt-1">SEBI min ticket: ₹1 Crore</div>
              </>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Saved Screens</div>
              {["Top 3Y Equity > 15%", "AAA NBFC FD > 8%", "5★ Term ≤ ₹15K"].map(s => (
                <button key={s} className="w-full text-left px-2 py-1.5 rounded-sm hover:bg-secondary text-[11px] flex items-center gap-2 group">
                  <BookmarkPlus className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />{s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-border bg-surface/50 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[280px] max-w-md">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${cat === "MF" ? "funds, AMCs, categories" : cat === "FD" ? "issuers, schemes" : cat === "INS" ? "policies, insurers" : cat === "PMS" ? "PMS strategies, managers" : "AIF funds, managers"}…`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/70"
              />
            </div>
            <ToolbarSelect icon={<Layers className="w-3 h-3" />} label="Group by" value={groupBy} onChange={setGroupBy} options={groupOptions as [string, string][]} />
            <div className="text-[11px] text-muted-foreground mono-num">
              <span className="text-foreground font-medium">{sorted.length}</span> of {cat === "MF" ? mutualFunds.length : cat === "FD" ? fixedDeposits.length : cat === "INS" ? insurance.length : cat === "PMS" ? pmsSchemes.length : aifSchemes.length} results
            </div>
            <div className="ml-auto flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  <button onClick={() => setSelected(new Set())} className="text-[11px] px-2 py-1.5 rounded-sm border border-border hover:bg-secondary text-muted-foreground">
                    Clear
                  </button>
                  <button
                    onClick={() => setShowCompare(true)}
                    disabled={selected.size < 2}
                    className="text-[11px] px-2.5 py-1.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <TrendingUp className="w-3 h-3" /> Compare ({selected.size})
                  </button>
                </>
              )}
              <button className="text-[11px] px-2.5 py-1.5 rounded-sm border border-border hover:bg-secondary flex items-center gap-1.5">
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border bg-surface/30">
            {stats.map((s, i) => (
              <div key={i} className={`px-6 py-3 ${i !== 0 ? "border-l border-border" : ""}`}>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{s.l}</div>
                <div className="text-lg font-semibold mono-num mt-0.5">{s.v}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {grouped.map(g => (
              <div key={g.key}>
                {groupBy !== "none" && (
                  <div className="sticky left-0 px-6 py-2 bg-secondary/60 border-y border-border text-[11px] uppercase tracking-wider font-semibold flex items-center gap-2">
                    <ChevronDown className="w-3 h-3" /> {g.key}
                    <span className="text-muted-foreground mono-num font-normal">· {g.items.length}</span>
                  </div>
                )}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-surface/60 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="w-8 px-3 py-2"></th>
                      {cat === "MF" && (
                        <>
                          <Th label="Fund" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Category" k="subCategory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="AUM (Cr)" k="aum" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="NAV" k="nav" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="1Y" k="returns1y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="3Y" k="returns3y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="5Y" k="returns5y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Exp" k="expenseRatio" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Sharpe" k="sharpe" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="α" k="alpha" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="β" k="beta" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Risk" k="risk" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Rating" k="rating" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                        </>
                      )}
                      {cat === "FD" && (
                        <>
                          <Th label="Scheme" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Issuer Type" k="subCategory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Tenure (M)" k="tenureMonths" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Rate %" k="interestRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Senior %" k="seniorRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Compounding" k="compounding" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Min ₹" k="minInvestment" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Rating" k="rating" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="DICGC" k="insuredDICGC" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Payout" k="payout" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                        </>
                      )}
                      {cat === "INS" && (
                        <>
                          <Th label="Plan" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Insurer" k="insurer" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Type" k="subCategory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Sum Assured" k="sumAssured" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Premium p.a." k="premiumAnnual" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Term (Y)" k="policyTermYears" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="PPT" k="ppt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Claim %" k="claimSettlement" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Solv." k="solvencyRatio" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="IRR" k="irr" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Rating" k="rating" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                        </>
                      )}
                      {cat === "PMS" && (
                        <>
                          <Th label="Strategy" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Manager" k="manager" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Structure" k="structure" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Category" k="strategy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="AUM (Cr)" k="aum" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="1Y" k="returns1y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="3Y" k="returns3y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="5Y" k="returns5y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="α" k="alpha" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Sharpe" k="sharpe" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Max DD" k="maxDrawdown" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Fixed Fee" k="fixedFee" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Perf Fee" k="performanceFee" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Min ₹" k="minInvestment" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Risk" k="risk" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Rating" k="rating" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                        </>
                      )}
                      {cat === "AIF" && (
                        <>
                          <Th label="Fund" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Manager" k="manager" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="SEBI Cat" k="sebiCategory" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Sub-Strategy" k="subStrategy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Structure" k="structure" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Vintage" k="vintage" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Corpus (Cr)" k="corpusTarget" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Tenure (Y)" k="tenureYears" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Drawdown %" k="drawdownStatus" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Target IRR" k="targetIRR" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Net IRR" k="netIRR" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="MOIC" k="moic" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Hurdle" k="hurdleRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Carry %" k="carry" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Mgmt Fee" k="managementFee" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Domicile" k="domicile" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Rating" k="rating" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((p: any, idx: number) => (
                      <tr key={p.id} className={`border-b border-border/60 hover:bg-secondary/40 transition-colors ${selected.has(p.id) ? "bg-accent/30" : ""}`}>
                        <td className="px-3 py-2.5 text-center">
                          <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="accent-primary cursor-pointer" />
                        </td>
                        {cat === "MF" && <MFRow p={p as MutualFund} idx={idx} />}
                        {cat === "FD" && <FDRow p={p as FixedDeposit} />}
                        {cat === "INS" && <INSRow p={p as Insurance} />}
                      </tr>
                    ))}
                    {g.items.length === 0 && (
                      <tr><td colSpan={20} className="py-12 text-center text-muted-foreground text-xs">No results match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <footer className="px-6 py-4 border-t border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex flex-wrap gap-4 justify-between">
            <span>© 2026 Vantage Research · For internal RM use only</span>
            <span>Data sources: AMFI · RBI · IRDAI · CRISIL · Value Research</span>
            <span>Disclaimer: Past performance is not indicative of future returns.</span>
          </footer>
        </main>
      </div>
      {showCompare && (
        <CompareModal
          cat={cat}
          items={[...mutualFunds, ...fixedDeposits, ...insurance].filter(p => selected.has(p.id))}
          onClose={() => setShowCompare(false)}
          onRemove={(id) => {
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
          }}
        />
      )}
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onSort, align = "right" }: { label: string; k: string; sortKey: string; sortDir: SortDir; onSort: (k: string) => void; align?: "left" | "right" }) {
  const active = sortKey === k;
  return (
    <th className={`px-3 py-2 font-medium text-[10px] uppercase tracking-wider whitespace-nowrap ${align === "left" ? "text-left" : "text-right"}`}>
      <button onClick={() => onSort(k)} className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground" : ""}`}>
        {label}
        {active ? (sortDir === "asc" ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />) : <ArrowUpDown className="w-2.5 h-2.5 opacity-40" />}
      </button>
    </th>
  );
}

function MFRow({ p, idx }: { p: MutualFund; idx: number }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px]">{p.name}</div>
        <div className="text-[10px] text-muted-foreground mono-num">{p.id} · {p.amc} · Bench: {p.benchmark}</div>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-mf" />{p.subCategory}
        </span>
        <div className="text-[10px] text-muted-foreground mt-0.5">{p.assetClass}</div>
      </td>
      <td className="px-3 py-2.5 text-right mono-num">{p.aum.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.nav.toFixed(2)}</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${pctClass(p.returns1y)}`}>{p.returns1y > 0 ? "+" : ""}{p.returns1y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${pctClass(p.returns3y)}`}>{p.returns3y > 0 ? "+" : ""}{p.returns3y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.returns5y)}`}>{p.returns5y > 0 ? "+" : ""}{p.returns5y.toFixed(2)}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.expenseRatio.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.sharpe.toFixed(2)}</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.alpha)}`}>{p.alpha.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.beta.toFixed(2)}</td>
      <td className="px-3 py-2.5"><RiskPill r={p.risk} /></td>
      <td className="px-3 py-2.5"><Stars n={p.rating} /></td>
    </>
  );
}

function FDRow({ p }: { p: FixedDeposit }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px]">{p.name}</div>
        <div className="text-[10px] text-muted-foreground mono-num">{p.id} · {p.issuer}</div>
      </td>
      <td className="px-3 py-2.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-fd" />{p.subCategory}</span>
      </td>
      <td className="px-3 py-2.5 text-right mono-num">{p.tenureMonths}</td>
      <td className="px-3 py-2.5 text-right mono-num font-semibold text-fd">{p.interestRate.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num text-positive">{p.seniorRate.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-[11px]">{p.compounding}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.minInvestment.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 rounded-sm bg-secondary text-[10px] font-medium mono-num">{p.rating}</span></td>
      <td className="px-3 py-2.5 text-[11px]">{p.insuredDICGC ? <span className="text-positive">✓ Yes</span> : <span className="text-muted-foreground">No</span>}</td>
      <td className="px-3 py-2.5 text-[11px]">{p.payout}</td>
    </>
  );
}

function INSRow({ p }: { p: Insurance }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px]">{p.name}</div>
        <div className="text-[10px] text-muted-foreground mono-num">{p.id} · Riders: {p.riders.join(", ")}</div>
      </td>
      <td className="px-3 py-2.5 text-[11px]">{p.insurer}</td>
      <td className="px-3 py-2.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-ins" />{p.subCategory}</span>
      </td>
      <td className="px-3 py-2.5 text-right mono-num">{fmtINR(p.sumAssured)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{fmtINR(p.premiumAnnual)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.policyTermYears}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.ppt}</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${p.claimSettlement >= 98 ? "text-positive" : ""}`}>{p.claimSettlement.toFixed(2)}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.solvencyRatio.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.irr ? `${p.irr.toFixed(2)}%` : "—"}</td>
      <td className="px-3 py-2.5"><Stars n={p.rating} /></td>
    </>
  );
}

function RiskPill({ r }: { r: string }) {
  const tone = r === "Low" || r === "Low-Mod" ? "bg-positive/15 text-positive"
    : r === "Moderate" ? "bg-info/15 text-info"
    : r === "Mod-High" ? "bg-warning/20 text-warning"
    : "bg-negative/15 text-negative";
  return <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-medium ${tone}`}>{r}</span>;
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < n ? "fill-warning text-warning" : "text-border"}`} />
      ))}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, formatLabel }: { label: string; value: string; onChange: (v: string) => void; options: string[]; formatLabel?: (v: string) => string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}</div>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className="w-full appearance-none bg-background border border-border rounded-sm px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring pr-7">
          {options.map(o => <option key={o} value={o}>{formatLabel ? formatLabel(o) : o}</option>)}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
      </div>
    </div>
  );
}

function FilterRange({ label, value, onChange, min, max, step, suffix = "", format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; suffix?: string; format?: (v: number) => string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
        <div className="text-[11px] mono-num font-medium">{format ? format(value) : `${value}${suffix}`}</div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function FilterToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full flex items-center justify-between text-[11px] py-1 group">
      <span className="text-foreground">{label}</span>
      <span className={`w-8 h-4 rounded-full relative transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-background transition-all ${value ? "left-4" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function ToolbarSelect({ icon, label, value, onChange, options }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-muted-foreground flex items-center gap-1">{icon}{label}:</span>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className="appearance-none bg-background border border-border rounded-sm pl-2 pr-6 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring">
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
      </div>
    </div>
  );
}

type AnyProduct = MutualFund | FixedDeposit | Insurance;

function CompareModal({ cat, items, onClose, onRemove }: { cat: Category; items: AnyProduct[]; onClose: () => void; onRemove: (id: string) => void }) {
  // Filter to current category only to keep comparison apples-to-apples
  const products = items.filter(p => p.category === cat);

  const metrics = cat === "MF"
    ? [
        { k: "amc", label: "AMC", type: "text" as const },
        { k: "subCategory", label: "Sub-Category", type: "text" as const },
        { k: "assetClass", label: "Asset Class", type: "text" as const },
        { k: "benchmark", label: "Benchmark", type: "text" as const },
        { k: "nav", label: "NAV (₹)", type: "num" as const, dp: 2 },
        { k: "aum", label: "AUM (₹ Cr)", type: "num" as const, dp: 0, best: "high" as const },
        { k: "expenseRatio", label: "Expense Ratio (%)", type: "num" as const, dp: 2, best: "low" as const },
        { k: "returns1y", label: "1Y Return (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "returns3y", label: "3Y Return (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "returns5y", label: "5Y Return (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "sharpe", label: "Sharpe Ratio", type: "num" as const, dp: 2, best: "high" as const },
        { k: "alpha", label: "Alpha", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "beta", label: "Beta", type: "num" as const, dp: 2 },
        { k: "risk", label: "Risk Level", type: "text" as const },
        { k: "rating", label: "Rating", type: "stars" as const, best: "high" as const },
        { k: "minInvestment", label: "Min Investment (₹)", type: "inr" as const, best: "low" as const },
        { k: "exitLoad", label: "Exit Load", type: "text" as const },
      ]
    : cat === "FD"
    ? [
        { k: "issuer", label: "Issuer", type: "text" as const },
        { k: "subCategory", label: "Issuer Type", type: "text" as const },
        { k: "tenureMonths", label: "Tenure (months)", type: "num" as const, dp: 0 },
        { k: "interestRate", label: "Interest Rate (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "seniorRate", label: "Senior Rate (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "compounding", label: "Compounding", type: "text" as const },
        { k: "minInvestment", label: "Min Investment (₹)", type: "inr" as const, best: "low" as const },
        { k: "rating", label: "Credit Rating", type: "text" as const },
        { k: "insuredDICGC", label: "DICGC Insured", type: "bool" as const },
        { k: "premature", label: "Premature Withdrawal", type: "bool" as const },
        { k: "payout", label: "Payout", type: "text" as const },
      ]
    : [
        { k: "insurer", label: "Insurer", type: "text" as const },
        { k: "subCategory", label: "Product Type", type: "text" as const },
        { k: "sumAssured", label: "Sum Assured (₹)", type: "inr" as const, best: "high" as const },
        { k: "premiumAnnual", label: "Premium p.a. (₹)", type: "inr" as const, best: "low" as const },
        { k: "policyTermYears", label: "Policy Term (Y)", type: "num" as const, dp: 0 },
        { k: "ppt", label: "PPT (Y)", type: "num" as const, dp: 0 },
        { k: "claimSettlement", label: "Claim Settlement (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "solvencyRatio", label: "Solvency Ratio", type: "num" as const, dp: 2, best: "high" as const },
        { k: "irr", label: "IRR (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "rating", label: "Rating", type: "stars" as const, best: "high" as const },
        { k: "taxBenefit", label: "Tax Benefit", type: "text" as const },
        { k: "riders", label: "Riders", type: "list" as const },
      ];

  const bestIdxFor = (key: string, best: "high" | "low" | undefined): number | null => {
    if (!best) return null;
    const vals = products.map(p => (p as any)[key]).map(v => (typeof v === "number" ? v : null));
    if (vals.some(v => v === null)) return null;
    const target = best === "high" ? Math.max(...(vals as number[])) : Math.min(...(vals as number[]));
    return (vals as number[]).indexOf(target);
  };

  const formatCell = (m: any, val: any) => {
    if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>;
    switch (m.type) {
      case "num": return <span className="mono-num">{Number(val).toFixed(m.dp ?? 2)}</span>;
      case "pct": return <span className={`mono-num font-medium ${val >= 0 ? "text-positive" : "text-negative"}`}>{val > 0 ? "+" : ""}{Number(val).toFixed(m.dp ?? 2)}%</span>;
      case "inr": return <span className="mono-num">{fmtINR(Number(val))}</span>;
      case "bool": return val ? <span className="text-positive">✓ Yes</span> : <span className="text-muted-foreground">No</span>;
      case "stars": return <Stars n={Number(val)} />;
      case "list": return <span className="text-[11px]">{Array.isArray(val) ? val.join(", ") : String(val)}</span>;
      default: return <span>{String(val)}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-surface border border-border rounded-sm shadow-2xl w-full max-w-7xl my-8" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface z-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Side-by-side Comparison</div>
            <h2 className="text-lg font-semibold tracking-tight">{cat === "MF" ? "Mutual Funds" : cat === "FD" ? "Fixed Deposits" : "Insurance Plans"} · {products.length} selected</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        {products.length < 2 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">Select at least 2 products from the same category to compare.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-surface/60">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground w-48 sticky left-0 bg-surface/60">Metric</th>
                  {products.map(p => (
                    <th key={p.id} className="text-left px-4 py-3 min-w-[200px] align-top">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[13px] leading-tight">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground mono-num mt-0.5">{p.id}</div>
                        </div>
                        <button onClick={() => onRemove(p.id)} className="text-muted-foreground hover:text-foreground p-0.5"><X className="w-3 h-3" /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => {
                  const bestIdx = bestIdxFor(m.k, (m as any).best);
                  return (
                    <tr key={m.k} className={`border-b border-border/60 ${i % 2 ? "bg-surface/30" : ""}`}>
                      <td className="px-4 py-2.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium sticky left-0 bg-inherit">{m.label}</td>
                      {products.map((p, idx) => (
                        <td key={p.id} className={`px-4 py-2.5 ${bestIdx === idx ? "bg-positive/10" : ""}`}>
                          <div className="flex items-center gap-1.5">
                            {formatCell(m, (p as any)[m.k])}
                            {bestIdx === idx && <Trophy className="w-3 h-3 text-positive" />}
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-border flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span><Trophy className="w-3 h-3 inline mr-1 text-positive" /> Best value highlighted per metric</span>
          <button onClick={onClose} className="px-3 py-1.5 rounded-sm border border-border hover:bg-secondary text-foreground normal-case tracking-normal text-[11px]">Close</button>
        </div>
      </div>
    </div>
  );
}
