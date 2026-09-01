import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Info, FilePlus2, Download, Search, Sparkles, Lightbulb, SlidersHorizontal, ShieldCheck, LoaderCircle, ChevronDown, AlertTriangle, Check } from "lucide-react";
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

type Attrs = { sector: string; issuer: string; mcap: string; credit: string };

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
  sector: string;
  issuer: string;
  mcap: string;
  credit: string;
};

const fmtINR = fmtMoney;

const RISK_SCORE: Record<string, number> = {
  "Low": 1, "Low-Mod": 2, "Moderate": 3, "Mod-High": 4, "High": 5, "Very High": 6,
};

// ---------------- Constraint framework ----------------
export type Constraints = {
  maxPerHolding: number;
  maxPerSector: number;
  maxPerIssuer: number;
  classCaps: Record<AssetClassKey, number>;
  maxSmallCap: number;
  maxMidCap: number;
  minHighCredit: number;   // AAA / AA+ share of the credit-rated (Debt + FD) sleeve
  maxSubIG: number;        // below-A rated share of total portfolio
};

const DEFAULT_CONSTRAINTS: Constraints = {
  maxPerHolding: 15,
  maxPerSector: 25,
  maxPerIssuer: 20,
  classCaps: { MF: 60, EQ: 40, PMS: 25, AIF: 20, DEBT: 45, FD: 35, CASH: 10 },
  maxSmallCap: 15,
  maxMidCap: 25,
  minHighCredit: 70,
  maxSubIG: 5,
};

const CREDIT_ORDER = ["AAA", "AA+", "AA", "AA-", "A+", "A", "A-", "BBB+", "BBB", "BB", "B", "Unrated"];
const isHighCredit = (c: string) => /^AAA|^AA\+/.test(c);
const isSubIG = (c: string) => /^BB|^B$|^C/.test(c);
const isRated = (c: string) => c !== "Unrated" && !!c;

type CheckRow = { label: string; actual: number; limit: number; type: "max" | "min"; ok: boolean };

/**
 * Feasible water-filling solver. Caps are enforced *hard*: any group over its
 * cap is scaled back, and the freed weight is redistributed ONLY to holdings
 * that still have headroom in every group they belong to (so a capped group is
 * never re-inflated by a global renormalisation). Runs until every limit holds
 * or no headroom is left (infeasible policy).
 */
function solveConstrained(items: Array<Attrs & { klass: AssetClassKey }>, baseWeights: number[], c: Constraints): number[] {
  const n = items.length;
  if (n === 0) return [];
  let w = baseWeights.map(x => Math.max(1e-9, x));
  const sum = (idx: number[]) => idx.reduce((s, i) => s + w[i], 0);
  const total = () => w.reduce((a, b) => a + b, 0);
  { const s = total(); w = w.map(x => x / s); }

  const groups: Array<{ idx: number[]; cap: number }> = [];
  items.forEach((_, i) => groups.push({ idx: [i], cap: c.maxPerHolding / 100 }));
  const byKey = (key: (a: Attrs & { klass: AssetClassKey }) => string, cap: number) => {
    const m = new Map<string, number[]>();
    items.forEach((it, i) => { const k = key(it); if (!k) return; m.set(k, [...(m.get(k) || []), i]); });
    m.forEach(idx => groups.push({ idx, cap: cap / 100 }));
  };
  byKey(it => it.sector, c.maxPerSector);
  byKey(it => it.issuer, c.maxPerIssuer);
  (Object.keys(c.classCaps) as AssetClassKey[]).forEach(k => {
    const idx = items.map((it, i) => it.klass === k ? i : -1).filter(i => i >= 0);
    if (idx.length) groups.push({ idx, cap: c.classCaps[k] / 100 });
  });
  const smallIdx = items.map((it, i) => it.mcap === "Small Cap" ? i : -1).filter(i => i >= 0);
  if (smallIdx.length) groups.push({ idx: smallIdx, cap: c.maxSmallCap / 100 });
  const midIdx = items.map((it, i) => it.mcap === "Mid Cap" ? i : -1).filter(i => i >= 0);
  if (midIdx.length) groups.push({ idx: midIdx, cap: c.maxMidCap / 100 });
  const subIgIdx = items.map((it, i) => isSubIG(it.credit) ? i : -1).filter(i => i >= 0);
  if (subIgIdx.length) groups.push({ idx: subIgIdx, cap: c.maxSubIG / 100 });

  const ratedIdx = items.map((it, i) => isRated(it.credit) ? i : -1).filter(i => i >= 0);
  const hcIdx = ratedIdx.filter(i => isHighCredit(items[i].credit));
  const lowCreditIdx = ratedIdx.filter(i => !isHighCredit(items[i].credit));
  const EPS = 1e-7;

  for (let pass = 0; pass < 800; pass++) {
    // 1) enforce the minimum high-credit floor by trimming the low-credit sleeve
    if (hcIdx.length && lowCreditIdx.length) {
      const ratedTot = sum(ratedIdx);
      const hcTot = sum(hcIdx);
      if (ratedTot > 0 && hcTot / ratedTot < c.minHighCredit / 100 - EPS) {
        // max low-credit allowed given current high-credit weight
        const allowedLow = hcTot * (100 - c.minHighCredit) / Math.max(1e-9, c.minHighCredit);
        const lowTot = sum(lowCreditIdx);
        if (lowTot > allowedLow) {
          const f = allowedLow / lowTot;
          lowCreditIdx.forEach(i => { w[i] *= f; });
        }
      }
    }

    // 2) enforce every maximum
    let over = false;
    for (const g of groups) {
      const tot = sum(g.idx);
      if (tot > g.cap + EPS && tot > 0) {
        const f = g.cap / tot;
        g.idx.forEach(i => { w[i] *= f; });
        over = true;
      }
    }

    // 3) redistribute the shortfall only to holdings with headroom everywhere
    const t = total();
    const gap = 1 - t;
    if (Math.abs(gap) < 1e-9 && !over) break;
    if (gap > 1e-9) {
      const binding = new Set<number>();
      for (const g of groups) if (sum(g.idx) >= g.cap - EPS) g.idx.forEach(i => binding.add(i));
      // low-credit names must not grow past the high-credit floor
      if (hcIdx.length) {
        const ratedTot = sum(ratedIdx);
        if (ratedTot > 0 && sum(hcIdx) / ratedTot <= c.minHighCredit / 100 + EPS) lowCreditIdx.forEach(i => binding.add(i));
      }
      const free = w.map((_, i) => i).filter(i => !binding.has(i));
      if (!free.length) break; // policy infeasible with this universe — leave under-allocated rather than breach
      const freeTot = sum(free) || free.length;
      free.forEach(i => { w[i] += gap * ((w[i] || 1 / free.length) / freeTot); });
    } else if (gap < -1e-9) {
      const f = 1 / t;
      w = w.map(x => x * f);
    }
  }
  // final safety pass: never return a set that breaches a maximum
  for (let k = 0; k < 50; k++) {
    let fixed = false;
    for (const g of groups) {
      const tot = sum(g.idx);
      if (tot > g.cap + EPS && tot > 0) { const f = g.cap / tot; g.idx.forEach(i => { w[i] *= f; }); fixed = true; }
    }
    if (!fixed) break;
  }
  return w;
}


function checkConstraints(items: Array<Attrs & { klass: AssetClassKey; amount: number }>, total: number, c: Constraints): CheckRow[] {
  const pct = (v: number) => total > 0 ? (v / total) * 100 : 0;
  const rows: CheckRow[] = [];
  const push = (label: string, actual: number, limit: number, type: "max" | "min" = "max") =>
    rows.push({ label, actual, limit, type, ok: type === "max" ? actual <= limit + 0.05 : actual >= limit - 0.05 });

  const maxOf = (key: (i: typeof items[number]) => string) => {
    const m = new Map<string, number>();
    items.forEach(i => { const k = key(i); if (k) m.set(k, (m.get(k) || 0) + i.amount); });
    let top = ["—", 0] as [string, number];
    m.forEach((v, k) => { if (v > top[1]) top = [k, v]; });
    return top;
  };

  const topH = items.reduce((a, b) => (b.amount > (a?.amount ?? 0) ? b : a), items[0]);
  push(`Single holding${topH ? ` (${topH.sector ? "" : ""}max)` : ""}`, pct(topH?.amount || 0), c.maxPerHolding);
  const [sName, sVal] = maxOf(i => i.sector);
  push(`Sector max — ${sName}`, pct(sVal), c.maxPerSector);
  const [iName, iVal] = maxOf(i => i.issuer);
  push(`Issuer max — ${iName}`, pct(iVal), c.maxPerIssuer);
  (Object.keys(c.classCaps) as AssetClassKey[]).forEach(k => {
    const v = items.filter(i => i.klass === k).reduce((s, i) => s + i.amount, 0);
    if (v > 0) push(`${ASSET_CLASSES.find(a => a.key === k)!.label} cap`, pct(v), c.classCaps[k]);
  });
  const sc = items.filter(i => i.mcap === "Small Cap").reduce((s, i) => s + i.amount, 0);
  if (sc > 0) push("Small-cap exposure", pct(sc), c.maxSmallCap);
  const mc = items.filter(i => i.mcap === "Mid Cap").reduce((s, i) => s + i.amount, 0);
  if (mc > 0) push("Mid-cap exposure", pct(mc), c.maxMidCap);
  const rated = items.filter(i => isRated(i.credit)).reduce((s, i) => s + i.amount, 0);
  if (rated > 0) {
    const hc = items.filter(i => isHighCredit(i.credit)).reduce((s, i) => s + i.amount, 0);
    push("AAA/AA+ share of rated sleeve", (hc / rated) * 100, c.minHighCredit, "min");
  }
  const sub = items.filter(i => isSubIG(i.credit)).reduce((s, i) => s + i.amount, 0);
  push("Sub-investment-grade", pct(sub), c.maxSubIG);
  return rows;
}


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
  const [thesis, setThesis] = useState<null | {
    strategyLabel: string;
    profile: string;
    headline: string;
    bullets: string[];
    classNotes: { klass: AssetClassKey; label: string; pct: number; note: string }[];
    caveats: string[];
  }>(null);
  // Wipe holdings + thesis on region switch so we never carry over India product IDs into AE catalog.
  useEffect(() => { setHoldings([]); setThesis(null); }, [region]);

  // Catalog by class
  const catalog = useMemo(() => {
    const q = search.toLowerCase();
    const filt = <T extends { name: string }>(arr: T[]) => q ? arr.filter(x => x.name.toLowerCase().includes(q)) : arr;
    switch (activeClass) {
      case "MF": return filt(mutualFunds).map(m => ({ id: m.id, name: m.name, sub: `${m.subCategory} · ${m.amc}`, ret: m.returns3y, risk: m.risk, extra: `3Y · 5★ ${m.rating}`, attrs: { sector: `MF · ${m.assetClass}`, issuer: m.amc, mcap: /Small Cap|Mid Cap|Large Cap/.exec(m.subCategory)?.[0] ?? "—", credit: "Unrated" } as Attrs, _raw: m as MutualFund }));
      case "EQ": return filt(equityStocks).map(s => ({ id: s.id, name: s.name, sub: `${s.ticker} · ${s.sector} · ${s.marketCap}`, ret: s.expectedReturn, risk: s.risk, extra: `P/E ${s.pe.toFixed(1)} · ROE ${s.roe.toFixed(1)}%`, attrs: { sector: s.sector, issuer: s.name, mcap: s.marketCap, credit: "Unrated" } as Attrs, _raw: s as EquityStock }));
      case "PMS": return filt(pmsSchemes).map(p => ({ id: p.id, name: p.name, sub: `${p.strategy} · ${p.manager}`, ret: p.returns3y, risk: p.risk, extra: `Alpha ${p.alpha.toFixed(1)} · Fee ${p.fixedFee.toFixed(2)}%`, attrs: { sector: `PMS · ${p.strategy}`, issuer: p.manager, mcap: /Small Cap|Mid & Small Cap|Large Cap/.exec(p.strategy)?.[0] ?? "—", credit: "Unrated" } as Attrs, _raw: p as PMS }));
      case "AIF": return filt(aifSchemes).map(a => ({ id: a.id, name: a.name, sub: `${a.sebiCategory} · ${a.subStrategy}`, ret: a.netIRR, risk: a.risk, extra: `Vintage ${a.vintage} · MOIC ${a.moic.toFixed(2)}x`, attrs: { sector: `AIF · ${a.subStrategy}`, issuer: a.manager, mcap: "—", credit: "Unrated" } as Attrs, _raw: a as AIF }));
      case "DEBT": return filt(bonds).map(b => ({ id: b.id, name: b.name, sub: `${b.bondType} · ${b.rating}`, ret: b.ytm, risk: b.risk, extra: `Coupon ${b.couponRate}% · ${b.residualTenorYears}Y`, attrs: { sector: b.bondType, issuer: b.issuer, mcap: "—", credit: b.rating } as Attrs, _raw: b as Bond }));
      case "FD": return filt(fixedDeposits).slice(0, 40).map(f => ({ id: f.id, name: f.name, sub: `${f.subCategory} · ${f.tenureMonths}M`, ret: f.interestRate, risk: "Low-Mod", extra: `${f.rating} · ${f.payout}`, attrs: { sector: `FD · ${f.subCategory}`, issuer: f.issuer, mcap: "—", credit: f.rating } as Attrs, _raw: f as FixedDeposit }));
      case "CASH": return [{ id: "CASH-LIQ", name: "Liquid / Savings Sweep", sub: "User-defined cash assumption", ret: cashRate, risk: "Low", extra: "Editable rate above", attrs: { sector: "Cash", issuer: "Cash", mcap: "—", credit: "AAA" } as Attrs, _raw: null as any }];
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
      ...item.attrs,
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
  const [constrained, setConstrained] = useState(true);
  const [constraints, setConstraints] = useState<Constraints>(DEFAULT_CONSTRAINTS);
  const [creating, setCreating] = useState(false);
  function handleAutoCreate() {
    if (creating) return;
    setCreating(true);
    window.setTimeout(() => {
      autoCreatePortfolio();
      setCreating(false);
    }, 8000);
  }
  const setC = (k: keyof Omit<Constraints, "classCaps">, v: number) => setConstraints(p => ({ ...p, [k]: v }));
  const setClassCap = (k: AssetClassKey, v: number) => setConstraints(p => ({ ...p, classCaps: { ...p.classCaps, [k]: v } }));
  const RF = 6.5; // risk-free proxy for Sharpe (10Y G-Sec)

  function finalWeights(items: Array<Attrs & { klass: AssetClassKey }>, base: number[]) {
    if (!constrained) {
      const s = base.reduce((a, b) => a + b, 0) || 1;
      return base.map(w => w / s);
    }
    return solveConstrained(items, base, constraints);
  }

  function allocByWeights(weights: number[]) {
    const sum = weights.reduce((s, w) => s + w, 0);
    if (sum <= 0) return;
    setHoldings(prev => {
      const w = finalWeights(prev, weights);
      return prev.map((h, i) => ({ ...h, amount: Math.floor((w[i] ?? 0) * totalCorpus) }));
    });
  }


  function autoAllocate(strategy: AllocStrategy = allocStrategy) {
    if (holdings.length === 0) return;
    const live = holdings.map(h => h.klass === "CASH" ? { ...h, expectedReturn: cashRate } : h);
    switch (strategy) {
      case "equal": {
        allocByWeights(live.map(() => 1));
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
    type Cand = Attrs & { klass: AssetClassKey; id: string; name: string; sub: string; ret: number; risk: string };
    const mf: Cand[]  = mutualFunds.map(m => ({ klass: "MF", id: m.id, name: m.name, sub: `${m.subCategory} · ${m.amc}`, ret: m.returns3y, risk: m.risk, sector: `MF · ${m.assetClass}`, issuer: m.amc, mcap: /Small Cap|Mid Cap|Large Cap/.exec(m.subCategory)?.[0] ?? "—", credit: "Unrated" }));
    const eq: Cand[]  = equityStocks.map(s => ({ klass: "EQ", id: s.id, name: s.name, sub: `${s.ticker} · ${s.sector} · ${s.marketCap}`, ret: s.expectedReturn, risk: s.risk, sector: s.sector, issuer: s.name, mcap: s.marketCap, credit: "Unrated" }));
    const pms: Cand[] = pmsSchemes.map(p => ({ klass: "PMS", id: p.id, name: p.name, sub: `${p.strategy} · ${p.manager}`, ret: p.returns3y, risk: p.risk, sector: `PMS · ${p.strategy}`, issuer: p.manager, mcap: /Small Cap|Large Cap/.exec(p.strategy)?.[0] ?? "—", credit: "Unrated" }));
    const aif: Cand[] = aifSchemes.map(a => ({ klass: "AIF", id: a.id, name: a.name, sub: `${a.sebiCategory} · ${a.subStrategy}`, ret: a.netIRR, risk: a.risk, sector: `AIF · ${a.subStrategy}`, issuer: a.manager, mcap: "—", credit: "Unrated" }));
    const dbt: Cand[] = bonds.map(b => ({ klass: "DEBT", id: b.id, name: b.name, sub: `${b.bondType} · ${b.rating}`, ret: b.ytm, risk: b.risk, sector: b.bondType, issuer: b.issuer, mcap: "—", credit: b.rating }));
    const fd: Cand[]  = fixedDeposits.map(f => ({ klass: "FD", id: f.id, name: f.name, sub: `${f.subCategory} · ${f.tenureMonths}M`, ret: f.interestRate, risk: "Low-Mod", sector: `FD · ${f.subCategory}`, issuer: f.issuer, mcap: "—", credit: f.rating }));
    const cash: Cand  = { klass: "CASH", id: "CASH-LIQ", name: "Liquid / Savings Sweep", sub: "User-defined cash assumption", ret: cashRate, risk: "Low", sector: "Cash", issuer: "Cash", mcap: "—", credit: "AAA" };


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
    const solved = finalWeights(picks, weights!);

    const stamp = Date.now();
    const newHoldings: Holding[] = picks.map((p, i) => ({
      uid: `${p.klass}-${p.id}-${stamp}-${i}`,
      klass: p.klass,
      id: p.id,
      name: p.name,
      sub: p.sub,
      amount: Math.floor((solved[i] ?? 0) * totalCorpus),
      expectedReturn: p.klass === "CASH" ? cashRate : p.ret,
      irrBasis: irrBasisFor(p.klass, p.name),
      risk: p.risk,
      sector: p.sector,
      issuer: p.issuer,
      mcap: p.mcap,
      credit: p.credit,
    }));

    setHoldings(newHoldings);

    // ---- Build commentary / investment thesis ----
    const stratMeta: Record<AllocStrategy, { label: string; how: string }> = {
      equal:   { label: "Equal Weight (1/N)",     how: "sizes every pick to the same rupee amount — a naive but bias-free baseline" },
      sharpe:  { label: "Max Sharpe Ratio",       how: "over-weights holdings that deliver the highest return per unit of risk (excess return over 6.5% ÷ risk score)" },
      maxret:  { label: "Max Return",             how: "aggressively tilts to the highest expected-return holdings using cubic emphasis" },
      minrisk: { label: "Min Risk (Defensive)",   how: "inversely weights by risk² so safer holdings dominate — capital preservation first" },
      maxrisk: { label: "Max Risk (Aggressive)",  how: "concentrates capital in the highest-risk holdings (risk³ weighting) chasing maximum growth" },
    };
    const meta = stratMeta[allocStrategy];
    const classTotals = new Map<AssetClassKey, number>();
    let totalAlloc = 0;
    newHoldings.forEach(h => {
      classTotals.set(h.klass, (classTotals.get(h.klass) || 0) + h.amount);
      totalAlloc += h.amount;
    });
    const classNoteMap: Record<AssetClassKey, string> = {
      MF:   "Diversified equity/debt via professionally managed schemes — daily liquidity and low ticket size.",
      EQ:   "Direct equity for higher alpha potential and full control over holding period and tax treatment.",
      PMS:  "Concentrated, actively managed strategies for HNI capital — targets alpha over broad indices.",
      AIF:  "Alternative exposures (private equity / credit / long-short) uncorrelated to listed markets.",
      DEBT: "Fixed income sleeve — anchors yield and dampens equity drawdowns.",
      FD:   "Bank/NBFC fixed deposits — sovereign-adjacent capital safety with predictable coupons.",
      CASH: "Idle liquidity buffer for opportunistic deployment and near-term expenses.",
    };
    const classNotes = ASSET_CLASSES
      .map(c => ({
        klass: c.key,
        label: c.label,
        pct: totalAlloc > 0 ? ((classTotals.get(c.key) || 0) / totalAlloc) * 100 : 0,
        note: classNoteMap[c.key],
      }))
      .filter(x => x.pct > 0.5)
      .sort((a, b) => b.pct - a.pct);

    const wR = totalAlloc > 0
      ? newHoldings.reduce((s, h) => s + h.expectedReturn * h.amount, 0) / totalAlloc
      : 0;
    const wRisk = totalAlloc > 0
      ? newHoldings.reduce((s, h) => s + (RISK_SCORE[h.risk] || 3) * h.amount, 0) / totalAlloc
      : 0;
    const wRiskLabel = wRisk < 1.8 ? "Low" : wRisk < 2.8 ? "Low-Moderate" : wRisk < 3.8 ? "Moderate" : wRisk < 4.6 ? "Mod-High" : wRisk < 5.4 ? "High" : "Very High";
    const horizon = Math.max(1, parseInt(prospect.horizonYears) || 5);
    const fv = totalCorpus * Math.pow(1 + wR / 100, horizon);

    const bullets: string[] = [];
    bullets.push(`Starting universe was filtered to holdings with a risk score ≤ ${policy.cap} to honour the ${profile} mandate.`);
    bullets.push(`From that universe, top candidates were ranked ${allocStrategy === "sharpe" ? "by Sharpe score" : allocStrategy === "maxret" || allocStrategy === "equal" ? "by expected return" : "by risk-weighted score"} within each asset class — ${policy.mfN} MF · ${policy.eqN} Equity · ${policy.pmsN} PMS · ${policy.aifN} AIF · ${policy.dbtN} Debt · ${policy.fdN} FD${policy.cash ? " · +Cash sleeve" : ""}.`);
    bullets.push(`Rupee weights were then set by the ${meta.label} rule, which ${meta.how}.`);
    bullets.push(`A profile tilt was layered on top — growthBoost=${policy.growthBoost.toFixed(1)} lifts higher-risk holdings, defBoost=${policy.defBoost.toFixed(1)} lifts lower-risk holdings — to keep the final mix aligned to a ${profile} investor.`);
    bullets.push(constrained
      ? `Weights were then passed through the constraint engine (max ${constraints.maxPerHolding}% per holding, ${constraints.maxPerSector}% per sector, ${constraints.maxPerIssuer}% per issuer, asset-class caps, small-cap ≤ ${constraints.maxSmallCap}%, AAA/AA+ ≥ ${constraints.minHighCredit}% of the rated sleeve, sub-IG ≤ ${constraints.maxSubIG}%) — breaching groups are trimmed and the excess redistributed until every limit holds.`
      : `No exposure constraints were applied — this is an unconstrained portfolio, so sector, issuer, market-cap and credit exposures can be concentrated.`);
    bullets.push(`Resulting portfolio: ${newHoldings.length} holdings, weighted expected IRR ${wR.toFixed(2)}%, portfolio risk ${wRiskLabel}, projected FV in ${horizon}Y ≈ ${fmtINR(fv)}.`);


    const caveats: string[] = [
      "Expected returns are point estimates from research inputs (3Y CAGR, YTM, net IRR, forward earnings) — not guarantees; realised returns will vary with markets, credit events and manager skill.",
      "Risk scores are heuristic bands (Low → Very High); a full mean-variance optimisation with a live covariance matrix will refine weights further.",
      "This is a starting model — RM to overlay client-specific liquidity needs, tax posture, existing exposures and any exclusion lists before execution.",
    ];

    setThesis({
      strategyLabel: meta.label,
      profile,
      headline: `${profile} portfolio built with ${meta.label} across ${newHoldings.length} holdings, targeting ${wR.toFixed(2)}% IRR at ${wRiskLabel} risk.`,
      bullets,
      classNotes,
      caveats,
    });
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

  const compliance = useMemo(
    () => holdingsLive.length ? checkConstraints(holdingsLive, holdingsLive.reduce((s, h) => s + h.amount, 0), constraints) : [],
    [holdingsLive, constraints]
  );
  const breaches = compliance.filter(r => !r.ok).length;
  const [showCompliance, setShowCompliance] = useState(false);


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
        <header className="border-b border-border bg-surface/90 backdrop-blur sticky top-0 z-30">
          <div className="pl-12 pr-5 lg:pr-8 py-3 flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Back to screener</Link>
            <span className="h-4 w-px bg-border" />
            <div className="text-[11px] text-muted-foreground"><span className="text-foreground font-medium">New proposal</span><span className="mx-1.5">/</span>{region}</div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-muted-foreground border border-border rounded-sm px-2 py-1"><span className="w-1.5 h-1.5 rounded-full bg-positive" /> Draft</span>
              <button onClick={exportProposal} className="text-xs inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-border rounded-sm hover:bg-secondary"><Download className="w-3.5 h-3.5" /> Export CSV</button>
            </div>
          </div>
        </header>

        <main className="px-5 lg:px-8 py-6 max-w-[1680px] mx-auto space-y-6 bg-surface-elevated/25">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-primary font-semibold mb-1">Build workspace</div>
              <h2 className="text-xl font-semibold tracking-tight">Shape the recommendation</h2>
              <p className="text-xs text-muted-foreground mt-1">Set the client brief, choose a construction style, then curate the investable universe.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center font-semibold">1</span> Configure <span className="w-8 h-px bg-border" />
              <span className="w-5 h-5 rounded-full border border-border inline-flex items-center justify-center">2</span> Curate <span className="w-8 h-px bg-border" />
              <span className="w-5 h-5 rounded-full border border-border inline-flex items-center justify-center">3</span> Review
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.12fr_1.25fr_0.9fr] gap-4 items-start">
            <section className="border border-border rounded-md bg-surface shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-elevated/45 flex items-center gap-2"><span className="w-7 h-7 rounded-sm bg-primary/10 text-primary inline-flex items-center justify-center"><FilePlus2 className="w-3.5 h-3.5" /></span><div><div className="text-xs font-semibold">Client brief</div><div className="text-[10px] text-muted-foreground">Who is this proposal for?</div></div></div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2"><Field label="Client name"><input value={prospect.name} onChange={e => setProspect({ ...prospect, name: e.target.value })} placeholder="Enter prospect name" className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs" /></Field></div>
                <Field label="Age"><input type="number" value={prospect.age} onChange={e => setProspect({ ...prospect, age: e.target.value })} placeholder="—" className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs mono-num" /></Field>
                <Field label="Horizon (years)"><input type="number" value={prospect.horizonYears} onChange={e => setProspect({ ...prospect, horizonYears: e.target.value })} className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs mono-num" /></Field>
                <Field label="Risk profile"><select value={prospect.riskProfile} onChange={e => setProspect({ ...prospect, riskProfile: e.target.value })} className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs">{["Conservative", "Moderate", "Aggressive", "Very Aggressive"].map(o => <option key={o}>{o}</option>)}</select></Field>
                <Field label="Primary goal"><select value={prospect.goal} onChange={e => setProspect({ ...prospect, goal: e.target.value })} className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs">{["Wealth Creation", "Retirement", "Child Education", "Tax Saving", "Income"].map(o => <option key={o}>{o}</option>)}</select></Field>
              </div>
            </section>

            <section className="border border-border rounded-md bg-surface shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-elevated/45 flex items-center gap-2"><span className="w-7 h-7 rounded-sm bg-secondary text-foreground inline-flex items-center justify-center"><Sparkles className="w-3.5 h-3.5" /></span><div><div className="text-xs font-semibold">Construction engine</div><div className="text-[10px] text-muted-foreground">Capital, strategy and guardrails</div></div></div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="col-span-2"><Field label={`Total corpus · ${fmtINR(totalCorpus)}`}><input type="number" value={totalCorpus} onChange={e => setTotalCorpus(Math.max(0, +e.target.value || 0))} className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs mono-num" /></Field></div>
                <Field label="Cash / idle return (%)"><input type="number" step="0.1" value={cashRate} onChange={e => setCashRate(+e.target.value || 0)} className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs mono-num" /></Field>
                <Field label="Optimisation strategy"><select value={allocStrategy} onChange={e => setAllocStrategy(e.target.value as AllocStrategy)} className="w-full bg-background border border-border rounded-sm px-2.5 py-2 text-xs"><option value="equal">Equal Weight (1/N)</option><option value="sharpe">Max Sharpe Ratio</option><option value="maxret">Max Return</option><option value="minrisk">Min Risk (Defensive)</option><option value="maxrisk">Max Risk (Aggressive)</option></select></Field>
                <div className="col-span-2 flex items-center justify-between gap-3 rounded-sm border border-border bg-background px-3 py-2.5"><div><div className="text-xs font-medium">Constrained portfolio</div><div className="text-[10px] text-muted-foreground">Apply house limits to each exposure</div></div><input type="checkbox" checked={constrained} onChange={e => setConstrained(e.target.checked)} className="accent-primary w-4 h-4" /></div>
                <button onClick={handleAutoCreate} disabled={creating} className="col-span-2 text-xs px-3 py-2.5 border border-primary/30 bg-primary text-primary-foreground rounded-sm hover:opacity-90 disabled:opacity-60 font-semibold inline-flex items-center justify-center gap-2">{creating ? <><LoaderCircle className="w-3.5 h-3.5 animate-spin" /> Creating portfolio…</> : <><Sparkles className="w-3.5 h-3.5" /> Auto-create portfolio</>}</button>
                <button onClick={() => autoAllocate()} disabled={holdings.length === 0} className="col-span-2 text-[11px] px-3 py-2 border border-border rounded-sm hover:bg-secondary disabled:opacity-40 font-medium">Apply allocation to current holdings</button>
              </div>
            </section>

            <section className="border border-border rounded-md bg-surface shadow-card overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-surface-elevated/45 flex items-center gap-2"><span className="w-7 h-7 rounded-sm bg-secondary text-foreground inline-flex items-center justify-center"><ShieldCheck className="w-3.5 h-3.5" /></span><div><div className="text-xs font-semibold">Proposal snapshot</div><div className="text-[10px] text-muted-foreground">Live portfolio health</div></div></div>
              <div className="p-4 space-y-3"><div className="flex items-end justify-between"><span className="text-[11px] text-muted-foreground">Allocated</span><span className="text-xl font-semibold mono-num">{fmtINR(totals.allocated)}</span></div><div className="h-1.5 bg-secondary rounded-sm overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, totalCorpus ? totals.allocated / totalCorpus * 100 : 0)}%` }} /></div><div className="grid grid-cols-2 gap-y-3 gap-x-2 pt-1"><SummaryRow label="Holdings" value={String(holdingsLive.length)} /><SummaryRow label="Unallocated" value={fmtINR(totals.unallocated)} tone={totals.unallocated < 0 ? "text-negative" : "text-muted-foreground"} /><SummaryRow label="Expected return" value={`${totals.weightedReturn.toFixed(2)}%`} tone="text-positive font-semibold" /><SummaryRow label="Portfolio risk" value={riskLabel} /></div><div className="border-t border-border pt-3"><SummaryRow label={`Projected FV · ${projection.horizon}Y`} value={fmtINR(projection.fv)} tone="font-semibold" /><SummaryRow label="Total gain" value={fmtINR(projection.gain)} tone="text-positive" /></div></div>
              {compliance.length > 0 && (
                <div className="border-t border-border">
                  <button onClick={() => setShowCompliance(v => !v)} className="w-full px-4 py-3 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:bg-secondary/50 transition-colors">
                    <ShieldCheck className="w-3 h-3" /> Compliance
                    <span className={`ml-auto normal-case tracking-normal ${breaches ? "text-destructive" : "text-positive"}`}>{breaches ? `${breaches} breach${breaches > 1 ? "es" : ""}` : "All checks pass"}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showCompliance ? "rotate-180" : ""}`} />
                  </button>
                  {showCompliance && (
                    <div className="px-4 pb-3 space-y-1.5">
                      <div className="text-[10px] text-muted-foreground">{breaches ? "These exposures are outside house policy. Trim the flagged group or raise the limit under Exposure guardrails." : "Every house limit is currently satisfied."}</div>
                      {[...compliance].sort((a, b) => Number(a.ok) - Number(b.ok)).map((r, i) => {
                        const gap = r.type === "max" ? r.actual - r.limit : r.limit - r.actual;
                        return (
                          <div key={`${r.label}-${i}`} className={`rounded-sm border px-2.5 py-2 ${r.ok ? "border-border bg-background" : "border-destructive/40 bg-destructive/10"}`}>
                            <div className="flex items-center gap-1.5">
                              {r.ok ? <Check className="w-3 h-3 text-positive shrink-0" /> : <AlertTriangle className="w-3 h-3 text-destructive shrink-0" />}
                              <span className="text-[11px] font-medium truncate">{r.label}</span>
                              <span className={`ml-auto text-[11px] mono-num ${r.ok ? "text-muted-foreground" : "text-destructive font-semibold"}`}>{r.actual.toFixed(1)}% / {r.type === "max" ? "≤" : "≥"} {r.limit}%</span>
                            </div>
                            {!r.ok && <div className="text-[10px] text-destructive/90 mt-1 pl-4.5">{r.type === "max" ? `Over limit by ${gap.toFixed(1)} pts — reduce this exposure by about ${fmtINR((gap / 100) * totals.allocated)}.` : `Short of minimum by ${gap.toFixed(1)} pts — add about ${fmtINR((gap / 100) * totals.allocated)} of AAA/AA+ paper.`}</div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {constrained && <section className="border border-border rounded-md bg-surface px-4 py-3"><div className="flex items-center gap-2 mb-3"><SlidersHorizontal className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-semibold">Exposure guardrails</span><span className="text-[10px] text-muted-foreground">Allocation is trimmed and redistributed until limits are met.</span><button onClick={() => setConstraints(DEFAULT_CONSTRAINTS)} className="ml-auto text-[10px] text-muted-foreground hover:text-foreground">Reset house policy</button></div><div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">{[<NumField key="holding" label="Max / holding %" value={constraints.maxPerHolding} onChange={v => setC("maxPerHolding", v)} />, <NumField key="sector" label="Max / sector %" value={constraints.maxPerSector} onChange={v => setC("maxPerSector", v)} />, <NumField key="issuer" label="Max / issuer %" value={constraints.maxPerIssuer} onChange={v => setC("maxPerIssuer", v)} />, <NumField key="small" label="Small cap max %" value={constraints.maxSmallCap} onChange={v => setC("maxSmallCap", v)} />, <NumField key="mid" label="Mid cap max %" value={constraints.maxMidCap} onChange={v => setC("maxMidCap", v)} />, <NumField key="sub" label="Sub-IG max %" value={constraints.maxSubIG} onChange={v => setC("maxSubIG", v)} />, <NumField key="credit" label="AAA / AA+ min %" value={constraints.minHighCredit} onChange={v => setC("minHighCredit", v)} />]}</div><div className="mt-3 pt-3 border-t border-border grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">{ASSET_CLASSES.map(c => <NumField key={c.key} label={`${c.label} cap %`} value={constraints.classCaps[c.key]} onChange={v => setClassCap(c.key, v)} />)}</div></section>}

          {/* BOTTOM: Universe + Proposed Portfolio */}
          <div className="grid grid-cols-12 gap-5 items-start">
          {/* LEFT: Catalog */}
          <section className="col-span-12 lg:col-span-7 space-y-4">

            <div className="border border-border rounded-md bg-surface shadow-card overflow-hidden">
              <div className="border-b border-border flex flex-wrap bg-background/40">
                {ASSET_CLASSES.map(c => (
                  <button key={c.key} onClick={() => { setActiveClass(c.key); setSearch(""); }}
                    className={`px-3 py-2 text-[11px] font-medium tracking-wide border-b-2 -mb-px ${activeClass === c.key ? `border-primary text-foreground bg-surface` : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold">Investable universe</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5"><span className="text-foreground">{ASSET_CLASSES.find(a => a.key === activeClass)?.product}</span> · {catalog?.length ?? 0} securities available</div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-xs shrink-0">
                  <Search className="w-3 h-3 text-muted-foreground" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search securities…" className="bg-background border border-border rounded-sm px-2.5 py-1.5 text-xs w-44" />
                </div>
              </div>
              <div className="max-h-[590px] overflow-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-surface border-b border-border z-10">
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
           <section className="col-span-12 lg:col-span-5 lg:sticky lg:top-[92px]">
             <div className="border border-border rounded-md bg-surface shadow-card overflow-hidden">
               <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                 <div><div className="text-xs font-semibold">Proposed portfolio</div><div className="text-[10px] text-muted-foreground mt-0.5">Review, size and refine your holdings</div></div>
                 <div className="text-[10px] text-muted-foreground mono-num">{fmtINR(totals.allocated)} / {fmtINR(totalCorpus)}</div>
               </div>
               {holdingsLive.length === 0 ? (
                 <div className="min-h-[590px] flex flex-col items-center justify-center text-center bg-background/25 px-8">
                    <div className="w-12 h-12 mb-4 rounded-full border border-dashed border-primary/40 bg-primary/5 flex items-center justify-center"><Plus className="w-4 h-4 text-primary" /></div>
                    <div className="text-sm font-semibold text-foreground">Start shaping the portfolio</div>
                    <div className="text-[11px] leading-relaxed text-muted-foreground mt-1.5 max-w-[240px]">Choose securities from the investable universe. Your allocations, risk and projected value will appear here.</div>
                    <div className="mt-6 grid grid-cols-3 gap-2 w-full max-w-[300px] text-left">
                      <div className="border border-border bg-surface rounded-sm px-2.5 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Holdings</div><div className="text-xs font-semibold mt-1">0</div></div>
                      <div className="border border-border bg-surface rounded-sm px-2.5 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Allocated</div><div className="text-xs font-semibold mt-1">0%</div></div>
                      <div className="border border-border bg-surface rounded-sm px-2.5 py-2"><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Risk</div><div className="text-xs font-semibold mt-1">—</div></div>
                    </div>
                  </div>
              ) : (
                <div className="max-h-[590px] overflow-auto">
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
          </div>

          {thesis && (
            <section className="mt-4 rounded-md border border-border bg-surface">
              <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <div>
                  <div className="text-sm font-semibold">Portfolio Thesis</div>
                  <div className="text-[11px] text-muted-foreground">How this portfolio was constructed · {thesis.strategyLabel} · {thesis.profile}</div>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm leading-relaxed">{thesis.headline}</p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Construction Logic</div>
                    <ol className="space-y-1.5 list-decimal pl-4">
                      {thesis.bullets.map((b, i) => (
                        <li key={i} className="text-[12px] leading-relaxed text-muted-foreground">{b}</li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Why each asset class</div>
                    <div className="space-y-2">
                      {thesis.classNotes.map((c) => (
                        <div key={c.klass} className="flex gap-3">
                          <div className="mono-num text-[12px] font-semibold w-14 shrink-0 text-right">{c.pct.toFixed(1)}%</div>
                          <div>
                            <div className="text-[12px] font-medium leading-tight">{c.label}</div>
                            <div className="text-[11px] text-muted-foreground leading-relaxed">{c.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Caveats &amp; assumptions</div>
                  <ul className="space-y-1 list-disc pl-4">
                    {thesis.caveats.map((c, i) => (
                      <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}



          {creating && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4 px-8 py-7 rounded-md border border-border bg-surface shadow-lg">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-2 border-border" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-primary" />
                </div>
                <div className="text-sm font-medium">Your portfolio is being created.</div>
                <div className="text-[11px] text-muted-foreground">Screening the universe and applying {constrained ? "exposure constraints" : "strategy weights"}…</div>
                <div className="w-56 h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-[proposalProgress_8s_linear_forwards]" style={{ width: 0 }} />
                </div>
              </div>
              <style>{`@keyframes proposalProgress{from{width:0%}to{width:100%}}`}</style>
            </div>
          )}
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

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 truncate">{label}</div>
      <input
        type="number" min={0} max={100} value={value}
        onChange={e => onChange(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
        className="w-full text-xs px-2 py-1 border border-border rounded-sm bg-background mono-num"
      />
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
