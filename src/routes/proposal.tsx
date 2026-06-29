import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Info, FilePlus2, Download, Search, Sparkles } from "lucide-react";
import kfintechLogo from "@/assets/kfintech.png.asset.json";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  mutualFunds, equityStocks, aifSchemes, bonds, pmsSchemes, fixedDeposits,
  type MutualFund, type EquityStock, type AIF, type Bond, type PMS, type FixedDeposit,
} from "@/lib/research-data";
import { useRegion, fmtMoney } from "@/lib/region";

export const Route = createFileRoute("/proposal")({
  component: ProposalPage,
});

type AssetClassKey = "MF" | "EQ" | "PMS" | "AIF" | "DEBT" | "FD" | "CASH";

interface AssetClassDef {
  key: AssetClassKey;
  label: string;
  product: string;
  security: string;
  tone: string;
}

const ASSET_CLASSES: AssetClassDef[] = [
  { key: "MF", label: "Mutual Funds", product: "Mutual Funds", security: "MF Schemes", tone: "text-mf" },
  { key: "EQ", label: "Equity", product: "Direct Equity", security: "Listed Stocks", tone: "text-foreground" },
  { key: "PMS", label: "PMS", product: "Portfolio Mgmt Svc", security: "PMS Strategies", tone: "text-pms" },
  { key: "AIF", label: "AIF", product: "Alternative Inv Funds", security: "AIF Schemes", tone: "text-aif" },
  { key: "DEBT", label: "Debt", product: "Debt / Fixed Income", security: "Bonds & Sukuk", tone: "text-fd" },
  { key: "FD", label: "Fixed Deposits", product: "Bank / NBFC FD", security: "FD Schemes", tone: "text-fd" },
  { key: "CASH", label: "Cash", product: "Liquid / Savings", security: "Idle Cash", tone: "text-muted-foreground" },
];

type Holding = {
  uid: string;
  klass: AssetClassKey;
  id: string;
  name: string;
  sub: string;
  amount: number;
  expectedReturn: number;
  irrBasis: string;
  risk: string;
};

const fmtINR = fmtMoney;

const RISK_SCORE: Record<string, number> = {
  "Low": 1, "Low-Mod": 2, "Moderate": 3, "Mod-High": 4, "High": 5, "Very High": 6,
};

function irrBasisFor(klass: AssetClassKey, name: string): string {
  switch (klass) {
    case "MF": return `Expected return uses the scheme's 3-year annualised return (CAGR) — a rolling window that smooths short-term volatility. Computed from monthly NAVs over the trailing 36 months and annualised.`;
    case "EQ": return `Expected return = forward earnings growth estimate (consensus 3-5Y) + trailing dividend yield. This is a forward-looking estimate, NOT historical CAGR. Historical 3Y/5Y CAGR is shown separately.`;
    case "PMS": return `3-year annualised post-fee return of the strategy, sourced from APMI factsheet. PMS returns are TWRR (Time-Weighted) per SEBI norms, computed monthly.`;
    case "AIF": return `Net IRR since inception — money-weighted (XIRR) on actual cash flows: drawdowns, distributions, and current NAV. For closed-end funds this spans the full fund tenor (typically 7-10Y).`;
    case "DEBT": return `Yield to Maturity (YTM) — the IRR if you hold the bond till maturity and reinvest coupons at the same yield. Period = residual tenor of the bond.`;
    case "FD": return `Effective annualised yield over the deposit tenure, factoring compounding frequency. Locked rate for the full term.`;
    case "CASH": return `User-defined assumption for idle/liquid balance (e.g. savings sweep, liquid funds, overnight). Edit the rate above to change.`;
  }
}

function ProposalPage() {
  const { region } = useRegion();
  // Prospect details
  const [prospect, setProspect] = useState({ name: "", age: "", riskProfile: "Moderate", horizonYears: "5", goal: "Wealth Creation" });
  const [totalCorpus, setTotalCorpus] = useState<number>(10000000);
  const [cashRate, setCashRate] = useState<number>(6.5);

  const [activeClass, setActiveClass] = useState<AssetClassKey>("MF");
  const [search, setSearch] = useState("");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  // Wipe holdings on region switch so we never carry over India product IDs into AE catalog.
  useEffect(() => { setHoldings([]); }, [region]);

  // Catalog by class
  const catalog = useMemo(() => {
    const q = search.toLowerCase();
    const filt = <T extends { name: string }>(arr: T[]) => q ? arr.filter(x => x.name.toLowerCase().includes(q)) : arr;
    switch (activeClass) {
      case "MF": return filt(mutualFunds).map(m => ({ id: m.id, name: m.name, sub: `${m.subCategory} · ${m.amc}`, ret: m.returns3y, risk: m.risk, extra: `3Y · 5★ ${m.rating}`, _raw: m as MutualFund }));
      case "EQ": return filt(equityStocks).map(s => ({ id: s.id, name: s.name, sub: `${s.ticker} · ${s.sector} · ${s.marketCap}`, ret: s.expectedReturn, risk: s.risk, extra: `P/E ${s.pe.toFixed(1)} · ROE ${s.roe.toFixed(1)}%`, _raw: s as EquityStock }));
      case "PMS": return filt(pmsSchemes).map(p => ({ id: p.id, name: p.name, sub: `${p.strategy} · ${p.manager}`, ret: p.returns3y, risk: p.risk, extra: `Alpha ${p.alpha.toFixed(1)} · Fee ${p.fixedFee.toFixed(2)}%`, _raw: p as PMS }));
      case "AIF": return filt(aifSchemes).map(a => ({ id: a.id, name: a.name, sub: `${a.sebiCategory} · ${a.subStrategy}`, ret: a.netIRR, risk: a.risk, extra: `Vintage ${a.vintage} · MOIC ${a.moic.toFixed(2)}x`, _raw: a as AIF }));
      case "DEBT": return filt(bonds).map(b => ({ id: b.id, name: b.name, sub: `${b.bondType} · ${b.rating}`, ret: b.ytm, risk: b.risk, extra: `Coupon ${b.couponRate}% · ${b.residualTenorYears}Y`, _raw: b as Bond }));
      case "FD": return filt(fixedDeposits).slice(0, 40).map(f => ({ id: f.id, name: f.name, sub: `${f.subCategory} · ${f.tenureMonths}M`, ret: f.interestRate, risk: "Low-Mod", extra: `${f.rating} · ${f.payout}`, _raw: f as FixedDeposit }));
      case "CASH": return [{ id: "CASH-LIQ", name: "Liquid / Savings Sweep", sub: "User-defined cash assumption", ret: cashRate, risk: "Low", extra: "Editable rate above", _raw: null as any }];
    }
  }, [activeClass, search, cashRate]);

  function addHolding(item: typeof catalog[number]) {
    if (holdings.some(h => h.id === item.id && h.klass === activeClass)) return;
    setHoldings(prev => [...prev, {
      uid: `${activeClass}-${item.id}-${Date.now()}`,
      klass: activeClass,
      id: item.id,
      name: item.name,
      sub: item.sub,
      amount: 0,
      expectedReturn: activeClass === "CASH" ? cashRate : item.ret,
      irrBasis: irrBasisFor(activeClass, item.name),
      risk: item.risk,
    }]);
  }

  function updateAmount(uid: string, amount: number) {
    setHoldings(prev => prev.map(h => h.uid === uid ? { ...h, amount: Math.max(0, amount) } : h));
  }
  function removeHolding(uid: string) {
    setHoldings(prev => prev.filter(h => h.uid !== uid));
  }
  type AllocStrategy = "equal" | "sharpe" | "maxret" | "maxrisk" | "minrisk";
  const [allocStrategy, setAllocStrategy] = useState<AllocStrategy>("equal");
  const RF = 6.5; // risk-free proxy for Sharpe (10Y G-Sec)

  function allocByWeights(weights: number[]) {
    const sum = weights.reduce((s, w) => s + w, 0);
    if (sum <= 0) return;
    setHoldings(prev => prev.map((h, i) => ({
      ...h,
      amount: Math.floor((weights[i] / sum) * totalCorpus),
    })));
  }

  function autoAllocate(strategy: AllocStrategy = allocStrategy) {
    if (holdings.length === 0) return;
    const live = holdings.map(h => h.klass === "CASH" ? { ...h, expectedReturn: cashRate } : h);
    switch (strategy) {
      case "equal": {
        const each = Math.floor(totalCorpus / holdings.length);
        setHoldings(prev => prev.map(h => ({ ...h, amount: each })));
        return;
      }
      case "maxret": {
        // Tilt heavily to higher expected returns (cubic emphasis)
        const w = live.map(h => Math.pow(Math.max(0.01, h.expectedReturn), 3));
        allocByWeights(w);
        return;
      }
      case "minrisk": {
        // Inverse risk weighting (low-vol tilt)
        const w = live.map(h => 1 / Math.pow(RISK_SCORE[h.risk] || 3, 2));
        allocByWeights(w);
        return;
      }
      case "maxrisk": {
        // Concentrate in highest-risk assets (aggressive growth tilt)
        const w = live.map(h => Math.pow(RISK_SCORE[h.risk] || 3, 3));
        allocByWeights(w);
        return;
      }
      case "sharpe": {
        // Risk-adjusted: (return - rf) / risk score; clip negatives to a tiny positive
        const w = live.map(h => {
          const excess = h.expectedReturn - RF;
          const sigma = RISK_SCORE[h.risk] || 3;
          return Math.max(0.001, excess / sigma);
        });
        allocByWeights(w);
        return;
      }
    }
  }

  // Auto Portfolio Creator — picks a curated set of holdings across asset classes
  // tuned to the selected optimisation strategy, then sizes them via the same strategy weights.
  function autoCreatePortfolio() {
    type Cand = { klass: AssetClassKey; id: string; name: string; sub: string; ret: number; risk: string };
    const mf: Cand[]  = mutualFunds.map(m => ({ klass: "MF", id: m.id, name: m.name, sub: `${m.subCategory} · ${m.amc}`, ret: m.returns3y, risk: m.risk }));
    const eq: Cand[]  = equityStocks.map(s => ({ klass: "EQ", id: s.id, name: s.name, sub: `${s.ticker} · ${s.sector} · ${s.marketCap}`, ret: s.expectedReturn, risk: s.risk }));
    const pms: Cand[] = pmsSchemes.map(p => ({ klass: "PMS", id: p.id, name: p.name, sub: `${p.strategy} · ${p.manager}`, ret: p.returns3y, risk: p.risk }));
    const aif: Cand[] = aifSchemes.map(a => ({ klass: "AIF", id: a.id, name: a.name, sub: `${a.sebiCategory} · ${a.subStrategy}`, ret: a.netIRR, risk: a.risk }));
    const dbt: Cand[] = bonds.map(b => ({ klass: "DEBT", id: b.id, name: b.name, sub: `${b.bondType} · ${b.rating}`, ret: b.ytm, risk: b.risk }));
    const fd: Cand[]  = fixedDeposits.map(f => ({ klass: "FD", id: f.id, name: f.name, sub: `${f.subCategory} · ${f.tenureMonths}M`, ret: f.interestRate, risk: "Low-Mod" }));
    const cash: Cand  = { klass: "CASH", id: "CASH-LIQ", name: "Liquid / Savings Sweep", sub: "User-defined cash assumption", ret: cashRate, risk: "Low" };

    const topBy = <T,>(arr: T[], n: number, score: (x: T) => number) =>
      [...arr].sort((a, b) => score(b) - score(a)).slice(0, n);
    const rs = (r: string) => RISK_SCORE[r] || 3;

    // Risk-profile policy: caps the max risk score of any pick and biases the
    // class mix (equity/AIF/PMS counts vs FD/Debt/Cash counts).
    const profile = prospect.riskProfile;
    const policy =
      profile === "Conservative"     ? { cap: 3, mfN: 2, eqN: 0, pmsN: 0, aifN: 0, dbtN: 3, fdN: 4, cash: true,  growthBoost: 0.5, defBoost: 1.6 } :
      profile === "Moderate"         ? { cap: 4, mfN: 3, eqN: 2, pmsN: 1, aifN: 1, dbtN: 2, fdN: 2, cash: true,  growthBoost: 1.0, defBoost: 1.0 } :
      profile === "Aggressive"       ? { cap: 5, mfN: 3, eqN: 3, pmsN: 2, aifN: 1, dbtN: 1, fdN: 1, cash: false, growthBoost: 1.4, defBoost: 0.6 } :
                                       { cap: 6, mfN: 2, eqN: 4, pmsN: 2, aifN: 2, dbtN: 0, fdN: 0, cash: false, growthBoost: 1.8, defBoost: 0.3 };

    // Apply risk cap to every candidate pool
    const within = <T extends Cand>(arr: T[]) => arr.filter(x => rs(x.risk) <= policy.cap);
    const mfP = within(mf), eqP = within(eq), pmsP = within(pms), aifP = within(aif), dbtP = within(dbt), fdP = within(fd);

    let picks: Cand[] = [];
    switch (allocStrategy) {
      case "equal":
        // Balanced sampler — class counts driven by the risk profile
        picks = [
          ...topBy(mfP, policy.mfN, x => x.ret),
          ...topBy(eqP, policy.eqN, x => x.ret),
          ...topBy(pmsP, policy.pmsN, x => x.ret),
          ...topBy(aifP, policy.aifN, x => x.ret),
          ...topBy(dbtP, policy.dbtN, x => x.ret),
          ...topBy(fdP, policy.fdN, x => x.ret),
          ...(policy.cash ? [cash] : []),
        ];
        break;
      case "sharpe": {
        const sh = (x: Cand) => (x.ret - RF) / rs(x.risk);
        picks = [
          ...topBy(mfP, policy.mfN, sh),
          ...topBy(eqP, policy.eqN, sh),
          ...topBy(pmsP, policy.pmsN, sh),
          ...topBy(aifP, policy.aifN, sh),
          ...topBy(dbtP, policy.dbtN, sh),
          ...topBy(fdP, policy.fdN, sh),
        ];
        break;
      }
      case "maxret":
        // Growth-tilted, but eq/PMS/AIF counts still respect the profile
        picks = [
          ...topBy(eqP, Math.max(policy.eqN, 2), x => x.ret),
          ...topBy(mfP.filter(m => /Small|Mid|Flexi|Thematic|Sector/i.test(m.sub)), policy.mfN, x => x.ret),
          ...topBy(pmsP, policy.pmsN, x => x.ret),
          ...topBy(aifP, policy.aifN, x => x.ret),
          ...topBy(dbtP, policy.dbtN, x => x.ret),
          ...topBy(fdP, policy.fdN, x => x.ret),
        ];
        break;
      case "minrisk":
        picks = [
          ...topBy(fdP, Math.max(policy.fdN, 2), x => x.ret),
          ...topBy(dbtP.filter(b => /AAA|G-Sec|SDL/i.test(b.sub)), Math.max(policy.dbtN, 2), x => x.ret),
          ...topBy(mfP.filter(m => /Debt|Liquid|Hybrid|Conservative|Arbitrage/i.test(m.sub)), policy.mfN, x => x.ret),
          ...(policy.cash ? [cash] : []),
        ];
        break;
      case "maxrisk":
        picks = [
          ...topBy(eqP, Math.max(policy.eqN, 2), x => rs(x.risk) * 1000 + x.ret),
          ...topBy(aifP, Math.max(policy.aifN, 1), x => rs(x.risk) * 1000 + x.ret),
          ...topBy(pmsP, Math.max(policy.pmsN, 1), x => rs(x.risk) * 1000 + x.ret),
          ...topBy(mfP.filter(m => /Small|Mid|Thematic|Sector/i.test(m.sub)), policy.mfN, x => x.ret),
        ];
        break;
    }

    // Dedupe (in case overlap) and convert to Holdings with strategy-based weights
    const seen = new Set<string>();
    picks = picks.filter(p => {
      const k = `${p.klass}-${p.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (picks.length === 0) return;

    // Compute weights for this strategy, then tilt by risk profile
    // (growthBoost favors higher-risk holdings, defBoost favors lower-risk)
    let weights: number[];
    switch (allocStrategy) {
      case "equal":   weights = picks.map(() => 1); break;
      case "maxret":  weights = picks.map(p => Math.pow(Math.max(0.01, p.ret), 3)); break;
      case "minrisk": weights = picks.map(p => 1 / Math.pow(rs(p.risk), 2)); break;
      case "maxrisk": weights = picks.map(p => Math.pow(rs(p.risk), 3)); break;
      case "sharpe":  weights = picks.map(p => Math.max(0.001, (p.ret - RF) / rs(p.risk))); break;
    }
    weights = weights!.map((w, i) => {
      const score = rs(picks[i].risk);
      const growthTilt = Math.pow(score / 3, policy.growthBoost - 1);
      const defTilt    = Math.pow(3 / score, policy.defBoost - 1);
      return w * growthTilt * defTilt;
    });
    const wSum = weights!.reduce((s, w) => s + w, 0) || 1;

    const stamp = Date.now();
    const newHoldings: Holding[] = picks.map((p, i) => ({
      uid: `${p.klass}-${p.id}-${stamp}-${i}`,
      klass: p.klass,
      id: p.id,
      name: p.name,
      sub: p.sub,
      amount: Math.floor((weights![i] / wSum) * totalCorpus),
      expectedReturn: p.klass === "CASH" ? cashRate : p.ret,
      irrBasis: irrBasisFor(p.klass, p.name),
      risk: p.risk,
    }));
    setHoldings(newHoldings);
  }
  // Keep cash holdings synced to cashRate input
  const holdingsLive = useMemo(() => holdings.map(h => h.klass === "CASH" ? { ...h, expectedReturn: cashRate } : h), [holdings, cashRate]);

  const totals = useMemo(() => {
    const allocated = holdingsLive.reduce((s, h) => s + h.amount, 0);
    const weightedReturn = allocated > 0
      ? holdingsLive.reduce((s, h) => s + h.expectedReturn * h.amount, 0) / allocated
      : 0;
    const weightedRisk = allocated > 0
      ? holdingsLive.reduce((s, h) => s + (RISK_SCORE[h.risk] || 3) * h.amount, 0) / allocated
      : 0;
    const byClass = ASSET_CLASSES.map(c => {
      const v = holdingsLive.filter(h => h.klass === c.key).reduce((s, h) => s + h.amount, 0);
      return { key: c.key, label: c.label, value: v, pct: allocated > 0 ? (v / allocated) * 100 : 0 };
    }).filter(x => x.value > 0);
    return { allocated, weightedReturn, weightedRisk, unallocated: totalCorpus - allocated, byClass };
  }, [holdingsLive, totalCorpus]);

  const riskLabel = totals.weightedRisk < 1.8 ? "Low" : totals.weightedRisk < 2.8 ? "Low-Moderate" : totals.weightedRisk < 3.8 ? "Moderate" : totals.weightedRisk < 4.6 ? "Mod-High" : totals.weightedRisk < 5.4 ? "High" : "Very High";

  const projection = useMemo(() => {
    const horizon = Math.max(1, parseInt(prospect.horizonYears) || 5);
    const r = totals.weightedReturn / 100;
    const fv = totalCorpus * Math.pow(1 + r, horizon);
    return { fv, gain: fv - totalCorpus, horizon };
  }, [totalCorpus, totals.weightedReturn, prospect.horizonYears]);

  function exportProposal() {
    const lines = [
      `mPower Wealth — Investment Proposal`,
      `Prospect: ${prospect.name || "(unnamed)"} · Age ${prospect.age || "-"} · Risk ${prospect.riskProfile} · Horizon ${prospect.horizonYears}Y`,
      `Goal: ${prospect.goal}`,
      `Total Corpus: ${fmtINR(totalCorpus)} · Cash Rate Assumption: ${cashRate}%`,
      ``,
      `Asset Class,Product,Security,Allocation,Weight %,Expected Return %,IRR Basis,Risk`,
      ...holdingsLive.map(h => {
        const c = ASSET_CLASSES.find(a => a.key === h.klass)!;
        return `${c.label},${c.product},"${h.name} (${h.sub})",${h.amount},${(h.amount / totalCorpus * 100).toFixed(2)},${h.expectedReturn.toFixed(2)},"${h.irrBasis.replace(/"/g, "'")}",${h.risk}`;
      }),
      ``,
      `Allocated,${totals.allocated}`,
      `Weighted Expected Return %,${totals.weightedReturn.toFixed(2)}`,
      `Portfolio Risk,${riskLabel}`,
      `Projected FV (${projection.horizon}Y),${projection.fv.toFixed(0)}`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `proposal_${prospect.name || "client"}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen text-foreground">
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
          <div className="pl-12 pr-6 py-3 flex items-center gap-4">
            <div>
              <h1 className="text-sm font-semibold leading-tight">Proposal Builder</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Construct an ad-hoc model portfolio for a prospect</p>
            </div>
            <button onClick={exportProposal} className="ml-auto text-xs inline-flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-sm hover:bg-secondary">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </header>

        <main className="px-6 py-5 max-w-[1600px] mx-auto grid grid-cols-12 gap-5">
          {/* LEFT: Prospect + Assumptions */}
          <aside className="col-span-12 lg:col-span-3 space-y-4">
            <section className="border border-border rounded-md bg-surface">
              <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                <FilePlus2 className="w-3.5 h-3.5" /> Prospect
              </div>
              <div className="p-3 space-y-2.5">
                <Field label="Name">
                  <input value={prospect.name} onChange={e => setProspect({ ...prospect, name: e.target.value })}
                    placeholder="Client name" className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs" />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Age">
                    <input type="number" value={prospect.age} onChange={e => setProspect({ ...prospect, age: e.target.value })}
                      className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs mono-num" />
                  </Field>
                  <Field label="Horizon (Y)">
                    <input type="number" value={prospect.horizonYears} onChange={e => setProspect({ ...prospect, horizonYears: e.target.value })}
                      className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs mono-num" />
                  </Field>
                </div>
                <Field label="Risk Profile">
                  <select value={prospect.riskProfile} onChange={e => setProspect({ ...prospect, riskProfile: e.target.value })}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs">
                    {["Conservative", "Moderate", "Aggressive", "Very Aggressive"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Goal">
                  <select value={prospect.goal} onChange={e => setProspect({ ...prospect, goal: e.target.value })}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs">
                    {["Wealth Creation", "Retirement", "Child Education", "Tax Saving", "Income"].map(o => <option key={o}>{o}</option>)}
                  </select>
                </Field>
              </div>
            </section>

            <section className="border border-border rounded-md bg-surface">
              <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Assumptions</div>
              <div className="p-3 space-y-2.5">
                <Field label={`Total Corpus (${fmtINR(totalCorpus)})`}>
                  <input type="number" value={totalCorpus} onChange={e => setTotalCorpus(Math.max(0, +e.target.value || 0))}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs mono-num" />
                </Field>
                <Field label={
                  <span className="inline-flex items-center gap-1">
                    Cash / Idle Return Rate (%)
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-[11px]">
                        Rate used for the Cash holding in the proposal. Default 6.5% reflects typical liquid-fund yields. Override to match the client's actual savings sweep, overnight fund, or T-bill yield.
                      </TooltipContent>
                    </Tooltip>
                  </span>
                }>
                  <input type="number" step="0.1" value={cashRate} onChange={e => setCashRate(+e.target.value || 0)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs mono-num" />
                </Field>
                <Field label={
                  <span className="inline-flex items-center gap-1">
                    Optimisation Strategy
                    <Tooltip>
                      <TooltipTrigger asChild><Info className="w-3 h-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                      <TooltipContent side="right" className="max-w-sm text-[11px] leading-relaxed space-y-2.5 p-3">
                        <div className="font-semibold text-foreground">How allocation strategies work</div>
                        <div className="text-muted-foreground">
                          Each strategy uses the <b>Expected Return</b> and <b>Risk Score</b> of every holding you have selected. These are the same numbers shown in the Proposed Holdings table. The system converts them into weights and then scales each weight to the Total Corpus.
                        </div>
                        <div className="space-y-1.5">
                          <div><b className="text-foreground">1. Equal Weight (1/N)</b></div>
                          <div className="text-muted-foreground pl-3 border-l border-border">
                            <b>Method:</b> Divide the Total Corpus equally across every holding.<br />
                            <b>Formula:</b> amountᵢ = Corpus / N<br />
                            <b>Data used:</b> None — this is a naive benchmark independent of return or risk.<br />
                            <b>Best for:</b> Quick baseline or when you have no strong view on relative attractiveness.
                          </div>
                          <div><b className="text-foreground">2. Max Sharpe Ratio</b></div>
                          <div className="text-muted-foreground pl-3 border-l border-border">
                            <b>Method:</b> Reward per unit of risk. Higher weight to holdings that give the most return for the risk they take.<br />
                            <b>Formula:</b> weightᵢ = max(0.001, (Returnᵢ − 6.5%) / RiskScoreᵢ)<br />
                            <b>Data used:</b> Expected Return of each holding, mapped Risk Score (Low=1 … Very High=6), and a fixed 6.5% risk-free rate (10Y G-Sec proxy).<br />
                            <b>Best for:</b> Clients who want the most efficient risk-adjusted portfolio.
                          </div>
                          <div><b className="text-foreground">3. Max Return</b></div>
                          <div className="text-muted-foreground pl-3 border-l border-border">
                            <b>Method:</b> Aggressively tilt toward the highest expected-return holdings using cubic emphasis so leaders dominate.<br />
                            <b>Formula:</b> weightᵢ = (Returnᵢ)³<br />
                            <b>Data used:</b> Expected Return only.<br />
                            <b>Best for:</b> Growth-oriented clients with high risk tolerance and long horizons.
                          </div>
                          <div><b className="text-foreground">4. Min Risk (Defensive)</b></div>
                          <div className="text-muted-foreground pl-3 border-l border-border">
                            <b>Method:</b> Inverse-risk weighting — the safer the holding, the larger its share.<br />
                            <b>Formula:</b> weightᵢ = 1 / (RiskScoreᵢ)²<br />
                            <b>Data used:</b> Risk Score only.<br />
                            <b>Best for:</b> Conservative clients, retirees, or portfolios where capital preservation matters more than upside.
                          </div>
                          <div><b className="text-foreground">5. Max Risk (Aggressive)</b></div>
                          <div className="text-muted-foreground pl-3 border-l border-border">
                            <b>Method:</b> Concentrate capital in the highest-risk holdings (risk³ weighting) to maximise growth potential.<br />
                            <b>Formula:</b> weightᵢ = (RiskScoreᵢ)³<br />
                            <b>Data used:</b> Risk Score only.<br />
                            <b>Best for:</b> Very aggressive clients seeking maximum capital appreciation and willing to accept higher volatility.
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5">
                          After weights are computed they are normalised so the sum equals 100%, then multiplied by the Total Corpus to get each holding’s ₹ allocation.
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                }>
                  <select value={allocStrategy} onChange={e => setAllocStrategy(e.target.value as AllocStrategy)}
                    className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-xs">
                    <option value="equal">Equal Weight (1/N)</option>
                    <option value="sharpe">Max Sharpe Ratio</option>
                    <option value="maxret">Max Return</option>
                    <option value="minrisk">Min Risk (Defensive)</option>
                    <option value="maxrisk">Max Risk (Aggressive)</option>
                  </select>
                </Field>
                <button onClick={autoCreatePortfolio}
                  className="w-full text-xs px-2 py-1.5 border border-foreground/30 bg-foreground text-background rounded-sm hover:bg-foreground/90 font-medium inline-flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Auto Portfolio Creator
                </button>
                <div className="text-[10px] text-muted-foreground -mt-1 leading-snug">
                  Builds a curated portfolio across asset classes tuned to the selected strategy and sizes each holding by the same weights.
                </div>
                <button onClick={() => autoAllocate()} disabled={holdings.length === 0}
                  className="w-full text-xs px-2 py-1.5 border border-border rounded-sm hover:bg-secondary disabled:opacity-40 font-medium">
                  Apply Allocation (re-weight current holdings)
                </button>
              </div>
            </section>

            <section className="border border-border rounded-md bg-surface">
              <div className="px-3 py-2 border-b border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Proposal Summary</div>
              <div className="p-3 space-y-2 text-xs">
                <SummaryRow label="Allocated" value={fmtINR(totals.allocated)} />
                <SummaryRow label="Unallocated" value={fmtINR(totals.unallocated)} tone={totals.unallocated < 0 ? "text-negative" : "text-muted-foreground"} />
                <div className="h-px bg-border my-1" />
                <SummaryRow label="Weighted Expected Return" value={`${totals.weightedReturn.toFixed(2)}%`} tone="text-positive font-semibold" />
                <SummaryRow label="Portfolio Risk" value={riskLabel} />
                <div className="h-px bg-border my-1" />
                <SummaryRow label={`Projected FV (${projection.horizon}Y)`} value={fmtINR(projection.fv)} tone="text-foreground font-semibold" />
                <SummaryRow label="Total Gain" value={fmtINR(projection.gain)} tone="text-positive" />
              </div>
              {totals.byClass.length > 0 && (
                <div className="border-t border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Asset Allocation</div>
                  <div className="space-y-1.5">
                    {totals.byClass.map(b => (
                      <div key={b.key}>
                        <div className="flex justify-between text-[11px]"><span>{b.label}</span><span className="mono-num">{b.pct.toFixed(1)}%</span></div>
                        <div className="h-1.5 bg-secondary rounded-sm overflow-hidden"><div className="h-full bg-foreground/70" style={{ width: `${b.pct}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </aside>

          {/* CENTER: Catalog */}
          <section className="col-span-12 lg:col-span-5">
            <div className="border border-border rounded-md bg-surface">
              <div className="border-b border-border flex flex-wrap">
                {ASSET_CLASSES.map(c => (
                  <button key={c.key} onClick={() => { setActiveClass(c.key); setSearch(""); }}
                    className={`px-3 py-2 text-[11px] font-medium tracking-wide border-b-2 -mb-px ${activeClass === c.key ? `border-foreground text-foreground` : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="px-3 py-2 border-b border-border bg-background/40 flex items-center gap-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <span className="text-foreground">{ASSET_CLASSES.find(a => a.key === activeClass)?.product}</span> → {ASSET_CLASSES.find(a => a.key === activeClass)?.security}
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs">
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search securities…"
                    className="bg-background border border-border rounded-sm px-2 py-1 text-xs w-48" />
                </div>
              </div>
              <div className="max-h-[calc(100vh-280px)] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface border-b border-border">
                    <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-3 py-2">Security</th>
                      <th className="px-2 py-2 text-right">Exp. Return</th>
                      <th className="px-2 py-2">Risk</th>
                      <th className="px-2 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog?.map(it => {
                      const added = holdings.some(h => h.id === it.id && h.klass === activeClass);
                      return (
                        <tr key={it.id} className="border-b border-border/40 hover:bg-secondary/30">
                          <td className="px-3 py-2">
                            <div className="font-medium leading-tight">{it.name}</div>
                            <div className="text-[10px] text-muted-foreground">{it.sub} · {it.extra}</div>
                          </td>
                          <td className="px-2 py-2 text-right mono-num text-positive">{it.ret.toFixed(2)}%</td>
                          <td className="px-2 py-2 text-[10px]">{it.risk}</td>
                          <td className="px-2 py-2 text-right">
                            <button onClick={() => addHolding(it)} disabled={added}
                              className="inline-flex items-center justify-center w-6 h-6 border border-border rounded-sm hover:bg-secondary disabled:opacity-30">
                              <Plus className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* RIGHT: Selected Holdings */}
          <section className="col-span-12 lg:col-span-4">
            <div className="border border-border rounded-md bg-surface">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Proposed Holdings ({holdingsLive.length})</div>
                <div className="text-[10px] text-muted-foreground mono-num">{fmtINR(totals.allocated)} / {fmtINR(totalCorpus)}</div>
              </div>
              {holdingsLive.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Pick securities from the catalog to start building the proposal.
                </div>
              ) : (
                <div className="max-h-[calc(100vh-220px)] overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface border-b border-border">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-2 py-2">Holding</th>
                        <th className="px-2 py-2 text-right">Amount</th>
                        <th className="px-2 py-2 text-right">Wt%</th>
                        <th className="px-2 py-2 text-right">Exp IRR</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdingsLive.map(h => {
                        const cls = ASSET_CLASSES.find(a => a.key === h.klass)!;
                        const wt = totalCorpus > 0 ? (h.amount / totalCorpus) * 100 : 0;
                        return (
                          <tr key={h.uid} className="border-b border-border/40">
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] px-1 py-0.5 rounded-sm border border-border ${cls.tone}`}>{cls.label}</span>
                              </div>
                              <div className="font-medium leading-tight mt-0.5">{h.name}</div>
                              <div className="text-[10px] text-muted-foreground">{h.sub}</div>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <input type="number" value={h.amount} onChange={e => updateAmount(h.uid, +e.target.value || 0)}
                                className="w-24 bg-background border border-border rounded-sm px-1.5 py-1 text-xs mono-num text-right" />
                            </td>
                            <td className="px-2 py-2 text-right mono-num text-muted-foreground">{wt.toFixed(1)}</td>
                            <td className="px-2 py-2 text-right">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="mono-num text-positive cursor-help inline-flex items-center gap-1">
                                    {h.expectedReturn.toFixed(2)}% <Info className="w-2.5 h-2.5 opacity-60" />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-sm text-[11px] leading-relaxed">
                                  <div className="font-semibold mb-1">{cls.label} · Expected IRR Basis</div>
                                  {h.irrBasis}
                                </TooltipContent>
                              </Tooltip>
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button onClick={() => removeHolding(h.uid)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                    })}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-surface border-t-2 border-border">
                      <tr className="bg-secondary/30">
                        <td className="px-2 py-2">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio Total</div>
                          <div className="font-semibold leading-tight mt-0.5">Weighted across {holdingsLive.length} holding{holdingsLive.length !== 1 ? "s" : ""}</div>
                          <div className="text-[10px] text-muted-foreground">Risk: {riskLabel} · Horizon {projection.horizon}Y</div>
                        </td>
                        <td className="px-2 py-2 text-right mono-num font-semibold">{fmtINR(totals.allocated)}</td>
                        <td className="px-2 py-2 text-right mono-num font-semibold">{totalCorpus > 0 ? ((totals.allocated / totalCorpus) * 100).toFixed(1) : "0.0"}</td>
                        <td className="px-2 py-2 text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="mono-num text-positive font-bold cursor-help inline-flex items-center gap-1">
                                {totals.weightedReturn.toFixed(2)}% <Info className="w-2.5 h-2.5 opacity-60" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-sm text-[11px] leading-relaxed">
                              <div className="font-semibold mb-1">Overall Portfolio Expected Return</div>
                              Allocation-weighted average of each holding's expected IRR.
                              Projected FV in {projection.horizon}Y: <span className="mono-num">{fmtINR(projection.fv)}</span> (gain {fmtINR(projection.gain)}).
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </TooltipProvider>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

function SummaryRow({ label, value, tone = "text-foreground" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      <span className={`mono-num ${tone}`}>{value}</span>
    </div>
  );
}
