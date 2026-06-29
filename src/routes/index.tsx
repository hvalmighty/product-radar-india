import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { mutualFunds, fixedDeposits, insurance, pmsSchemes, aifSchemes, equityStocks, bonds, type MutualFund, type FixedDeposit, type Insurance, type PMS, type AIF, type EquityStock, type Bond, type Category } from "@/lib/research-data";
import { getTopBarIndices } from "@/lib/market-data.functions";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, SlidersHorizontal, Star, TrendingUp, Layers, Filter, Download, BookmarkPlus, ChevronDown, Activity, X, Trophy, ShoppingCart, CheckCircle2, AlertTriangle, Building2, Network, Globe, Wallet } from "lucide-react";
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
  { key: "EQ", label: "Equity", count: equityStocks.length, tone: "text-eq" },
  { key: "BOND", label: "Fixed Income", count: bonds.length, tone: "text-bond" },
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

function TopBarTicker() {
  const q = useQuery({
    queryKey: ["topbar-indices"],
    queryFn: () => getTopBarIndices(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const data = q.data ?? [];
  const fmt = (n: number) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className="hidden lg:flex items-center gap-2 text-[11px] text-muted-foreground mono-num">
      {q.isLoading && !data.length ? (
        <span className="opacity-60">Loading indices…</span>
      ) : data.length === 0 ? (
        <span className="opacity-60">Indices unavailable</span>
      ) : (
        data.map((d, i) => (
          <span key={d.symbol} className="flex items-center gap-1">
            {i === 0 && <Activity className={`w-3 h-3 ${d.changePct >= 0 ? "text-positive" : "text-negative"}`} />}
            {i > 0 && <span className="opacity-40 mr-1">|</span>}
            {d.label} {fmt(d.price)}{" "}
            <span className={d.changePct >= 0 ? "text-positive" : "text-negative"}>
              {d.changePct >= 0 ? "+" : ""}{d.changePct.toFixed(2)}%
            </span>
          </span>
        ))
      )}
    </div>
  );
}

function ResearchTerminal() {
  const [cat, setCat] = useState<Category>("MF");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<string>("returns3y");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [groupBy, setGroupBy] = useState<string>("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);
  const [showOrder, setShowOrder] = useState(false);

  // category-specific filters
  const [mfSub, setMfSub] = useState<string>("All");
  const [mfRiskMax, setMfRiskMax] = useState<number>(6);
  const [mfMinReturn, setMfMinReturn] = useState<number>(0);
  const [mfMaxExpense, setMfMaxExpense] = useState<number>(2.5);
  const [mfAssetClass, setMfAssetClass] = useState<string>("All");
  const [mfAmc, setMfAmc] = useState<string>("All");
  const [mfMinSharpe, setMfMinSharpe] = useState<number>(0);
  const [mfMinRating, setMfMinRating] = useState<number>(1);
  const [mfMaxDrawdown, setMfMaxDrawdown] = useState<number>(50); // allow up to -50%
  const [mfMinAge, setMfMinAge] = useState<number>(0);
  const [mfMinAum, setMfMinAum] = useState<number>(0); // ₹ Cr
  const [mfBeatsBench, setMfBeatsBench] = useState<boolean>(false);
  const [mfElssOnly, setMfElssOnly] = useState<boolean>(false);
  const [mfPositive5y, setMfPositive5y] = useState<boolean>(false);
  const [mfPreset, setMfPreset] = useState<string>("");


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

  // Equity filters
  const [eqMarketCap, setEqMarketCap] = useState<string>("All");
  const [eqSector, setEqSector] = useState<string>("All");
  const [eqMinCagr, setEqMinCagr] = useState<number>(0);
  const [eqMaxPe, setEqMaxPe] = useState<number>(90);

  // Bond filters
  const [bondType, setBondType] = useState<string>("All");
  const [bondRating, setBondRating] = useState<string>("All");
  const [bondMinYtm, setBondMinYtm] = useState<number>(6);
  const [bondMaxTenor, setBondMaxTenor] = useState<number>(40);
  const [bondTaxFree, setBondTaxFree] = useState<boolean>(false);

  const currentYear = new Date().getFullYear();

  const data = useMemo(() => {
    if (cat === "MF") {
      return mutualFunds.filter(p => {
        if (mfSub !== "All" && p.subCategory !== mfSub) return false;
        if (mfAssetClass !== "All" && p.assetClass !== mfAssetClass) return false;
        if (mfAmc !== "All" && p.amc !== mfAmc) return false;
        if (p.returns3y < mfMinReturn) return false;
        if (p.expenseRatio > mfMaxExpense) return false;
        if (p.sharpe < mfMinSharpe) return false;
        if (p.rating < mfMinRating) return false;
        if (p.aum < mfMinAum) return false;
        if (Math.abs(p.maxDrawdown) > mfMaxDrawdown) return false;
        if ((currentYear - p.inceptionYear) < mfMinAge) return false;
        if (mfBeatsBench && p.alpha <= 0) return false;
        if (mfElssOnly && p.lockInYears < 3) return false;
        if (mfPositive5y && p.returns5y <= 0) return false;
        const riskOrder = ["Low", "Low-Mod", "Moderate", "Mod-High", "High", "Very High"];
        if (riskOrder.indexOf(p.risk) + 1 > mfRiskMax) return false;
        if (query && !`${p.name} ${p.amc} ${p.subCategory} ${p.fundManager}`.toLowerCase().includes(query.toLowerCase())) return false;
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
    if (cat === "AIF") {
      return aifSchemes.filter(p => {
        if (aifCategory !== "All" && p.sebiCategory !== aifCategory) return false;
        if (aifStrategy !== "All" && p.subStrategy !== aifStrategy) return false;
        if (p.netIRR < aifMinIRR) return false;
        if (p.vintage < aifVintageFrom) return false;
        if (query && !`${p.name} ${p.manager} ${p.subStrategy} ${p.sebiCategory}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      });
    }
    if (cat === "EQ") {
      return equityStocks.filter(p => {
        if (eqMarketCap !== "All" && p.marketCap !== eqMarketCap) return false;
        if (eqSector !== "All" && p.sector !== eqSector) return false;
        if (p.cagr3y < eqMinCagr) return false;
        if (p.pe > eqMaxPe) return false;
        if (query && !`${p.name} ${p.ticker} ${p.sector}`.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      });
    }
    return bonds.filter(p => {
      if (bondType !== "All" && p.bondType !== bondType) return false;
      if (bondRating !== "All" && p.rating !== bondRating) return false;
      if (p.ytm < bondMinYtm) return false;
      if (p.residualTenorYears > bondMaxTenor) return false;
      if (bondTaxFree && p.taxable) return false;
      if (query && !`${p.name} ${p.issuer} ${p.bondType} ${p.rating}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [cat, query, currentYear, mfSub, mfRiskMax, mfMinReturn, mfMaxExpense, mfAssetClass, mfAmc, mfMinSharpe, mfMinRating, mfMinAge, mfMinAum, mfMaxDrawdown, mfBeatsBench, mfElssOnly, mfPositive5y, fdIssuer, fdMinRate, fdTenure, fdSenior, fdInsured, insSub, insMinClaim, insMinRating, pmsStrategy, pmsStructure, pmsMinReturn, pmsMaxFee, aifCategory, aifStrategy, aifMinIRR, aifVintageFrom, eqMarketCap, eqSector, eqMinCagr, eqMaxPe, bondType, bondRating, bondMinYtm, bondMaxTenor, bondTaxFree]);

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
          : cat === "AIF"
            ? [["none", "No Grouping"], ["manager", "Manager"], ["sebiCategory", "SEBI Category"], ["subStrategy", "Sub-Strategy"], ["vintage", "Vintage"], ["domicile", "Domicile"]]
            : cat === "EQ"
              ? [["none", "No Grouping"], ["sector", "Sector"], ["marketCap", "Market Cap"], ["risk", "Risk"]]
              : [["none", "No Grouping"], ["issuer", "Issuer"], ["bondType", "Bond Type"], ["rating", "Credit Rating"], ["payout", "Payout"]];

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
    if (cat === "AIF") {
      const a = sorted as AIF[];
      return [
        { l: "Funds", v: a.length },
        { l: "Avg Net IRR", v: a.length ? `${(a.reduce((s, x) => s + x.netIRR, 0) / a.length).toFixed(2)}%` : "—" },
        { l: "Total Corpus", v: a.length ? fmtINR(a.reduce((s, x) => s + x.corpusTarget, 0) * 1e7) : "—" },
        { l: "Cat-III Funds", v: a.filter(x => x.sebiCategory === "Category III").length },
      ];
    }
    if (cat === "EQ") {
      const a = sorted as EquityStock[];
      return [
        { l: "Stocks", v: a.length },
        { l: "Avg 3Y CAGR", v: a.length ? `${(a.reduce((s, x) => s + x.cagr3y, 0) / a.length).toFixed(2)}%` : "—" },
        { l: "Avg P/E", v: a.length ? (a.reduce((s, x) => s + x.pe, 0) / a.length).toFixed(1) : "—" },
        { l: "Large Cap", v: `${a.filter(x => x.marketCap === "Large Cap").length}/${a.length}` },
      ];
    }
    const a = sorted as Bond[];
    return [
      { l: "Securities", v: a.length },
      { l: "Best YTM", v: a.length ? `${Math.max(...a.map(x => x.ytm)).toFixed(2)}%` : "—" },
      { l: "Avg YTM", v: a.length ? `${(a.reduce((s, x) => s + x.ytm, 0) / a.length).toFixed(2)}%` : "—" },
      { l: "Tax-Free", v: a.filter(x => !x.taxable).length },
    ];
  }, [sorted, cat]);

  return (
    <div className="min-h-screen text-foreground">
      {/* Top Bar */}
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="pl-12 pr-6 py-3 flex items-center gap-6">
          <div>
            <h1 className="text-sm font-semibold leading-tight tracking-tight">Screener</h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-tight">RM Intelligence Terminal · IN</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <TopBarTicker />
            <div className="text-[11px] text-muted-foreground border-l border-border pl-3">RM · A. Mehta</div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-6 flex items-end gap-1 border-t border-border/60">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => {
                setCat(c.key);
                const def: Record<Category, string> = { MF: "returns3y", FD: "interestRate", INS: "claimSettlement", PMS: "returns3y", AIF: "netIRR", EQ: "cagr3y", BOND: "ytm" };
                setSortKey(def[c.key]); setGroupBy("none"); setSelected(new Set());
              }}
              className={`px-4 py-2.5 text-xs font-medium tracking-wide border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                cat === c.key
                  ? `border-foreground text-foreground ${c.tone}`
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${c.key === "MF" ? "bg-mf" : c.key === "FD" ? "bg-fd" : c.key === "INS" ? "bg-ins" : c.key === "PMS" ? "bg-pms" : c.key === "AIF" ? "bg-aif" : c.key === "EQ" ? "bg-eq" : "bg-bond"}`} />
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
            <button
              onClick={() => {
                if (cat === "MF") {
                  setMfSub("All"); setMfAssetClass("All"); setMfAmc("All");
                  setMfRiskMax(6); setMfMinReturn(0); setMfMaxExpense(2.5);
                  setMfMinSharpe(0); setMfMinRating(1); setMfMaxDrawdown(50);
                  setMfMinAge(0); setMfMinAum(0);
                  setMfBeatsBench(false); setMfElssOnly(false); setMfPositive5y(false);
                  setMfPreset("");
                } else if (cat === "FD") {
                  setFdIssuer("All"); setFdTenure("All"); setFdMinRate(6); setFdSenior(false); setFdInsured(false);
                } else if (cat === "INS") {
                  setInsSub("All"); setInsMinClaim(94); setInsMinRating(1);
                } else if (cat === "PMS") {
                  setPmsStrategy("All"); setPmsStructure("All"); setPmsMinReturn(0); setPmsMaxFee(2.5);
                } else if (cat === "AIF") {
                  setAifCategory("All"); setAifStrategy("All"); setAifMinIRR(0); setAifVintageFrom(2018);
                } else if (cat === "EQ") {
                  setEqMarketCap("All"); setEqSector("All"); setEqMinCagr(0); setEqMaxPe(90);
                } else if (cat === "BOND") {
                  setBondType("All"); setBondRating("All"); setBondMinYtm(6); setBondMaxTenor(40); setBondTaxFree(false);
                }
                setQuery("");
              }}
              className="text-[10px] uppercase text-muted-foreground hover:text-foreground tracking-wider"
            >
              Reset
            </button>
          </div>

          <div className="p-4 space-y-5 text-xs">
            {cat === "MF" && (
              <>
                {/* Quick presets */}
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Quick Screens</div>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      ["top5",  "5★ Only"],
                      ["lowexp","Low Cost <1%"],
                      ["alpha", "Beats Bench"],
                      ["elss",  "ELSS Tax Saver"],
                      ["growth","High Growth 3Y>20%"],
                      ["safe",  "Low DD <15%"],
                      ["large", "Mega AUM >₹25k Cr"],
                    ] as [string, string][]).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => {
                          // start from a clean slate then apply preset
                          setMfSub("All"); setMfAssetClass("All"); setMfAmc("All");
                          setMfRiskMax(6); setMfMinReturn(0); setMfMaxExpense(2.5);
                          setMfMinSharpe(0); setMfMinRating(1); setMfMaxDrawdown(50);
                          setMfMinAge(0); setMfMinAum(0);
                          setMfBeatsBench(false); setMfElssOnly(false); setMfPositive5y(false);
                          if (k === "top5") setMfMinRating(5);
                          if (k === "lowexp") setMfMaxExpense(1);
                          if (k === "alpha") setMfBeatsBench(true);
                          if (k === "elss") { setMfElssOnly(true); setMfSub("ELSS"); }
                          if (k === "growth") { setMfMinReturn(20); setMfAssetClass("Equity"); }
                          if (k === "safe") setMfMaxDrawdown(15);
                          if (k === "large") setMfMinAum(25000);
                          setMfPreset(k);
                        }}
                        className={`text-[10px] px-2 py-1 rounded-sm border transition-colors ${mfPreset === k ? "border-foreground bg-secondary text-foreground" : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <FilterSelect label="Sub-Category" value={mfSub} onChange={setMfSub}
                  options={["All", ...Array.from(new Set(mutualFunds.map(m => m.subCategory)))]} />
                <FilterSelect label="Asset Class" value={mfAssetClass} onChange={setMfAssetClass}
                  options={["All", "Equity", "Debt", "Hybrid"]} />
                <FilterSelect label="AMC" value={mfAmc} onChange={setMfAmc}
                  options={["All", ...Array.from(new Set(mutualFunds.map(m => m.amc))).sort()]} />
                <FilterRange label="Min 3Y Return" value={mfMinReturn} onChange={setMfMinReturn} min={-5} max={25} step={0.5} suffix="%" />
                <FilterRange label="Max Expense Ratio" value={mfMaxExpense} onChange={setMfMaxExpense} min={0.1} max={2.5} step={0.05} suffix="%" />
                <FilterRange label="Min Sharpe" value={mfMinSharpe} onChange={setMfMinSharpe} min={0} max={2} step={0.05} format={v => v.toFixed(2)} />
                <FilterRange label="Min Rating" value={mfMinRating} onChange={setMfMinRating} min={1} max={5} step={1} format={v => `${v}★ & above`} />
                <FilterRange label="Max Drawdown" value={mfMaxDrawdown} onChange={setMfMaxDrawdown} min={5} max={50} step={1} format={v => `-${v}% max`} />
                <FilterRange label="Min Fund Age" value={mfMinAge} onChange={setMfMinAge} min={0} max={20} step={1} format={v => v === 0 ? "Any" : `${v}Y+`} />
                <FilterRange label="Min AUM (₹ Cr)" value={mfMinAum} onChange={setMfMinAum} min={0} max={50000} step={500} format={v => v === 0 ? "Any" : v.toLocaleString("en-IN")} />
                <FilterRange label="Risk Ceiling" value={mfRiskMax} onChange={setMfRiskMax} min={1} max={6} step={1}
                  format={v => ["Low", "Low-Mod", "Moderate", "Mod-High", "High", "Very High"][v - 1]} />
                <FilterToggle label="Beats Benchmark (α>0)" value={mfBeatsBench} onChange={setMfBeatsBench} />
                <FilterToggle label="Positive 5Y Returns" value={mfPositive5y} onChange={setMfPositive5y} />
                <FilterToggle label="ELSS / Tax Saver Only" value={mfElssOnly} onChange={setMfElssOnly} />
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
            {cat === "EQ" && (
              <>
                <FilterSelect label="Market Cap" value={eqMarketCap} onChange={setEqMarketCap}
                  options={["All", "Large Cap", "Mid Cap", "Small Cap"]} />
                <FilterSelect label="Sector" value={eqSector} onChange={setEqSector}
                  options={["All", ...Array.from(new Set(equityStocks.map(s => s.sector))).sort()]} />
                <FilterRange label="Min 3Y CAGR" value={eqMinCagr} onChange={setEqMinCagr} min={-10} max={40} step={1} suffix="%" />
                <FilterRange label="Max P/E" value={eqMaxPe} onChange={setEqMaxPe} min={10} max={100} step={1} format={v => v >= 100 ? "Any" : `${v}x`} />
                <div className="text-[10px] text-muted-foreground italic pt-1">Universe: Nifty 500 top constituents</div>
              </>
            )}
            {cat === "BOND" && (
              <>
                <FilterSelect label="Bond Type" value={bondType} onChange={setBondType}
                  options={["All", "G-Sec", "State Dev Loan", "PSU Bond", "Corporate Bond", "Tax-Free Bond", "NCD", "Perpetual / AT1", "Covered Bond", "Zero Coupon"]} />
                <FilterSelect label="Credit Rating" value={bondRating} onChange={setBondRating}
                  options={["All", "Sovereign", "AAA", "AA+", "AA", "A+", "A"]} />
                <FilterRange label="Min YTM" value={bondMinYtm} onChange={setBondMinYtm} min={5} max={12} step={0.1} suffix="%" />
                <FilterRange label="Max Tenor" value={bondMaxTenor} onChange={setBondMaxTenor} min={1} max={40} step={1} format={v => `${v}Y`} />
                <FilterToggle label="Tax-Free Only" value={bondTaxFree} onChange={setBondTaxFree} />
              </>
            )}


            {cat === "MF" && (
              <SavedScreens
                cat="MF"
                snapshot={() => ({ mfSub, mfAssetClass, mfAmc, mfRiskMax, mfMinReturn, mfMaxExpense, mfMinSharpe, mfMinRating, mfMaxDrawdown, mfMinAge, mfMinAum, mfBeatsBench, mfElssOnly, mfPositive5y })}
                apply={(s: any) => {
                  setMfSub(s.mfSub ?? "All"); setMfAssetClass(s.mfAssetClass ?? "All"); setMfAmc(s.mfAmc ?? "All");
                  setMfRiskMax(s.mfRiskMax ?? 6); setMfMinReturn(s.mfMinReturn ?? 0); setMfMaxExpense(s.mfMaxExpense ?? 2.5);
                  setMfMinSharpe(s.mfMinSharpe ?? 0); setMfMinRating(s.mfMinRating ?? 1); setMfMaxDrawdown(s.mfMaxDrawdown ?? 50);
                  setMfMinAge(s.mfMinAge ?? 0); setMfMinAum(s.mfMinAum ?? 0);
                  setMfBeatsBench(!!s.mfBeatsBench); setMfElssOnly(!!s.mfElssOnly); setMfPositive5y(!!s.mfPositive5y);
                  setMfPreset("");
                }}
              />
            )}
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
                placeholder={`Search ${cat === "MF" ? "funds, AMCs, categories" : cat === "FD" ? "issuers, schemes" : cat === "INS" ? "policies, insurers" : cat === "PMS" ? "PMS strategies, managers" : cat === "AIF" ? "AIF funds, managers" : cat === "EQ" ? "tickers, companies, sectors" : "issuers, bonds, NCDs"}…`}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-sm focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/70"
              />
            </div>
            <ToolbarSelect icon={<Layers className="w-3 h-3" />} label="Group by" value={groupBy} onChange={setGroupBy} options={groupOptions as [string, string][]} />
            <div className="text-[11px] text-muted-foreground mono-num">
              <span className="text-foreground font-medium">{sorted.length}</span> of {cat === "MF" ? mutualFunds.length : cat === "FD" ? fixedDeposits.length : cat === "INS" ? insurance.length : cat === "PMS" ? pmsSchemes.length : cat === "AIF" ? aifSchemes.length : cat === "EQ" ? equityStocks.length : bonds.length} results
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
                    className="text-[11px] px-2.5 py-1.5 rounded-sm border border-border hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <TrendingUp className="w-3 h-3" /> Compare ({selected.size})
                  </button>
                  <button
                    onClick={() => setShowOrder(true)}
                    className="text-[11px] px-2.5 py-1.5 rounded-sm bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
                  >
                    <ShoppingCart className="w-3 h-3" /> Place Order ({selected.size})
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
                          <Th label="Manager" k="fundManager" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="AUM (Cr)" k="aum" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="NAV" k="nav" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="YTD" k="ytdReturn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="1Y" k="returns1y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="3Y" k="returns3y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="5Y" k="returns5y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Exp" k="expenseRatio" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Sharpe" k="sharpe" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Sortino" k="sortino" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="α" k="alpha" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="β" k="beta" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Max DD" k="maxDrawdown" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Age" k="inceptionYear" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
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
                      {cat === "EQ" && (
                        <>
                          <Th label="Stock" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Sector" k="sector" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Cap" k="marketCap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="LTP" k="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="P/E" k="pe" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="P/B" k="pb" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Div Y%" k="dividendYield" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="ROE %" k="roe" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="β" k="beta" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="3Y CAGR" k="cagr3y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="5Y CAGR" k="cagr5y" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Exp Rtn" k="expectedReturn" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Risk" k="risk" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                        </>
                      )}
                      {cat === "BOND" && (
                        <>
                          <Th label="Security" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Issuer" k="issuer" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Type" k="bondType" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Rating" k="rating" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Coupon %" k="couponRate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="YTM %" k="ytm" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Tenor (Y)" k="residualTenorYears" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Face ₹" k="faceValue" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Min ₹" k="minInvestment" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                          <Th label="Payout" k="payout" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Taxable" k="taxable" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
                          <Th label="Risk" k="risk" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" />
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
                        {cat === "PMS" && <PMSRow p={p as PMS} />}
                        {cat === "AIF" && <AIFRow p={p as AIF} />}
                        {cat === "EQ" && <EQRow p={p as EquityStock} />}
                        {cat === "BOND" && <BONDRow p={p as Bond} />}
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
          items={[...mutualFunds, ...fixedDeposits, ...insurance, ...pmsSchemes, ...aifSchemes, ...equityStocks, ...bonds].filter(p => selected.has(p.id))}
          onClose={() => setShowCompare(false)}
          onRemove={(id) => {
            setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
          }}
        />
      )}
      {showOrder && (
        <OrderModal
          cat={cat}
          items={[...mutualFunds, ...fixedDeposits, ...insurance, ...pmsSchemes, ...aifSchemes, ...equityStocks, ...bonds].filter(p => selected.has(p.id))}
          onClose={() => setShowOrder(false)}
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
  const age = new Date().getFullYear() - p.inceptionYear;
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px] flex items-center gap-1.5">
          {p.name}
          {p.lockInYears > 0 && <span className="text-[9px] px-1 py-px rounded-sm bg-info/15 text-info uppercase tracking-wider">ELSS</span>}
        </div>
        <div className="text-[10px] text-muted-foreground mono-num">{p.id} · {p.amc} · Bench: {p.benchmark} · SIP ₹{p.sipMin}</div>
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-mf" />{p.subCategory}
        </span>
        <div className="text-[10px] text-muted-foreground mt-0.5">{p.assetClass} · Tax: {p.taxation}</div>
      </td>
      <td className="px-3 py-2.5 text-[11px] whitespace-nowrap">{p.fundManager}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.aum.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.nav.toFixed(2)}</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.ytdReturn)}`}>{p.ytdReturn > 0 ? "+" : ""}{p.ytdReturn.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${pctClass(p.returns1y)}`}>{p.returns1y > 0 ? "+" : ""}{p.returns1y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${pctClass(p.returns3y)}`}>{p.returns3y > 0 ? "+" : ""}{p.returns3y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.returns5y)}`}>{p.returns5y > 0 ? "+" : ""}{p.returns5y.toFixed(2)}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.expenseRatio.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.sharpe.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.sortino.toFixed(2)}</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.alpha)}`}>{p.alpha.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.beta.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num text-negative">{p.maxDrawdown.toFixed(1)}%</td>
      <td className="px-3 py-2.5 text-right mono-num text-[11px]">{age}Y</td>
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

function PMSRow({ p }: { p: PMS }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px]">{p.name}</div>
        <div className="text-[10px] text-muted-foreground mono-num">{p.id} · Bench: {p.benchmark} · Since {p.inception}</div>
      </td>
      <td className="px-3 py-2.5 text-[11px]">{p.manager}</td>
      <td className="px-3 py-2.5 text-[11px]">{p.structure}</td>
      <td className="px-3 py-2.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-pms" />{p.strategy}</span>
      </td>
      <td className="px-3 py-2.5 text-right mono-num">{p.aum.toLocaleString("en-IN")}</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.returns1y)}`}>{p.returns1y > 0 ? "+" : ""}{p.returns1y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${pctClass(p.returns3y)}`}>{p.returns3y > 0 ? "+" : ""}{p.returns3y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.returns5y)}`}>{p.returns5y > 0 ? "+" : ""}{p.returns5y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.alpha)}`}>{p.alpha.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.sharpe.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num text-negative">{p.maxDrawdown.toFixed(1)}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.fixedFee.toFixed(2)}%</td>
      <td className="px-3 py-2.5 text-[11px]">{p.performanceFee}</td>
      <td className="px-3 py-2.5 text-right mono-num">{fmtINR(p.minInvestment)}</td>
      <td className="px-3 py-2.5"><RiskPill r={p.risk} /></td>
      <td className="px-3 py-2.5"><Stars n={p.rating} /></td>
    </>
  );
}

function AIFRow({ p }: { p: AIF }) {
  const catTone = p.sebiCategory === "Category I" ? "bg-info/15 text-info"
    : p.sebiCategory === "Category II" ? "bg-warning/20 text-warning"
    : "bg-negative/15 text-negative";
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px]">{p.name}</div>
        <div className="text-[10px] text-muted-foreground mono-num">{p.id} · Commit ₹{p.commitments.toLocaleString("en-IN")} Cr / ₹{p.corpusTarget.toLocaleString("en-IN")} Cr</div>
      </td>
      <td className="px-3 py-2.5 text-[11px]">{p.manager}</td>
      <td className="px-3 py-2.5">
        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-medium ${catTone}`}>{p.sebiCategory}</span>
      </td>
      <td className="px-3 py-2.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-aif" />{p.subStrategy}</span>
      </td>
      <td className="px-3 py-2.5 text-[11px]">{p.structure}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.vintage}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.corpusTarget.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.tenureYears}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.drawdownStatus}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.targetIRR.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${pctClass(p.netIRR)}`}>{p.netIRR > 0 ? "+" : ""}{p.netIRR.toFixed(2)}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.moic.toFixed(2)}x</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.hurdleRate.toFixed(1)}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.carry}%</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.managementFee.toFixed(2)}%</td>
      <td className="px-3 py-2.5 text-[11px]">{p.domicile}</td>
      <td className="px-3 py-2.5"><Stars n={p.rating} /></td>
    </>
  );
}

function EQRow({ p }: { p: EquityStock }) {
  const capTone = p.marketCap === "Large Cap" ? "bg-info/15 text-info" : p.marketCap === "Mid Cap" ? "bg-warning/20 text-warning" : "bg-negative/15 text-negative";
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px]">{p.ticker}</div>
        <div className="text-[10px] text-muted-foreground">{p.name}</div>
      </td>
      <td className="px-3 py-2.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-eq" />{p.sector}</span>
      </td>
      <td className="px-3 py-2.5"><span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm font-medium ${capTone}`}>{p.marketCap}</span></td>
      <td className="px-3 py-2.5 text-right mono-num">{p.price.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.pe.toFixed(1)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.pb.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.dividendYield.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.roe.toFixed(1)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.beta.toFixed(2)}</td>
      <td className={`px-3 py-2.5 text-right mono-num font-medium ${pctClass(p.cagr3y)}`}>{p.cagr3y > 0 ? "+" : ""}{p.cagr3y.toFixed(2)}%</td>
      <td className={`px-3 py-2.5 text-right mono-num ${pctClass(p.cagr5y)}`}>{p.cagr5y > 0 ? "+" : ""}{p.cagr5y.toFixed(2)}%</td>
      <td className="px-3 py-2.5 text-right mono-num text-primary font-medium">{p.expectedReturn.toFixed(2)}%</td>
      <td className="px-3 py-2.5"><RiskPill r={p.risk} /></td>
    </>
  );
}

function BONDRow({ p }: { p: Bond }) {
  return (
    <>
      <td className="px-3 py-2.5">
        <div className="font-medium text-[12.5px]">{p.name}</div>
        <div className="text-[10px] text-muted-foreground mono-num">{p.id}</div>
      </td>
      <td className="px-3 py-2.5 text-[11px]">{p.issuer}</td>
      <td className="px-3 py-2.5 text-[11px]">
        <span className="inline-flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-bond" />{p.bondType}</span>
      </td>
      <td className="px-3 py-2.5"><span className="px-1.5 py-0.5 rounded-sm bg-secondary text-[10px] font-medium mono-num">{p.rating}</span></td>
      <td className="px-3 py-2.5 text-right mono-num">{p.couponRate.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num font-semibold text-bond">{p.ytm.toFixed(2)}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.residualTenorYears}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.faceValue.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2.5 text-right mono-num">{p.minInvestment.toLocaleString("en-IN")}</td>
      <td className="px-3 py-2.5 text-[11px]">{p.payout}</td>
      <td className="px-3 py-2.5 text-[11px]">{p.taxable ? <span className="text-muted-foreground">Taxable</span> : <span className="text-positive">Tax-Free</span>}</td>
      <td className="px-3 py-2.5"><RiskPill r={p.risk} /></td>
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

function SavedScreens({ cat, snapshot, apply }: { cat: string; snapshot: () => any; apply: (s: any) => void }) {
  const storageKey = `vantage.savedScreens.${cat}`;
  const [list, setList] = useState<Array<{ name: string; state: any }>>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(window.localStorage.getItem(storageKey) || "[]"); } catch { return []; }
  });
  const persist = (next: Array<{ name: string; state: any }>) => {
    setList(next);
    try { window.localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
  };
  return (
    <div className="pt-4 border-t border-border space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Saved Screens</div>
        <button
          onClick={() => {
            const name = window.prompt("Name this screen");
            if (!name) return;
            persist([...list.filter(s => s.name !== name), { name, state: snapshot() }]);
          }}
          className="text-[10px] uppercase text-muted-foreground hover:text-foreground tracking-wider flex items-center gap-1"
        >
          <BookmarkPlus className="w-3 h-3" /> Save
        </button>
      </div>
      {list.length === 0 ? (
        <div className="text-[10px] text-muted-foreground italic">No saved screens yet. Configure filters then click Save.</div>
      ) : (
        list.map((s) => (
          <div key={s.name} className="flex items-center gap-1 group">
            <button
              onClick={() => apply(s.state)}
              className="flex-1 text-left px-2 py-1.5 rounded-sm hover:bg-secondary text-[11px] flex items-center gap-2"
            >
              <BookmarkPlus className="w-3 h-3 text-muted-foreground group-hover:text-foreground" />{s.name}
            </button>
            <button
              onClick={() => persist(list.filter(x => x.name !== s.name))}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"
              aria-label={`Delete ${s.name}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))
      )}
    </div>
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

type AnyProduct = MutualFund | FixedDeposit | Insurance | PMS | AIF | EquityStock | Bond;

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
    : cat === "INS"
    ? [
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
      ]
    : cat === "PMS"
    ? [
        { k: "manager", label: "Manager", type: "text" as const },
        { k: "strategy", label: "Strategy", type: "text" as const },
        { k: "structure", label: "Structure", type: "text" as const },
        { k: "benchmark", label: "Benchmark", type: "text" as const },
        { k: "aum", label: "AUM (₹ Cr)", type: "num" as const, dp: 0, best: "high" as const },
        { k: "returns1y", label: "1Y Return (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "returns3y", label: "3Y Return (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "returns5y", label: "5Y Return (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "alpha", label: "Alpha", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "sharpe", label: "Sharpe Ratio", type: "num" as const, dp: 2, best: "high" as const },
        { k: "beta", label: "Beta", type: "num" as const, dp: 2 },
        { k: "maxDrawdown", label: "Max Drawdown (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "fixedFee", label: "Fixed Fee (%)", type: "num" as const, dp: 2, best: "low" as const },
        { k: "performanceFee", label: "Performance Fee", type: "text" as const },
        { k: "exitLoad", label: "Exit Load", type: "text" as const },
        { k: "minInvestment", label: "Min Investment (₹)", type: "inr" as const },
        { k: "inception", label: "Inception", type: "text" as const },
        { k: "risk", label: "Risk Level", type: "text" as const },
        { k: "rating", label: "Rating", type: "stars" as const, best: "high" as const },
      ]
    : cat === "AIF"
    ? [
        { k: "manager", label: "Manager", type: "text" as const },
        { k: "sebiCategory", label: "SEBI Category", type: "text" as const },
        { k: "subStrategy", label: "Sub-Strategy", type: "text" as const },
        { k: "structure", label: "Structure", type: "text" as const },
        { k: "vintage", label: "Vintage", type: "num" as const, dp: 0 },
        { k: "corpusTarget", label: "Corpus Target (₹ Cr)", type: "num" as const, dp: 0, best: "high" as const },
        { k: "commitments", label: "Commitments (₹ Cr)", type: "num" as const, dp: 0, best: "high" as const },
        { k: "tenureYears", label: "Tenure (Y)", type: "num" as const, dp: 0 },
        { k: "drawdownStatus", label: "Capital Called (%)", type: "num" as const, dp: 0 },
        { k: "targetIRR", label: "Target IRR (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "netIRR", label: "Net IRR (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "moic", label: "MOIC (x)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "hurdleRate", label: "Hurdle Rate (%)", type: "num" as const, dp: 2 },
        { k: "carry", label: "Carry (%)", type: "num" as const, dp: 0, best: "low" as const },
        { k: "managementFee", label: "Management Fee (%)", type: "num" as const, dp: 2, best: "low" as const },
        { k: "minInvestment", label: "Min Investment (₹)", type: "inr" as const },
        { k: "domicile", label: "Domicile", type: "text" as const },
        { k: "risk", label: "Risk Level", type: "text" as const },
        { k: "rating", label: "Rating", type: "stars" as const, best: "high" as const },
      ]
    : cat === "EQ"
    ? [
        { k: "ticker", label: "Ticker", type: "text" as const },
        { k: "sector", label: "Sector", type: "text" as const },
        { k: "marketCap", label: "Market Cap", type: "text" as const },
        { k: "price", label: "LTP (₹)", type: "num" as const, dp: 2 },
        { k: "pe", label: "P/E", type: "num" as const, dp: 2, best: "low" as const },
        { k: "pb", label: "P/B", type: "num" as const, dp: 2, best: "low" as const },
        { k: "dividendYield", label: "Dividend Yield (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "roe", label: "ROE (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "beta", label: "Beta", type: "num" as const, dp: 2 },
        { k: "cagr3y", label: "3Y CAGR (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "cagr5y", label: "5Y CAGR (%)", type: "pct" as const, dp: 2, best: "high" as const },
        { k: "expectedReturn", label: "Expected Return (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "risk", label: "Risk Level", type: "text" as const },
      ]
    : [
        { k: "issuer", label: "Issuer", type: "text" as const },
        { k: "bondType", label: "Type", type: "text" as const },
        { k: "rating", label: "Credit Rating", type: "text" as const },
        { k: "couponRate", label: "Coupon (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "ytm", label: "YTM (%)", type: "num" as const, dp: 2, best: "high" as const },
        { k: "residualTenorYears", label: "Tenor (Y)", type: "num" as const, dp: 0 },
        { k: "faceValue", label: "Face Value (₹)", type: "num" as const, dp: 0 },
        { k: "minInvestment", label: "Min Investment (₹)", type: "inr" as const, best: "low" as const },
        { k: "payout", label: "Payout", type: "text" as const },
        { k: "taxable", label: "Taxable", type: "bool" as const },
        { k: "risk", label: "Risk Level", type: "text" as const },
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
            <h2 className="text-lg font-semibold tracking-tight">{cat === "MF" ? "Mutual Funds" : cat === "FD" ? "Fixed Deposits" : cat === "INS" ? "Insurance Plans" : cat === "PMS" ? "PMS Strategies" : cat === "AIF" ? "AIF Schemes" : cat === "EQ" ? "Equity" : "Fixed Income"} · {products.length} selected</h2>
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

// ============= Order Placement =============

type MfRoute = "BSE" | "NSE" | "CP" | "MFC";
type OrderTxn = "BUY" | "SIP" | "SWP" | "STP" | "REDEEM" | "SWITCH";

const MF_ROUTES: { id: MfRoute; label: string; sub: string; icon: typeof Building2; settle: string }[] = [
  { id: "BSE", label: "BSE StAR MF", sub: "Exchange-routed · T+1 NAV cutoff 3:00 PM", icon: Building2, settle: "T+1 / T+2" },
  { id: "NSE", label: "NSE MF Platform", sub: "Exchange-routed · Bulk & systematic friendly", icon: Network, settle: "T+1 / T+2" },
  { id: "CP", label: "Channel Partner (RTA)", sub: "Direct via KFintech / CAMS feed", icon: Wallet, settle: "T+1 (RTA pickup)" },
  { id: "MFC", label: "MF Central", sub: "Investor-consent flow (RTA jointly)", icon: Globe, settle: "T+2 (consent flow)" },
];

type OrderLine = {
  id: string;
  txn: OrderTxn;
  amount: number;
  folio?: string;
  sipDate?: number;
  sipTenure?: number;
  route?: MfRoute;
  mandateId?: string;
};

type Mandate = {
  id: string;
  type: "NACH" | "eNACH" | "UPI AutoPay" | "Debit Card AutoPay";
  bank: string;
  accountMasked: string;
  limit: number; // per-debit cap
  validTill: string;
  status: "Active" | "Pending" | "Exhausted";
};

const MANDATES: Mandate[] = [
  { id: "MND-00231", type: "NACH",              bank: "HDFC Bank",  accountMasked: "XXXX4421", limit: 100000, validTill: "31-Dec-2030", status: "Active" },
  { id: "MND-00418", type: "eNACH",             bank: "ICICI Bank", accountMasked: "XXXX8810", limit: 50000,  validTill: "15-Aug-2028", status: "Active" },
  { id: "MND-00502", type: "UPI AutoPay",       bank: "Axis Bank",  accountMasked: "UPI@axis", limit: 15000,  validTill: "30-Jun-2027", status: "Active" },
  { id: "MND-00611", type: "Debit Card AutoPay",bank: "SBI",        accountMasked: "XXXX2207", limit: 25000,  validTill: "20-Mar-2027", status: "Active" },
  { id: "MND-00702", type: "NACH",              bank: "Kotak Bank", accountMasked: "XXXX9912", limit: 200000, validTill: "10-Nov-2029", status: "Pending" },
];

function OrderModal({ cat, items, onClose }: { cat: Category; items: AnyProduct[]; onClose: () => void }) {
  const products = items.filter(p => p.category === cat);
  const [client, setClient] = useState("Aarav Mehta · HUF · KYC ✓");
  const [globalRoute, setGlobalRoute] = useState<MfRoute>("BSE");
  const [globalMandate, setGlobalMandate] = useState<string>(MANDATES[0].id);
  const [lines, setLines] = useState<Record<string, OrderLine>>(() => {
    const m: Record<string, OrderLine> = {};
    products.forEach(p => {
      const min = (p as any).minInvestment ?? 5000;
      m[p.id] = {
        id: p.id,
        txn: cat === "MF" ? "BUY" : cat === "FD" ? "BUY" : "BUY",
        amount: min,
        sipDate: 5,
        sipTenure: 36,
        route: cat === "MF" ? "BSE" : undefined,
        mandateId: MANDATES[0].id,
      };
    });
    return m;
  });
  const [stage, setStage] = useState<"build" | "review" | "submitted">("build");
  const [ackTerms, setAckTerms] = useState(false);

  const update = (id: string, patch: Partial<OrderLine>) => {
    setLines(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const applyRouteAll = (r: MfRoute) => {
    setGlobalRoute(r);
    setLines(prev => {
      const n: Record<string, OrderLine> = {};
      Object.entries(prev).forEach(([k, v]) => (n[k] = { ...v, route: r }));
      return n;
    });
  };

  const total = Object.values(lines).reduce((acc, l) => acc + (Number.isFinite(l.amount) ? l.amount : 0), 0);
  const sipMonthly = Object.values(lines)
    .filter(l => l.txn === "SIP")
    .reduce((acc, l) => acc + (l.amount || 0), 0);

  const catLabel = cat === "MF" ? "Mutual Funds" : cat === "FD" ? "Fixed Deposits" : cat === "INS" ? "Insurance Plans" : cat === "PMS" ? "PMS" : cat === "AIF" ? "AIF" : cat === "EQ" ? "Equity" : "Fixed Income";

  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
        <div className="bg-surface border border-border rounded-md p-8 max-w-md" onClick={(e) => e.stopPropagation()}>
          <div className="text-sm text-muted-foreground mb-4">No products from the current category ({catLabel}) selected. Switch tab to place orders for other product types.</div>
          <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-sm border border-border hover:bg-secondary">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-md w-full max-w-6xl my-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Order Pad · {catLabel}</div>
            <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" /> {products.length} instrument{products.length > 1 ? "s" : ""} · {stage === "build" ? "Build Order" : stage === "review" ? "Review & Confirm" : "Submitted"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-sm hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        {stage === "submitted" ? (
          <div className="p-10 text-center">
            <CheckCircle2 className="w-12 h-12 text-positive mx-auto mb-3" />
            <div className="text-base font-semibold">Order basket submitted</div>
            <div className="text-xs text-muted-foreground mt-1">Confirmation reference: <span className="mono-num text-foreground">ORD-{Date.now().toString().slice(-8)}</span></div>
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-xl mx-auto text-left">
              {Object.values(lines).map(l => {
                const p = products.find(x => x.id === l.id)!;
                return (
                  <div key={l.id} className="border border-border rounded-sm p-3 bg-background/40">
                    <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{l.txn}{l.route ? ` · ${l.route}` : ""}</div>
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[11px] mono-num text-primary mt-1">{fmtINR(l.amount)}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={onClose} className="mt-6 text-[11px] px-4 py-2 rounded-sm bg-primary text-primary-foreground">Done</button>
          </div>
        ) : stage === "build" ? (
          <>
            {/* Client + Route bar */}
            <div className="px-6 py-3 border-b border-border bg-background/30 grid md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Client / Folio Owner</label>
                <select value={client} onChange={(e) => setClient(e.target.value)} className="mt-1 w-full bg-surface border border-border rounded-sm px-2 py-1.5 text-xs">
                  <option>Aarav Mehta · HUF · KYC ✓</option>
                  <option>Priya Nair · Resident Individual · KYC ✓</option>
                  <option>Rohan Kapoor · NRI (Non-PIS) · KYC ✓</option>
                  <option>Lakshmi Iyer · Resident Individual · KYC ✓</option>
                  <option>Vikram Singh · Corporate · KYC ✓</option>
                </select>
              </div>
              {cat === "MF" && (
                <div>
                  <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Default Execution Route (apply to all)</label>
                  <div className="mt-1 grid grid-cols-4 gap-1">
                    {MF_ROUTES.map(r => {
                      const Icon = r.icon;
                      const active = globalRoute === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => applyRouteAll(r.id)}
                          className={`flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded-sm border ${active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}
                          title={r.sub}
                        >
                          <Icon className="w-3 h-3" /> {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {cat === "MF" && (
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Default SIP / STP Mandate (apply to all)</label>
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={globalMandate}
                      onChange={(e) => {
                        const v = e.target.value;
                        setGlobalMandate(v);
                        setLines(prev => {
                          const n: Record<string, OrderLine> = {};
                          Object.entries(prev).forEach(([k, l]) => (n[k] = { ...l, mandateId: v }));
                          return n;
                        });
                      }}
                      className="flex-1 bg-surface border border-border rounded-sm px-2 py-1.5 text-xs"
                    >
                      {MANDATES.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.id} · {m.type} · {m.bank} {m.accountMasked} · Cap ₹{(m.limit / 1000).toFixed(0)}k · Valid till {m.validTill} {m.status !== "Active" ? `· ${m.status}` : ""}
                        </option>
                      ))}
                    </select>
                    <button className="text-[10px] px-2 py-1.5 rounded-sm border border-border hover:bg-secondary whitespace-nowrap">+ New Mandate</button>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">Mandates apply to SIP / STP lines. Per-line override available below. Lumpsum, SWP, Switch & Redeem don't require a mandate.</div>
                </div>
              )}
            </div>

            {/* Lines */}
            <div className="max-h-[55vh] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface border-b border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Instrument</th>
                    <th className="px-3 py-2 text-left">Transaction</th>
                    <th className="px-3 py-2 text-right">Amount (₹)</th>
                    {cat === "MF" && <th className="px-3 py-2 text-left">SIP Date / Tenure</th>}
                    {cat === "MF" && <th className="px-3 py-2 text-left">Mandate</th>}
                    {cat === "MF" && <th className="px-3 py-2 text-left">Route</th>}
                    {cat !== "MF" && <th className="px-3 py-2 text-left">Reference</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map(p => {
                    const l = lines[p.id];
                    const min = (p as any).minInvestment ?? 0;
                    const below = l.amount < min;
                    return (
                      <tr key={p.id} className="border-b border-border/60 hover:bg-secondary/20">
                        <td className="px-3 py-2">
                          <div className="font-medium truncate max-w-[260px]">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {(p as any).amc || (p as any).issuer || (p as any).insurer || (p as any).manager} · Min {fmtINR(min)}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select value={l.txn} onChange={(e) => update(p.id, { txn: e.target.value as OrderTxn })} className="bg-background border border-border rounded-sm px-1.5 py-1 text-[11px]">
                            {cat === "MF" && <>
                              <option value="BUY">Lumpsum Buy</option>
                              <option value="SIP">SIP</option>
                              <option value="STP">STP</option>
                              <option value="SWP">SWP</option>
                              <option value="SWITCH">Switch</option>
                              <option value="REDEEM">Redeem</option>
                            </>}
                            {cat === "FD" && <>
                              <option value="BUY">Book FD</option>
                              <option value="REDEEM">Premature Withdrawal</option>
                            </>}
                            {cat === "INS" && <option value="BUY">New Policy</option>}
                            {cat === "PMS" && <>
                              <option value="BUY">Onboard / Top-up</option>
                              <option value="REDEEM">Partial Withdrawal</option>
                            </>}
                            {cat === "AIF" && <option value="BUY">Commitment / Drawdown</option>}
                            {cat === "EQ" && <>
                              <option value="BUY">Buy (Delivery)</option>
                              <option value="REDEEM">Sell (Delivery)</option>
                            </>}
                            {cat === "BOND" && <>
                              <option value="BUY">Subscribe / Buy</option>
                              <option value="REDEEM">Sell on Exchange</option>
                            </>}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            value={l.amount}
                            onChange={(e) => update(p.id, { amount: Number(e.target.value) })}
                            className={`w-32 bg-background border rounded-sm px-2 py-1 text-right mono-num text-[11px] ${below ? "border-negative text-negative" : "border-border"}`}
                          />
                          {below && (
                            <div className="text-[9px] text-negative flex items-center justify-end gap-1 mt-1">
                              <AlertTriangle className="w-2.5 h-2.5" /> Below min
                            </div>
                          )}
                        </td>
                        {cat === "MF" && (
                          <td className="px-3 py-2">
                            {l.txn === "SIP" || l.txn === "STP" || l.txn === "SWP" ? (
                              <div className="flex items-center gap-1">
                                <select value={l.sipDate} onChange={(e) => update(p.id, { sipDate: Number(e.target.value) })} className="bg-background border border-border rounded-sm px-1 py-1 text-[11px]">
                                  {[1, 5, 10, 15, 20, 25].map(d => <option key={d} value={d}>{d}th</option>)}
                                </select>
                                <span className="text-[10px] text-muted-foreground">×</span>
                                <input type="number" value={l.sipTenure} onChange={(e) => update(p.id, { sipTenure: Number(e.target.value) })} className="w-14 bg-background border border-border rounded-sm px-1.5 py-1 text-[11px] mono-num" />
                                <span className="text-[10px] text-muted-foreground">mo</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {cat === "MF" && (
                          <td className="px-3 py-2">
                            {l.txn === "SIP" || l.txn === "STP" ? (() => {
                              const m = MANDATES.find(x => x.id === l.mandateId);
                              const insufficient = m && l.amount > m.limit;
                              return (
                                <div>
                                  <select
                                    value={l.mandateId ?? ""}
                                    onChange={(e) => update(p.id, { mandateId: e.target.value })}
                                    className={`bg-background border rounded-sm px-1.5 py-1 text-[11px] max-w-[180px] ${insufficient ? "border-negative text-negative" : "border-border"}`}
                                  >
                                    {MANDATES.filter(x => x.status !== "Exhausted").map(x => (
                                      <option key={x.id} value={x.id}>
                                        {x.type} · {x.bank} {x.accountMasked} · ₹{(x.limit / 1000).toFixed(0)}k{x.status === "Pending" ? " (Pending)" : ""}
                                      </option>
                                    ))}
                                    <option value="__new__">+ Register new mandate…</option>
                                  </select>
                                  {insufficient && (
                                    <div className="text-[9px] text-negative flex items-center gap-1 mt-1">
                                      <AlertTriangle className="w-2.5 h-2.5" /> Amount exceeds mandate cap
                                    </div>
                                  )}
                                </div>
                              );
                            })() : (
                              <span className="text-[10px] text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        {cat === "MF" && (
                          <td className="px-3 py-2">
                            <select value={l.route} onChange={(e) => update(p.id, { route: e.target.value as MfRoute })} className="bg-background border border-border rounded-sm px-1.5 py-1 text-[11px]">
                              {MF_ROUTES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                            </select>
                          </td>
                        )}
                        {cat !== "MF" && (
                          <td className="px-3 py-2 text-[10px] text-muted-foreground">
                            {cat === "FD" ? "Direct issuer booking" : cat === "INS" ? "POSP / Broker portal" : cat === "PMS" ? "Drawdown notice + DDP" : cat === "AIF" ? "Capital call notice" : cat === "EQ" ? "NSE / BSE · T+1 settlement" : "NSE / BSE · RBI Retail Direct"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border flex items-center justify-between bg-background/30">
              <div className="text-[11px] text-muted-foreground">
                Basket total: <span className="text-foreground font-semibold mono-num">{fmtINR(total)}</span>
                {sipMonthly > 0 && <> · SIP/mo: <span className="text-primary mono-num">{fmtINR(sipMonthly)}</span></>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="text-[11px] px-3 py-1.5 rounded-sm border border-border hover:bg-secondary">Cancel</button>
                <button onClick={() => setStage("review")} className="text-[11px] px-3 py-1.5 rounded-sm bg-primary text-primary-foreground flex items-center gap-1.5">
                  Review Order <ChevronDown className="w-3 h-3 -rotate-90" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* REVIEW */
          <>
            <div className="px-6 py-4 border-b border-border bg-background/30">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Client</div>
              <div className="text-sm font-medium">{client}</div>
            </div>

            {cat === "MF" && (
              <div className="px-6 py-4 border-b border-border grid md:grid-cols-4 gap-2">
                {MF_ROUTES.map(r => {
                  const count = Object.values(lines).filter(l => l.route === r.id).length;
                  const sum = Object.values(lines).filter(l => l.route === r.id).reduce((a, l) => a + l.amount, 0);
                  const Icon = r.icon;
                  return (
                    <div key={r.id} className={`border rounded-sm p-3 ${count > 0 ? "border-primary/40 bg-primary/5" : "border-border opacity-60"}`}>
                      <div className="flex items-center gap-2 text-xs font-medium"><Icon className="w-3.5 h-3.5" /> {r.label}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">{r.sub}</div>
                      <div className="text-[10px] text-muted-foreground">Settlement: {r.settle}</div>
                      <div className="text-[11px] mono-num mt-1.5">{count} order{count !== 1 ? "s" : ""} · {fmtINR(sum)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="max-h-[40vh] overflow-y-auto px-6 py-3">
              <table className="w-full text-xs">
                <thead className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                  <tr><th className="text-left py-2">Instrument</th><th className="text-left">Type</th>{cat === "MF" && <th className="text-left">Route</th>}{cat === "MF" && <th className="text-left">Mandate</th>}<th className="text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {Object.values(lines).map(l => {
                    const p = products.find(x => x.id === l.id)!;
                    const m = MANDATES.find(x => x.id === l.mandateId);
                    const needsMandate = l.txn === "SIP" || l.txn === "STP";
                    return (
                      <tr key={l.id} className="border-b border-border/60">
                        <td className="py-2"><div className="font-medium">{p.name}</div><div className="text-[10px] text-muted-foreground">{(p as any).amc || (p as any).issuer || (p as any).insurer || (p as any).manager}</div></td>
                        <td>{l.txn}{l.txn === "SIP" ? ` · ${l.sipDate}th × ${l.sipTenure}m` : ""}</td>
                        {cat === "MF" && <td className="text-[11px]">{MF_ROUTES.find(r => r.id === l.route)?.label}</td>}
                        {cat === "MF" && <td className="text-[11px]">{needsMandate && m ? <span>{m.type} · {m.bank} {m.accountMasked}</span> : <span className="text-muted-foreground">—</span>}</td>}
                        <td className="text-right mono-num">{fmtINR(l.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="py-2" colSpan={cat === "MF" ? 4 : 2}>Basket Total</td>
                    <td className="text-right mono-num text-primary">{fmtINR(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-6 py-3 border-t border-border bg-background/30 space-y-2">
              <label className="flex items-start gap-2 text-[11px] text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={ackTerms} onChange={(e) => setAckTerms(e.target.checked)} className="mt-0.5 accent-primary" />
                <span>I confirm suitability assessment is complete, the client has been provided the Scheme Information / Key Information Document, and consent is captured per SEBI / AMFI guidelines. {cat === "MF" && "Orders before NAV cutoff (3:00 PM lumpsum / 3:00 PM SIP) will receive same-day NAV."}</span>
              </label>
              <div className="flex items-center justify-between">
                <button onClick={() => setStage("build")} className="text-[11px] px-3 py-1.5 rounded-sm border border-border hover:bg-secondary">Back to edit</button>
                <button
                  onClick={() => setStage("submitted")}
                  disabled={!ackTerms}
                  className="text-[11px] px-4 py-1.5 rounded-sm bg-primary text-primary-foreground flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="w-3 h-3" /> Submit Basket
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
