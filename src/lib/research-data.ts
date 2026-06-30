export type Category = "MF" | "FD" | "INS" | "PMS" | "AIF" | "EQ" | "BOND";

export type RiskLevel = "Low" | "Low-Mod" | "Moderate" | "Mod-High" | "High" | "Very High";

export interface MutualFund {
  category: "MF";
  id: string;
  name: string;
  amc: string;
  subCategory: string; // Large Cap, Mid Cap, Hybrid, Debt etc.
  assetClass: "Equity" | "Debt" | "Hybrid" | "Commodity";
  nav: number;
  aum: number; // in crore
  expenseRatio: number;
  returns1y: number;
  returns3y: number;
  returns5y: number;
  ytdReturn: number;
  sharpe: number;
  sortino: number;
  alpha: number;
  beta: number;
  maxDrawdown: number; // negative %, e.g. -22.5
  risk: RiskLevel;
  rating: number; // 1-5
  minInvestment: number;
  sipMin: number;
  exitLoad: string;
  exitLoadDays: number;
  lockInYears: number;
  taxation: "Equity" | "Debt" | "Hybrid";
  benchmark: string;
  fundManager: string;
  inceptionYear: number;
}

export interface FixedDeposit {
  category: "FD";
  id: string;
  name: string; // scheme
  issuer: string; // bank/NBFC
  subCategory: "Public Bank" | "Private Bank" | "Small Finance" | "NBFC" | "Corporate";
  tenureMonths: number;
  interestRate: number;
  seniorRate: number;
  compounding: "Monthly" | "Quarterly" | "Half-Yearly" | "Annually" | "At Maturity";
  minInvestment: number;
  maxInvestment: number | null;
  premature: boolean;
  rating: string; // AAA/AA+
  insuredDICGC: boolean;
  payout: "Cumulative" | "Non-Cumulative";
}

export interface Insurance {
  category: "INS";
  id: string;
  name: string;
  insurer: string;
  subCategory: "Term" | "ULIP" | "Endowment" | "Health" | "Annuity" | "Child";
  sumAssured: number;
  premiumAnnual: number;
  policyTermYears: number;
  ppt: number; // premium paying term
  claimSettlement: number; // %
  solvencyRatio: number;
  irr?: number;
  taxBenefit: string;
  riders: string[];
  rating: number; // 1-5
}

export interface PMS {
  category: "PMS";
  id: string;
  name: string;
  manager: string; // PMS house
  structure: "Discretionary" | "Non-Discretionary" | "Advisory";
  strategy: "Multi Cap" | "Large Cap" | "Mid & Small Cap" | "Small Cap" | "Thematic" | "Sector - Banking & Financials" | "Sector - Pharma" | "Contra / Value" | "Debt" | "Hybrid";
  benchmark: string;
  aum: number; // in crore
  minInvestment: number; // SEBI floor ₹50L
  returns1y: number;
  returns3y: number;
  returns5y: number;
  alpha: number;
  sharpe: number;
  beta: number;
  maxDrawdown: number; // %
  fixedFee: number; // % p.a.
  performanceFee: string; // e.g. 20% over 10% hurdle
  exitLoad: string;
  inception: string;
  risk: RiskLevel;
  rating: number;
}

export interface AIF {
  category: "AIF";
  id: string;
  name: string;
  manager: string;
  sebiCategory: "Category I" | "Category II" | "Category III";
  subStrategy: "Venture Capital" | "SME Fund" | "Social Venture" | "Infrastructure" | "Private Equity" | "Real Estate" | "Private Credit / Debt" | "Distressed / Special Sit." | "Long-Short Hedge" | "Long-Only Equity";
  structure: "Close-Ended" | "Open-Ended";
  vintage: number;
  corpusTarget: number; // crore
  commitments: number; // crore
  minInvestment: number; // SEBI floor ₹1 Cr
  tenureYears: number;
  drawdownStatus: number; // % capital called
  targetIRR: number;
  netIRR: number; // realised/MTM
  moic: number; // multiple
  hurdleRate: number;
  carry: number; // %
  managementFee: number; // %
  domicile: "India - GIFT IFSC" | "India - Onshore";
  risk: RiskLevel;
  rating: number;
}

export type Product = MutualFund | FixedDeposit | Insurance | PMS | AIF;

const AMCS = ["HDFC", "SBI", "ICICI Pru", "Axis", "Nippon India", "Kotak", "Mirae", "Parag Parikh", "DSP", "Aditya Birla SL", "UTI", "Quant"];
const MF_SUB = ["Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "ELSS", "Hybrid Aggressive", "Hybrid Conservative", "Liquid", "Corporate Bond", "Gilt", "Index"];
const BENCH = ["NIFTY 50 TRI", "NIFTY 500 TRI", "NIFTY Midcap 150 TRI", "NIFTY Smallcap 250 TRI", "CRISIL Composite Bond", "NIFTY Liquid"];

const BANKS = ["SBI", "HDFC Bank", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "PNB", "Bank of Baroda", "IndusInd", "Yes Bank", "IDFC FIRST"];
const SFB = ["AU Small Finance", "Equitas SFB", "Ujjivan SFB", "Jana SFB", "Suryoday SFB", "Unity SFB"];
const NBFC = ["Bajaj Finance", "Shriram Finance", "Mahindra Finance", "LIC Housing", "HDFC Ltd", "PNB Housing"];

const INSURERS = ["LIC", "HDFC Life", "ICICI Prudential Life", "SBI Life", "Max Life", "Bajaj Allianz", "Tata AIA", "Kotak Life", "Aditya Birla Sun Life", "Star Health", "Niva Bupa", "Care Health"];
const INS_SUB: Insurance["subCategory"][] = ["Term", "ULIP", "Endowment", "Health", "Annuity", "Child"];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const rand = seeded(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const r = (min: number, max: number, dp = 2) => +(min + rand() * (max - min)).toFixed(dp);

const mutualFundsIN: MutualFund[] = Array.from({ length: 38 }, (_, i) => {
  const sub = pick(MF_SUB);
  const isDebt = ["Liquid", "Corporate Bond", "Gilt"].includes(sub);
  const isHybrid = sub.startsWith("Hybrid");
  const isElss = sub === "ELSS";
  const assetClass: MutualFund["assetClass"] = isDebt ? "Debt" : isHybrid ? "Hybrid" : "Equity";
  const amc = pick(AMCS);
  const r3 = r(isDebt ? 5 : 6, isDebt ? 8.5 : 28);
  const sharpe = r(0.2, 1.9);
  return {
    category: "MF",
    id: `MF-${1000 + i}`,
    name: `${amc} ${sub} Fund`,
    amc,
    subCategory: sub,
    assetClass,
    nav: r(15, 850),
    aum: Math.round(r(200, 65000, 0)),
    expenseRatio: r(0.15, 2.25),
    returns1y: r(isDebt ? 5 : -8, isDebt ? 9 : 42),
    returns3y: r3,
    returns5y: r(isDebt ? 5.5 : 8, isDebt ? 8 : 22),
    ytdReturn: r(isDebt ? 2 : -6, isDebt ? 6 : 22),
    sharpe,
    sortino: +(sharpe * r(1.1, 1.6)).toFixed(2),
    alpha: r(-3, 7),
    beta: isDebt ? r(0.05, 0.4) : r(0.7, 1.25),
    maxDrawdown: isDebt ? r(-4, -0.5) : isHybrid ? r(-18, -6) : r(-45, -12),
    risk: isDebt ? "Low-Mod" : isHybrid ? "Moderate" : pick(["Mod-High", "High", "Very High"] as RiskLevel[]),
    rating: Math.round(r(2, 5, 0)),
    minInvestment: pick([100, 500, 1000, 5000]),
    sipMin: pick([100, 250, 500, 1000]),
    exitLoad: isElss ? "Nil (3Y lock-in)" : isDebt ? "Nil" : "1% if <1Y",
    exitLoadDays: isElss ? 0 : isDebt ? 0 : 365,
    lockInYears: isElss ? 3 : 0,
    taxation: isDebt ? "Debt" : isHybrid ? "Hybrid" : "Equity",
    benchmark: isDebt ? "CRISIL Composite Bond" : pick(BENCH),
    fundManager: pick(["R. Naren", "P. Khemka", "S. Trivedi", "N. Subramaniam", "A. Mukherjea", "H. Bhatt", "C. Bhansali", "V. Kuppa", "M. Modi", "K. Mohanty", "S. Sapre", "S. Banerjee"]),
    inceptionYear: Math.round(r(1998, 2022, 0)),
  };
});

const FD_ENTRIES: { issuer: string; sub: FixedDeposit["subCategory"]; rating: string }[] = [
  ...BANKS.slice(0, 4).map(b => ({ issuer: b, sub: "Public Bank" as const, rating: "AAA" })),
  ...BANKS.slice(4).map(b => ({ issuer: b, sub: "Private Bank" as const, rating: pick(["AAA", "AA+"]) })),
  ...SFB.map(b => ({ issuer: b, sub: "Small Finance" as const, rating: pick(["AA-", "A+", "AA"]) })),
  ...NBFC.map(b => ({ issuer: b, sub: "NBFC" as const, rating: pick(["AAA", "AA+"]) })),
];

const TENURES = [3, 6, 12, 18, 24, 36, 60, 84, 120];

const fixedDepositsIN: FixedDeposit[] = FD_ENTRIES.flatMap((e, i) =>
  TENURES.slice(0, 4 + (i % 3)).map((t, j) => {
    const base = e.sub === "Small Finance" ? 7.5 : e.sub === "NBFC" ? 7.8 : e.sub === "Private Bank" ? 7 : 6.5;
    const rate = +(base + (t > 12 ? 0.3 : 0) + rand() * 0.9).toFixed(2);
    return {
      category: "FD",
      id: `FD-${2000 + i * 10 + j}`,
      name: `${e.issuer} ${t}M Deposit`,
      issuer: e.issuer,
      subCategory: e.sub,
      tenureMonths: t,
      interestRate: rate,
      seniorRate: +(rate + 0.5).toFixed(2),
      compounding: pick(["Quarterly", "Monthly", "At Maturity"] as FixedDeposit["compounding"][]),
      minInvestment: pick([1000, 5000, 10000, 25000]),
      maxInvestment: e.sub === "NBFC" ? 50000000 : null,
      premature: rand() > 0.15,
      rating: e.rating,
      insuredDICGC: e.sub !== "NBFC",
      payout: pick(["Cumulative", "Non-Cumulative"] as const),
    };
  })
);

const insuranceIN: Insurance[] = Array.from({ length: 32 }, (_, i) => {
  const sub = INS_SUB[i % INS_SUB.length];
  const insurer = pick(INSURERS);
  const isTerm = sub === "Term";
  const isHealth = sub === "Health";
  const sa = isTerm ? pick([5000000, 10000000, 20000000, 50000000]) : isHealth ? pick([500000, 1000000, 2500000, 5000000]) : pick([1000000, 2500000, 5000000]);
  const premium = isTerm ? Math.round(sa * r(0.0008, 0.0018)) : isHealth ? Math.round(sa * r(0.012, 0.035)) : Math.round(sa * r(0.05, 0.12));
  return {
    category: "INS",
    id: `IN-${3000 + i}`,
    name: `${insurer} ${sub} ${isTerm ? "Shield" : isHealth ? "Care" : "Plus"}`,
    insurer,
    subCategory: sub,
    sumAssured: sa,
    premiumAnnual: premium,
    policyTermYears: isTerm ? pick([20, 30, 40]) : sub === "Annuity" ? pick([10, 15, 20]) : pick([10, 15, 20, 25]),
    ppt: isTerm ? pick([10, 15, 20]) : pick([5, 7, 10, 15]),
    claimSettlement: r(94, 99.8),
    solvencyRatio: r(1.6, 2.8),
    irr: ["Endowment", "ULIP", "Annuity", "Child"].includes(sub) ? r(4.5, 8.5) : undefined,
    taxBenefit: "80C / 10(10D)",
    riders: pick([["Critical Illness"], ["Accidental Death"], ["Critical Illness", "Waiver of Premium"], ["Accidental Death", "Critical Illness"]]),
    rating: Math.round(r(3, 5, 0)),
  };
});


// ====================== PMS ======================

const PMS_HOUSES = [
  "Marcellus", "Motilal Oswal", "ASK Investment", "ICICI Pru PMS", "Kotak PMS", "Axis PMS",
  "White Oak Capital", "Abakkus", "Alchemy Capital", "Sage One", "Buoyant Capital", "Carnelian Asset", "Nine Rivers Capital", "ValueQuest", "Sundaram Alternates",
];
const PMS_STRATEGIES: PMS["strategy"][] = [
  "Multi Cap", "Large Cap", "Mid & Small Cap", "Small Cap", "Thematic",
  "Sector - Banking & Financials", "Sector - Pharma", "Contra / Value", "Debt", "Hybrid",
];
const PMS_STRUCT: PMS["structure"][] = ["Discretionary", "Discretionary", "Discretionary", "Non-Discretionary", "Advisory"];
const PMS_BENCH = ["NIFTY 50 TRI", "NIFTY 500 TRI", "BSE 500 TRI", "NIFTY Midcap 150 TRI", "NIFTY Smallcap 250 TRI", "NIFTY Bank TRI"];

const pmsSchemesIN: PMS[] = Array.from({ length: 28 }, (_, i) => {
  const manager = pick(PMS_HOUSES);
  const strategy = PMS_STRATEGIES[i % PMS_STRATEGIES.length];
  const isDebt = strategy === "Debt";
  const isSmall = strategy.includes("Small") || strategy === "Thematic";
  return {
    category: "PMS",
    id: `PMS-${4000 + i}`,
    name: `${manager} ${strategy} Strategy`,
    manager,
    structure: pick(PMS_STRUCT),
    strategy,
    benchmark: isDebt ? "CRISIL Composite Bond" : pick(PMS_BENCH),
    aum: Math.round(r(150, 18000, 0)),
    minInvestment: 5000000, // SEBI mandated ₹50L
    returns1y: r(isDebt ? 6 : -5, isDebt ? 10 : 48),
    returns3y: r(isDebt ? 6 : 8, isDebt ? 9 : 32),
    returns5y: r(isDebt ? 6.5 : 10, isDebt ? 8.5 : 26),
    alpha: r(-2, 9),
    sharpe: r(0.4, 2.1),
    beta: isDebt ? r(0.1, 0.5) : r(0.7, 1.3),
    maxDrawdown: r(isDebt ? -6 : -38, isDebt ? -2 : -12),
    fixedFee: r(0.5, 2.5),
    performanceFee: pick(["20% over 10% hurdle", "15% over 8% hurdle", "20% over 12% hurdle", "Nil", "10% over benchmark"]),
    exitLoad: pick(["1% if <1Y", "2% Y1, 1% Y2", "Nil after 1Y", "3-1-0% (Y1-Y2-Y3)"]),
    inception: `${2010 + Math.floor(rand() * 14)}-0${1 + Math.floor(rand() * 9)}`,
    risk: isDebt ? "Moderate" : isSmall ? "Very High" : pick(["Mod-High", "High", "Very High"] as RiskLevel[]),
    rating: Math.round(r(3, 5, 0)),
  };
});

// ====================== AIF ======================

const AIF_HOUSES = [
  "Edelweiss Alt", "Kotak Alt Assets", "ICICI Pru AIF", "Avendus", "True North", "ChrysCapital", "Multiples Alt", "Nexus Ventures",
  "Blume Ventures", "InCred Alt", "360 ONE", "Premji Invest", "Neo Asset Mgmt", "Vivriti AMC", "Axis Alternatives",
];
const AIF_CAT1: AIF["subStrategy"][] = ["Venture Capital", "SME Fund", "Social Venture", "Infrastructure"];
const AIF_CAT2: AIF["subStrategy"][] = ["Private Equity", "Real Estate", "Private Credit / Debt", "Distressed / Special Sit."];
const AIF_CAT3: AIF["subStrategy"][] = ["Long-Short Hedge", "Long-Only Equity"];

const aifSchemesIN: AIF[] = Array.from({ length: 30 }, (_, i) => {
  const manager = pick(AIF_HOUSES);
  const catRoll = i % 3;
  const sebiCategory: AIF["sebiCategory"] = catRoll === 0 ? "Category I" : catRoll === 1 ? "Category II" : "Category III";
  const pool = sebiCategory === "Category I" ? AIF_CAT1 : sebiCategory === "Category II" ? AIF_CAT2 : AIF_CAT3;
  const subStrategy = pick(pool);
  const isHedge = subStrategy === "Long-Short Hedge";
  const isDebt = subStrategy === "Private Credit / Debt";
  const corpus = Math.round(r(250, 8000, 0));
  return {
    category: "AIF",
    id: `AIF-${5000 + i}`,
    name: `${manager} ${subStrategy} Fund ${["I", "II", "III", "IV"][i % 4]}`,
    manager,
    sebiCategory,
    subStrategy,
    structure: sebiCategory === "Category III" && isHedge ? pick(["Open-Ended", "Close-Ended"] as const) : "Close-Ended",
    vintage: 2018 + Math.floor(rand() * 8),
    corpusTarget: corpus,
    commitments: Math.round(corpus * r(0.4, 1.0)),
    minInvestment: 10000000, // SEBI mandated ₹1 Cr
    tenureYears: sebiCategory === "Category III" ? pick([3, 5, 7]) : pick([7, 8, 10, 12]),
    drawdownStatus: Math.round(r(15, 100, 0)),
    targetIRR: r(isDebt ? 11 : 16, isDebt ? 14 : 28),
    netIRR: r(isDebt ? 8 : -3, isDebt ? 13 : 32),
    moic: r(0.9, 3.2),
    hurdleRate: r(8, 12),
    carry: pick([10, 15, 20, 20, 20]),
    managementFee: r(1.0, 2.5),
    domicile: rand() > 0.7 ? "India - GIFT IFSC" : "India - Onshore",
    risk: isDebt ? "Mod-High" : isHedge ? "High" : "Very High",
    rating: Math.round(r(3, 5, 0)),
  };
});

// allProducts exported below as a region-aware proxy.

// ====================== EQUITY STOCKS ======================

export interface EquityStock {
  category: "EQ";
  id: string;
  ticker: string;
  name: string;
  sector: string;
  marketCap: "Large Cap" | "Mid Cap" | "Small Cap";
  price: number;
  pe: number;
  pb: number;
  dividendYield: number;
  roe: number;
  beta: number;
  cagr3y: number; // historical 3Y CAGR
  cagr5y: number;
  expectedReturn: number; // forward estimate = earnings growth + div yield
  risk: RiskLevel;
}

const STOCKS_SEED: { ticker: string; name: string; sector: string; cap: EquityStock["marketCap"]; price: number }[] = [
  // Nifty 50 — Large Cap
  { ticker: "RELIANCE", name: "Reliance Industries", sector: "Energy / Conglomerate", cap: "Large Cap", price: 1298 },
  { ticker: "TCS", name: "Tata Consultancy Services", sector: "IT Services", cap: "Large Cap", price: 4120 },
  { ticker: "HDFCBANK", name: "HDFC Bank", sector: "Banking", cap: "Large Cap", price: 1685 },
  { ticker: "INFY", name: "Infosys", sector: "IT Services", cap: "Large Cap", price: 1840 },
  { ticker: "ICICIBANK", name: "ICICI Bank", sector: "Banking", cap: "Large Cap", price: 1290 },
  { ticker: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecom", cap: "Large Cap", price: 1620 },
  { ticker: "LT", name: "Larsen & Toubro", sector: "Capital Goods", cap: "Large Cap", price: 3580 },
  { ticker: "ITC", name: "ITC", sector: "FMCG", cap: "Large Cap", price: 472 },
  { ticker: "ASIANPAINT", name: "Asian Paints", sector: "Consumer Durables", cap: "Large Cap", price: 2280 },
  { ticker: "MARUTI", name: "Maruti Suzuki", sector: "Auto", cap: "Large Cap", price: 12450 },
  { ticker: "TITAN", name: "Titan Company", sector: "Consumer Discretionary", cap: "Large Cap", price: 3540 },
  { ticker: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Pharma", cap: "Large Cap", price: 1820 },
  { ticker: "SBIN", name: "State Bank of India", sector: "Banking", cap: "Large Cap", price: 825 },
  { ticker: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Banking", cap: "Large Cap", price: 1755 },
  { ticker: "AXISBANK", name: "Axis Bank", sector: "Banking", cap: "Large Cap", price: 1145 },
  { ticker: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG", cap: "Large Cap", price: 2380 },
  { ticker: "BAJFINANCE", name: "Bajaj Finance", sector: "NBFC", cap: "Large Cap", price: 7280 },
  { ticker: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services", cap: "Large Cap", price: 1685 },
  { ticker: "HCLTECH", name: "HCL Technologies", sector: "IT Services", cap: "Large Cap", price: 1670 },
  { ticker: "WIPRO", name: "Wipro", sector: "IT Services", cap: "Large Cap", price: 540 },
  { ticker: "ULTRACEMCO", name: "UltraTech Cement", sector: "Cement", cap: "Large Cap", price: 11580 },
  { ticker: "NESTLEIND", name: "Nestle India", sector: "FMCG", cap: "Large Cap", price: 2380 },
  { ticker: "M&M", name: "Mahindra & Mahindra", sector: "Auto", cap: "Large Cap", price: 2950 },
  { ticker: "TATAMOTORS", name: "Tata Motors", sector: "Auto", cap: "Large Cap", price: 985 },
  { ticker: "TATASTEEL", name: "Tata Steel", sector: "Metals", cap: "Large Cap", price: 165 },
  { ticker: "JSWSTEEL", name: "JSW Steel", sector: "Metals", cap: "Large Cap", price: 945 },
  { ticker: "HINDALCO", name: "Hindalco Industries", sector: "Metals", cap: "Large Cap", price: 680 },
  { ticker: "POWERGRID", name: "Power Grid Corporation", sector: "Power Utility", cap: "Large Cap", price: 318 },
  { ticker: "NTPC", name: "NTPC", sector: "Power Utility", cap: "Large Cap", price: 365 },
  { ticker: "ONGC", name: "Oil & Natural Gas Corp", sector: "Oil & Gas", cap: "Large Cap", price: 268 },
  { ticker: "COALINDIA", name: "Coal India", sector: "Mining", cap: "Large Cap", price: 412 },
  { ticker: "IOC", name: "Indian Oil Corp", sector: "Oil & Gas", cap: "Large Cap", price: 145 },
  { ticker: "BPCL", name: "Bharat Petroleum", sector: "Oil & Gas", cap: "Large Cap", price: 312 },
  { ticker: "ADANIENT", name: "Adani Enterprises", sector: "Conglomerate", cap: "Large Cap", price: 2680 },
  { ticker: "ADANIPORTS", name: "Adani Ports & SEZ", sector: "Logistics", cap: "Large Cap", price: 1380 },
  { ticker: "ADANIPOWER", name: "Adani Power", sector: "Power Utility", cap: "Large Cap", price: 545 },
  { ticker: "DRREDDY", name: "Dr Reddy's Laboratories", sector: "Pharma", cap: "Large Cap", price: 1280 },
  { ticker: "CIPLA", name: "Cipla", sector: "Pharma", cap: "Large Cap", price: 1485 },
  { ticker: "DIVISLAB", name: "Divi's Laboratories", sector: "Pharma", cap: "Large Cap", price: 5680 },
  { ticker: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare", cap: "Large Cap", price: 6720 },
  { ticker: "TECHM", name: "Tech Mahindra", sector: "IT Services", cap: "Large Cap", price: 1620 },
  { ticker: "LTIM", name: "LTIMindtree", sector: "IT Services", cap: "Large Cap", price: 5840 },
  { ticker: "INDUSINDBK", name: "IndusInd Bank", sector: "Banking", cap: "Large Cap", price: 1280 },
  { ticker: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Insurance", cap: "Large Cap", price: 685 },
  { ticker: "SBILIFE", name: "SBI Life Insurance", sector: "Insurance", cap: "Large Cap", price: 1545 },
  { ticker: "ICICIGI", name: "ICICI Lombard GIC", sector: "Insurance", cap: "Large Cap", price: 1820 },
  { ticker: "GRASIM", name: "Grasim Industries", sector: "Diversified", cap: "Large Cap", price: 2680 },
  { ticker: "EICHERMOT", name: "Eicher Motors", sector: "Auto", cap: "Large Cap", price: 4920 },
  { ticker: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Auto", cap: "Large Cap", price: 4580 },
  { ticker: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Auto", cap: "Large Cap", price: 9280 },
  { ticker: "BRITANNIA", name: "Britannia Industries", sector: "FMCG", cap: "Large Cap", price: 5180 },
  { ticker: "TATACONSUM", name: "Tata Consumer Products", sector: "FMCG", cap: "Large Cap", price: 1085 },
  { ticker: "DABUR", name: "Dabur India", sector: "FMCG", cap: "Large Cap", price: 545 },
  { ticker: "GODREJCP", name: "Godrej Consumer Products", sector: "FMCG", cap: "Large Cap", price: 1320 },
  { ticker: "PIDILITIND", name: "Pidilite Industries", sector: "Chemicals", cap: "Large Cap", price: 3120 },
  { ticker: "SHRIRAMFIN", name: "Shriram Finance", sector: "NBFC", cap: "Large Cap", price: 2840 },
  { ticker: "HAVELLS", name: "Havells India", sector: "Consumer Durables", cap: "Large Cap", price: 1820 },
  { ticker: "DMART", name: "Avenue Supermarts", sector: "Retail", cap: "Large Cap", price: 4280 },
  { ticker: "ZOMATO", name: "Zomato", sector: "Internet / Food Tech", cap: "Large Cap", price: 268 },
  { ticker: "DLF", name: "DLF", sector: "Realty", cap: "Large Cap", price: 845 },
  // Nifty Next 50 / Midcap 150
  { ticker: "PERSISTENT", name: "Persistent Systems", sector: "IT Services", cap: "Mid Cap", price: 5680 },
  { ticker: "POLYCAB", name: "Polycab India", sector: "Capital Goods", cap: "Mid Cap", price: 6720 },
  { ticker: "TRENT", name: "Trent", sector: "Retail", cap: "Mid Cap", price: 7240 },
  { ticker: "DIXON", name: "Dixon Technologies", sector: "Electronics Mfg", cap: "Mid Cap", price: 14820 },
  { ticker: "KEI", name: "KEI Industries", sector: "Capital Goods", cap: "Mid Cap", price: 3960 },
  { ticker: "CAMS", name: "Computer Age Mgmt", sector: "Financial Services", cap: "Mid Cap", price: 4380 },
  { ticker: "COFORGE", name: "Coforge", sector: "IT Services", cap: "Mid Cap", price: 7820 },
  { ticker: "MPHASIS", name: "Mphasis", sector: "IT Services", cap: "Mid Cap", price: 2680 },
  { ticker: "LICI", name: "Life Insurance Corp", sector: "Insurance", cap: "Mid Cap", price: 945 },
  { ticker: "IRCTC", name: "Indian Railway Catering", sector: "Travel / Tourism", cap: "Mid Cap", price: 810 },
  { ticker: "ABCAPITAL", name: "Aditya Birla Capital", sector: "Financial Services", cap: "Mid Cap", price: 220 },
  { ticker: "IDFCFIRSTB", name: "IDFC FIRST Bank", sector: "Banking", cap: "Mid Cap", price: 78 },
  { ticker: "FEDERALBNK", name: "Federal Bank", sector: "Banking", cap: "Mid Cap", price: 195 },
  { ticker: "AUBANK", name: "AU Small Finance Bank", sector: "Banking", cap: "Mid Cap", price: 685 },
  { ticker: "PNB", name: "Punjab National Bank", sector: "Banking", cap: "Mid Cap", price: 108 },
  { ticker: "BANKBARODA", name: "Bank of Baroda", sector: "Banking", cap: "Mid Cap", price: 248 },
  { ticker: "CANBK", name: "Canara Bank", sector: "Banking", cap: "Mid Cap", price: 112 },
  { ticker: "BHEL", name: "Bharat Heavy Electricals", sector: "Capital Goods", cap: "Mid Cap", price: 285 },
  { ticker: "BEL", name: "Bharat Electronics", sector: "Defence", cap: "Mid Cap", price: 312 },
  { ticker: "HAL", name: "Hindustan Aeronautics", sector: "Defence", cap: "Mid Cap", price: 4820 },
  { ticker: "GAIL", name: "GAIL India", sector: "Oil & Gas", cap: "Mid Cap", price: 218 },
  { ticker: "PETRONET", name: "Petronet LNG", sector: "Oil & Gas", cap: "Mid Cap", price: 348 },
  { ticker: "AMBUJACEM", name: "Ambuja Cements", sector: "Cement", cap: "Mid Cap", price: 612 },
  { ticker: "ACC", name: "ACC", sector: "Cement", cap: "Mid Cap", price: 2480 },
  { ticker: "TVSMOTOR", name: "TVS Motor Company", sector: "Auto", cap: "Mid Cap", price: 2480 },
  { ticker: "ASHOKLEY", name: "Ashok Leyland", sector: "Auto", cap: "Mid Cap", price: 218 },
  { ticker: "BOSCHLTD", name: "Bosch", sector: "Auto Ancillary", cap: "Mid Cap", price: 31840 },
  { ticker: "MOTHERSON", name: "Samvardhana Motherson", sector: "Auto Ancillary", cap: "Mid Cap", price: 168 },
  { ticker: "TIINDIA", name: "Tube Investments of India", sector: "Auto Ancillary", cap: "Mid Cap", price: 3680 },
  { ticker: "JUBLFOOD", name: "Jubilant FoodWorks", sector: "Restaurants", cap: "Mid Cap", price: 685 },
  { ticker: "MUTHOOTFIN", name: "Muthoot Finance", sector: "NBFC", cap: "Mid Cap", price: 1980 },
  { ticker: "MFSL", name: "Max Financial Services", sector: "Insurance", cap: "Mid Cap", price: 1185 },
  { ticker: "TORNTPHARM", name: "Torrent Pharmaceuticals", sector: "Pharma", cap: "Mid Cap", price: 3320 },
  { ticker: "LUPIN", name: "Lupin", sector: "Pharma", cap: "Mid Cap", price: 2185 },
  { ticker: "BIOCON", name: "Biocon", sector: "Pharma", cap: "Mid Cap", price: 348 },
  { ticker: "AUROPHARMA", name: "Aurobindo Pharma", sector: "Pharma", cap: "Mid Cap", price: 1320 },
  { ticker: "ZYDUSLIFE", name: "Zydus Lifesciences", sector: "Pharma", cap: "Mid Cap", price: 1085 },
  { ticker: "OBEROIRLTY", name: "Oberoi Realty", sector: "Realty", cap: "Mid Cap", price: 1980 },
  { ticker: "GODREJPROP", name: "Godrej Properties", sector: "Realty", cap: "Mid Cap", price: 3120 },
  { ticker: "INDIGO", name: "InterGlobe Aviation", sector: "Aviation", cap: "Mid Cap", price: 4680 },
  // Nifty Smallcap 250
  { ticker: "CDSL", name: "Central Depository Svc", sector: "Financial Services", cap: "Small Cap", price: 1620 },
  { ticker: "MAPMYINDIA", name: "C.E. Info Systems", sector: "Tech / Maps", cap: "Small Cap", price: 1985 },
  { ticker: "AETHER", name: "Aether Industries", sector: "Specialty Chemicals", cap: "Small Cap", price: 845 },
  { ticker: "RAINBOW", name: "Rainbow Children's", sector: "Healthcare", cap: "Small Cap", price: 1480 },
  { ticker: "ROUTE", name: "Route Mobile", sector: "CPaaS / Tech", cap: "Small Cap", price: 1620 },
  { ticker: "AFFLE", name: "Affle India", sector: "Adtech", cap: "Small Cap", price: 1485 },
  { ticker: "TANLA", name: "Tanla Platforms", sector: "CPaaS / Tech", cap: "Small Cap", price: 685 },
  { ticker: "HAPPSTMNDS", name: "Happiest Minds Tech", sector: "IT Services", cap: "Small Cap", price: 745 },
  { ticker: "INTELLECT", name: "Intellect Design Arena", sector: "Fintech Software", cap: "Small Cap", price: 845 },
  { ticker: "NEWGEN", name: "Newgen Software", sector: "Enterprise Software", cap: "Small Cap", price: 1280 },
  { ticker: "RVNL", name: "Rail Vikas Nigam", sector: "Infrastructure", cap: "Small Cap", price: 425 },
  { ticker: "IRCON", name: "IRCON International", sector: "Infrastructure", cap: "Small Cap", price: 218 },
  { ticker: "RAILTEL", name: "RailTel Corporation", sector: "Telecom / PSU", cap: "Small Cap", price: 385 },
  { ticker: "MAZDOCK", name: "Mazagon Dock Shipbuilders", sector: "Defence", cap: "Small Cap", price: 4280 },
  { ticker: "COCHINSHIP", name: "Cochin Shipyard", sector: "Defence", cap: "Small Cap", price: 1820 },
  { ticker: "GRSE", name: "Garden Reach Shipbuilders", sector: "Defence", cap: "Small Cap", price: 2180 },
  { ticker: "POLICYBZR", name: "PB Fintech (Policybazaar)", sector: "Insurtech", cap: "Small Cap", price: 1480 },
  { ticker: "PAYTM", name: "One 97 Communications", sector: "Fintech", cap: "Small Cap", price: 845 },
  { ticker: "NYKAA", name: "FSN E-Commerce (Nykaa)", sector: "E-Commerce", cap: "Small Cap", price: 198 },
  { ticker: "DELHIVERY", name: "Delhivery", sector: "Logistics", cap: "Small Cap", price: 385 },
  { ticker: "BLUEDART", name: "Blue Dart Express", sector: "Logistics", cap: "Small Cap", price: 6820 },
  { ticker: "VBL", name: "Varun Beverages", sector: "FMCG", cap: "Small Cap", price: 685 },
  { ticker: "RADICO", name: "Radico Khaitan", sector: "Beverages", cap: "Small Cap", price: 1820 },
  { ticker: "PGHH", name: "Procter & Gamble Hygiene", sector: "FMCG", cap: "Small Cap", price: 17820 },
  { ticker: "BALKRISIND", name: "Balkrishna Industries", sector: "Tyres", cap: "Small Cap", price: 2880 },
  { ticker: "APOLLOTYRE", name: "Apollo Tyres", sector: "Tyres", cap: "Small Cap", price: 485 },
  { ticker: "LAURUSLABS", name: "Laurus Labs", sector: "Pharma", cap: "Small Cap", price: 485 },
  { ticker: "GLENMARK", name: "Glenmark Pharmaceuticals", sector: "Pharma", cap: "Small Cap", price: 1680 },
  { ticker: "ALKEM", name: "Alkem Laboratories", sector: "Pharma", cap: "Small Cap", price: 5680 },
  { ticker: "NAVINFLUOR", name: "Navin Fluorine International", sector: "Specialty Chemicals", cap: "Small Cap", price: 3480 },
  { ticker: "DEEPAKNTR", name: "Deepak Nitrite", sector: "Specialty Chemicals", cap: "Small Cap", price: 2480 },
  { ticker: "SRF", name: "SRF", sector: "Specialty Chemicals", cap: "Small Cap", price: 2380 },
];


const equityStocksIN: EquityStock[] = STOCKS_SEED.map((s, i) => {
  const isLarge = s.cap === "Large Cap";
  const cagr3 = r(isLarge ? 8 : 5, isLarge ? 26 : 42);
  const dy = r(0.1, isLarge ? 2.4 : 1.2);
  const eps = r(isLarge ? 8 : 12, isLarge ? 18 : 28);
  return {
    category: "EQ",
    id: `EQ-${6000 + i}`,
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    marketCap: s.cap,
    price: s.price,
    pe: r(15, 90),
    pb: r(1.2, 14),
    dividendYield: dy,
    roe: r(10, 38),
    beta: r(0.6, 1.4),
    cagr3y: cagr3,
    cagr5y: r(isLarge ? 9 : 8, isLarge ? 24 : 36),
    expectedReturn: +(eps + dy).toFixed(2),
    risk: isLarge ? "Mod-High" : s.cap === "Mid Cap" ? "High" : "Very High",
  };
});

// ====================== BONDS ======================

export interface Bond {
  category: "BOND";
  id: string;
  name: string;
  issuer: string;
  bondType: "G-Sec" | "State Dev Loan" | "PSU Bond" | "Corporate Bond" | "Tax-Free Bond" | "Perpetual / AT1" | "NCD" | "Covered Bond" | "Zero Coupon";
  rating: string;
  couponRate: number;
  ytm: number; // yield to maturity = expected return
  residualTenorYears: number;
  faceValue: number;
  minInvestment: number;
  payout: "Annual" | "Semi-Annual" | "Quarterly" | "Cumulative";
  taxable: boolean;
  risk: RiskLevel;
}

const BOND_SEED: { issuer: string; type: Bond["bondType"]; rating: string; coupon: number; tenor: number; taxable: boolean }[] = [
  // G-Secs
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 7.18, tenor: 10, taxable: true },
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 7.34, tenor: 30, taxable: true },
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 6.79, tenor: 5, taxable: true },
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 7.26, tenor: 7, taxable: true },
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 7.41, tenor: 40, taxable: true },
  // SDLs
  { issuer: "Maharashtra SDL", type: "State Dev Loan", rating: "Sovereign", coupon: 7.45, tenor: 12, taxable: true },
  { issuer: "Tamil Nadu SDL", type: "State Dev Loan", rating: "Sovereign", coupon: 7.42, tenor: 10, taxable: true },
  { issuer: "Karnataka SDL", type: "State Dev Loan", rating: "Sovereign", coupon: 7.48, tenor: 15, taxable: true },
  { issuer: "Gujarat SDL", type: "State Dev Loan", rating: "Sovereign", coupon: 7.46, tenor: 10, taxable: true },
  { issuer: "Uttar Pradesh SDL", type: "State Dev Loan", rating: "Sovereign", coupon: 7.52, tenor: 12, taxable: true },
  // PSU Bonds
  { issuer: "NHAI", type: "PSU Bond", rating: "AAA", coupon: 7.65, tenor: 15, taxable: true },
  { issuer: "PFC", type: "PSU Bond", rating: "AAA", coupon: 7.78, tenor: 10, taxable: true },
  { issuer: "REC", type: "PSU Bond", rating: "AAA", coupon: 7.72, tenor: 7, taxable: true },
  { issuer: "IRFC", type: "PSU Bond", rating: "AAA", coupon: 7.55, tenor: 5, taxable: true },
  { issuer: "HUDCO", type: "PSU Bond", rating: "AAA", coupon: 7.85, tenor: 10, taxable: true },
  { issuer: "NABARD", type: "PSU Bond", rating: "AAA", coupon: 7.62, tenor: 5, taxable: true },
  { issuer: "SIDBI", type: "PSU Bond", rating: "AAA", coupon: 7.68, tenor: 7, taxable: true },
  { issuer: "EXIM Bank", type: "PSU Bond", rating: "AAA", coupon: 7.74, tenor: 10, taxable: true },
  { issuer: "NTPC", type: "PSU Bond", rating: "AAA", coupon: 7.58, tenor: 15, taxable: true },
  { issuer: "Power Grid Corp", type: "PSU Bond", rating: "AAA", coupon: 7.62, tenor: 10, taxable: true },
  { issuer: "IRCON International", type: "PSU Bond", rating: "AA+", coupon: 7.95, tenor: 7, taxable: true },
  // Tax-Free
  { issuer: "IRFC", type: "Tax-Free Bond", rating: "AAA", coupon: 7.35, tenor: 10, taxable: false },
  { issuer: "NHAI", type: "Tax-Free Bond", rating: "AAA", coupon: 7.39, tenor: 15, taxable: false },
  { issuer: "PFC", type: "Tax-Free Bond", rating: "AAA", coupon: 7.28, tenor: 10, taxable: false },
  { issuer: "REC", type: "Tax-Free Bond", rating: "AAA", coupon: 7.22, tenor: 10, taxable: false },
  { issuer: "HUDCO", type: "Tax-Free Bond", rating: "AAA", coupon: 7.34, tenor: 15, taxable: false },
  // Corporate Bonds
  { issuer: "HDFC Bank", type: "Corporate Bond", rating: "AAA", coupon: 7.95, tenor: 5, taxable: true },
  { issuer: "Bajaj Finance", type: "Corporate Bond", rating: "AAA", coupon: 8.15, tenor: 5, taxable: true },
  { issuer: "Reliance Industries", type: "Corporate Bond", rating: "AAA", coupon: 7.85, tenor: 10, taxable: true },
  { issuer: "Larsen & Toubro", type: "Corporate Bond", rating: "AAA", coupon: 7.92, tenor: 7, taxable: true },
  { issuer: "Tata Capital", type: "Corporate Bond", rating: "AAA", coupon: 8.05, tenor: 5, taxable: true },
  { issuer: "L&T Finance", type: "Corporate Bond", rating: "AA+", coupon: 8.45, tenor: 3, taxable: true },
  { issuer: "Cholamandalam Inv & Fin", type: "Corporate Bond", rating: "AA+", coupon: 8.55, tenor: 5, taxable: true },
  // NCDs / Debentures (listed)
  { issuer: "Shriram Finance", type: "NCD", rating: "AA+", coupon: 9.05, tenor: 5, taxable: true },
  { issuer: "Muthoot Finance", type: "NCD", rating: "AA+", coupon: 9.25, tenor: 3, taxable: true },
  { issuer: "Manappuram Finance", type: "NCD", rating: "AA", coupon: 9.45, tenor: 3, taxable: true },
  { issuer: "Edelweiss Financial", type: "NCD", rating: "A+", coupon: 10.15, tenor: 5, taxable: true },
  { issuer: "IIFL Finance", type: "NCD", rating: "AA", coupon: 9.65, tenor: 3, taxable: true },
  { issuer: "Indiabulls Housing", type: "NCD", rating: "AA", coupon: 9.85, tenor: 5, taxable: true },
  { issuer: "Piramal Capital & Housing", type: "NCD", rating: "AA", coupon: 9.55, tenor: 4, taxable: true },
  { issuer: "Mahindra & Mahindra Fin", type: "NCD", rating: "AAA", coupon: 8.45, tenor: 5, taxable: true },
  { issuer: "Tata Capital Housing Fin", type: "NCD", rating: "AAA", coupon: 8.25, tenor: 7, taxable: true },
  { issuer: "Aditya Birla Finance", type: "NCD", rating: "AAA", coupon: 8.35, tenor: 5, taxable: true },
  { issuer: "Sundaram Finance", type: "NCD", rating: "AAA", coupon: 8.15, tenor: 3, taxable: true },
  { issuer: "ECL Finance (Edelweiss)", type: "NCD", rating: "A+", coupon: 10.25, tenor: 5, taxable: true },
  { issuer: "Navi Finserv", type: "NCD", rating: "A", coupon: 11.25, tenor: 3, taxable: true },
  { issuer: "U GRO Capital", type: "NCD", rating: "A+", coupon: 10.45, tenor: 4, taxable: true },
  // AT1 / Perpetual
  { issuer: "SBI", type: "Perpetual / AT1", rating: "AA+", coupon: 8.75, tenor: 5, taxable: true },
  { issuer: "HDFC Bank", type: "Perpetual / AT1", rating: "AA+", coupon: 8.55, tenor: 5, taxable: true },
  { issuer: "ICICI Bank", type: "Perpetual / AT1", rating: "AA+", coupon: 8.65, tenor: 5, taxable: true },
  { issuer: "Axis Bank", type: "Perpetual / AT1", rating: "AA", coupon: 8.85, tenor: 5, taxable: true },
  // Covered / ZCB
  { issuer: "HDFC Bank", type: "Covered Bond", rating: "AAA", coupon: 7.85, tenor: 5, taxable: true },
  { issuer: "REC", type: "Zero Coupon", rating: "AAA", coupon: 0, tenor: 10, taxable: true },
  { issuer: "NABARD", type: "Zero Coupon", rating: "AAA", coupon: 0, tenor: 7, taxable: true },
];

const bondsIN: Bond[] = BOND_SEED.map((b, i) => ({
  category: "BOND",
  id: `BD-${7000 + i}`,
  name: `${b.issuer} ${b.coupon}% ${b.tenor}Y`,
  issuer: b.issuer,
  bondType: b.type,
  rating: b.rating,
  couponRate: b.coupon,
  ytm: +(b.coupon + r(-0.25, 0.6)).toFixed(2),
  residualTenorYears: b.tenor,
  faceValue: 1000,
  minInvestment: b.type === "G-Sec" || b.type === "State Dev Loan" ? 10000 : 100000,
  payout: b.type === "Zero Coupon" ? "Cumulative" : b.type === "Tax-Free Bond" ? "Annual" : "Semi-Annual",
  taxable: b.taxable,
  risk: b.rating === "Sovereign" ? "Low" : b.type === "Perpetual / AT1" ? "Mod-High" : b.rating === "AAA" ? "Low-Mod" : b.rating === "AA+" || b.rating === "AA" ? "Moderate" : "Mod-High",
}));

// =====================================================================
// ======================== UAE DATASET ================================
// =====================================================================
// UAE/GCC-flavored mock data. Same shapes as India; AED-denominated where
// monetary; subCategory/risk/rating semantics preserved so screener UI works.

import { getCurrentRegion, type Region } from "./region";

const randAE = seeded(8137);
const pickAE = <T,>(arr: T[]) => arr[Math.floor(randAE() * arr.length)];
const rAE = (min: number, max: number, dp = 2) => +(min + randAE() * (max - min)).toFixed(dp);

const AMCS_AE = [
  "Emirates NBD AM", "ADCB Asset Mgmt", "Mashreq Capital", "FAB Asset Mgmt", "ADIB Capital",
  "Daman Investments", "Lunate", "Chimera Capital", "Shuaa Capital", "Rasmala Invest Bank",
  "NBK Capital", "EFG Hermes", "ADQ Asset Mgmt",
];
const MF_SUB_AE = [
  "GCC Equity", "UAE Equity", "MENA Equity", "Global Equity", "Sharia Equity",
  "Sukuk", "MENA Bond", "Money Market", "Real Estate", "Multi-Asset", "Global Index",
];
const BENCH_AE = [
  "DFM General Index", "ADX General Index", "FTSE ADX 15", "S&P UAE BMI",
  "MSCI GCC", "MSCI Emerging Markets", "Bloomberg GCC Sukuk", "Bloomberg EM Aggregate",
];
const FUND_MGRS_AE = [
  "K. Al Mansoori", "H. Al Suwaidi", "F. Khan", "R. Al Marri", "A. Al Awadhi",
  "S. Sharma", "N. Al Hashemi", "Y. Khoury", "T. Al Mazrouei", "M. Al Falasi",
];

const mutualFundsAE: MutualFund[] = Array.from({ length: 34 }, (_, i) => {
  const sub = pickAE(MF_SUB_AE);
  const isDebt = ["Sukuk", "MENA Bond", "Money Market"].includes(sub);
  const isHybrid = sub === "Multi-Asset";
  const assetClass: MutualFund["assetClass"] = isDebt ? "Debt" : isHybrid ? "Hybrid" : "Equity";
  const amc = pickAE(AMCS_AE);
  const r3 = rAE(isDebt ? 3.5 : 4, isDebt ? 6.5 : 22);
  const sharpe = rAE(0.2, 1.7);
  return {
    category: "MF",
    id: `MF-AE-${1000 + i}`,
    name: `${amc} ${sub} Fund`,
    amc,
    subCategory: sub,
    assetClass,
    nav: rAE(8, 220),
    aum: Math.round(rAE(20, 3500, 0)),       // AED Million
    expenseRatio: rAE(0.35, 2.1),
    returns1y: rAE(isDebt ? 3 : -6, isDebt ? 7 : 32),
    returns3y: r3,
    returns5y: rAE(isDebt ? 3.5 : 5, isDebt ? 6 : 18),
    ytdReturn: rAE(isDebt ? 1.5 : -4, isDebt ? 5 : 18),
    sharpe,
    sortino: +(sharpe * rAE(1.1, 1.6)).toFixed(2),
    alpha: rAE(-2, 6),
    beta: isDebt ? rAE(0.05, 0.4) : rAE(0.6, 1.2),
    maxDrawdown: isDebt ? rAE(-4, -0.5) : isHybrid ? rAE(-16, -5) : rAE(-38, -10),
    risk: isDebt ? "Low-Mod" : isHybrid ? "Moderate" : pickAE(["Mod-High", "High", "Very High"] as RiskLevel[]),
    rating: Math.round(rAE(2, 5, 0)),
    minInvestment: pickAE([1000, 5000, 10000, 25000]),
    sipMin: pickAE([500, 1000, 2500, 5000]),
    exitLoad: isDebt ? "Nil" : "1% if <1Y",
    exitLoadDays: isDebt ? 0 : 365,
    lockInYears: 0,
    taxation: isDebt ? "Debt" : isHybrid ? "Hybrid" : "Equity",
    benchmark: isDebt ? "Bloomberg GCC Sukuk" : pickAE(BENCH_AE),
    fundManager: pickAE(FUND_MGRS_AE),
    inceptionYear: Math.round(rAE(2005, 2022, 0)),
  };
});

const BANKS_AE_PUB = ["Emirates NBD", "First Abu Dhabi Bank (FAB)", "ADCB", "Dubai Islamic Bank"];
const BANKS_AE_PVT = ["Mashreq Bank", "ADIB", "Commercial Bank of Dubai", "RAKBANK", "Sharjah Islamic Bank", "HSBC UAE", "Standard Chartered UAE"];
const NBFC_AE      = ["Amlak Finance", "Tamweel", "Aafaq Islamic Finance", "Dunia Finance"];

const FD_ENTRIES_AE: { issuer: string; sub: FixedDeposit["subCategory"]; rating: string }[] = [
  ...BANKS_AE_PUB.map(b => ({ issuer: b, sub: "Public Bank" as const, rating: "AA-" })),
  ...BANKS_AE_PVT.map(b => ({ issuer: b, sub: "Private Bank" as const, rating: pickAE(["A+", "AA-", "A"]) })),
  ...NBFC_AE.map(b => ({ issuer: b, sub: "NBFC" as const, rating: pickAE(["BBB+", "BBB"]) })),
];

const fixedDepositsAE: FixedDeposit[] = FD_ENTRIES_AE.flatMap((e, i) =>
  TENURES.slice(0, 4 + (i % 3)).map((t, j) => {
    const base = e.sub === "NBFC" ? 5.0 : e.sub === "Private Bank" ? 4.4 : 4.1;
    const rate = +(base + (t > 12 ? 0.25 : 0) + randAE() * 0.8).toFixed(2);
    return {
      category: "FD",
      id: `FD-AE-${2000 + i * 10 + j}`,
      name: `${e.issuer} ${t}M AED Wakala`,
      issuer: e.issuer,
      subCategory: e.sub,
      tenureMonths: t,
      interestRate: rate,
      seniorRate: +(rate + 0.25).toFixed(2),
      compounding: pickAE(["Quarterly", "Monthly", "At Maturity"] as FixedDeposit["compounding"][]),
      minInvestment: pickAE([10000, 25000, 50000, 100000]),
      maxInvestment: null,
      premature: randAE() > 0.2,
      rating: e.rating,
      insuredDICGC: false, // No DICGC equivalent — UAE has DGS but caps differ
      payout: pickAE(["Cumulative", "Non-Cumulative"] as const),
    };
  })
);

const INSURERS_AE = [
  "Sukoon Insurance", "Orient Insurance", "Salama Islamic Arab", "Daman Health",
  "Oman Insurance Co", "Watania Takaful", "Dubai Insurance", "AXA Gulf",
  "MetLife Gulf", "Abu Dhabi National Takaful", "Emirates Insurance", "Noor Takaful",
];

const insuranceAE: Insurance[] = Array.from({ length: 28 }, (_, i) => {
  const sub = INS_SUB[i % INS_SUB.length];
  const insurer = pickAE(INSURERS_AE);
  const isTerm = sub === "Term";
  const isHealth = sub === "Health";
  // AED face values
  const sa = isTerm ? pickAE([500000, 1000000, 2500000, 5000000]) : isHealth ? pickAE([100000, 250000, 500000, 1000000]) : pickAE([250000, 500000, 1000000]);
  const premium = isTerm ? Math.round(sa * rAE(0.0010, 0.0022)) : isHealth ? Math.round(sa * rAE(0.025, 0.06)) : Math.round(sa * rAE(0.05, 0.12));
  return {
    category: "INS",
    id: `IN-AE-${3000 + i}`,
    name: `${insurer} ${sub} ${isTerm ? "Shield" : isHealth ? "Care" : "Plan"}`,
    insurer,
    subCategory: sub,
    sumAssured: sa,
    premiumAnnual: premium,
    policyTermYears: isTerm ? pickAE([20, 25, 30]) : sub === "Annuity" ? pickAE([10, 15, 20]) : pickAE([10, 15, 20]),
    ppt: isTerm ? pickAE([10, 15, 20]) : pickAE([5, 7, 10]),
    claimSettlement: rAE(92, 99),
    solvencyRatio: rAE(1.5, 2.6),
    irr: ["Endowment", "ULIP", "Annuity", "Child"].includes(sub) ? rAE(3.5, 7.0) : undefined,
    taxBenefit: "Tax-free (UAE 0% personal income tax)",
    riders: pickAE([["Critical Illness"], ["Accidental Death"], ["Critical Illness", "Waiver of Premium"], ["Accidental Death", "Critical Illness"]]),
    rating: Math.round(rAE(3, 5, 0)),
  };
});

const PMS_HOUSES_AE = [
  "Lunate", "Chimera Investments", "ADQ Asset Mgmt", "Mubadala Capital",
  "Shuaa Capital", "Daman Investments", "Rasmala IB", "Mashreq Capital",
  "FAB Capital Markets", "Emirates NBD AM", "NBK Capital", "EFG Hermes",
];
const PMS_STRATEGIES_AE: PMS["strategy"][] = [
  "Multi Cap", "Large Cap", "Mid & Small Cap", "Thematic",
  "Sector - Banking & Financials", "Contra / Value", "Debt", "Hybrid",
];
const PMS_BENCH_AE = ["DFM General Index", "ADX General Index", "FTSE ADX 15", "S&P UAE BMI", "MSCI GCC"];

const pmsSchemesAE: PMS[] = Array.from({ length: 22 }, (_, i) => {
  const manager = pickAE(PMS_HOUSES_AE);
  const strategy = PMS_STRATEGIES_AE[i % PMS_STRATEGIES_AE.length];
  const isDebt = strategy === "Debt";
  return {
    category: "PMS",
    id: `PMS-AE-${4000 + i}`,
    name: `${manager} ${strategy} Mandate`,
    manager,
    structure: pickAE(["Discretionary", "Discretionary", "Non-Discretionary", "Advisory"] as PMS["structure"][]),
    strategy,
    benchmark: isDebt ? "Bloomberg GCC Sukuk" : pickAE(PMS_BENCH_AE),
    aum: Math.round(rAE(50, 4500, 0)),          // AED Million
    minInvestment: 500000,                      // AED 500K typical DIFC minimum
    returns1y: rAE(isDebt ? 4 : -4, isDebt ? 8 : 36),
    returns3y: rAE(isDebt ? 4 : 6, isDebt ? 7 : 24),
    returns5y: rAE(isDebt ? 4.5 : 8, isDebt ? 7 : 20),
    alpha: rAE(-2, 7),
    sharpe: rAE(0.4, 1.9),
    beta: isDebt ? rAE(0.1, 0.5) : rAE(0.7, 1.3),
    maxDrawdown: rAE(isDebt ? -6 : -30, isDebt ? -2 : -10),
    fixedFee: rAE(0.5, 2.0),
    performanceFee: pickAE(["20% over 8% hurdle", "15% over 6% hurdle", "20% over 10% hurdle", "Nil", "15% over benchmark"]),
    exitLoad: pickAE(["1% if <1Y", "2% Y1, 1% Y2", "Nil after 1Y"]),
    inception: `${2012 + Math.floor(randAE() * 12)}-0${1 + Math.floor(randAE() * 9)}`,
    risk: isDebt ? "Moderate" : pickAE(["Mod-High", "High", "Very High"] as RiskLevel[]),
    rating: Math.round(rAE(3, 5, 0)),
  };
});

const AIF_HOUSES_AE = [
  "Mubadala Capital", "ADQ Investments", "Investcorp", "Lunate", "Chimera Investments",
  "Gulf Capital", "Abraaj-Successor Fund Mgmt", "Multiply Group", "Waha Capital", "NBK Capital Partners",
  "BECO Capital", "Wamda Capital", "Shorooq Partners", "Arzan VC",
];

const aifSchemesAE: AIF[] = Array.from({ length: 26 }, (_, i) => {
  const manager = pickAE(AIF_HOUSES_AE);
  const catRoll = i % 3;
  const sebiCategory: AIF["sebiCategory"] = catRoll === 0 ? "Category I" : catRoll === 1 ? "Category II" : "Category III";
  const pool: AIF["subStrategy"][] = sebiCategory === "Category I"
    ? ["Venture Capital", "SME Fund", "Social Venture", "Infrastructure"]
    : sebiCategory === "Category II"
      ? ["Private Equity", "Real Estate", "Private Credit / Debt", "Distressed / Special Sit."]
      : ["Long-Short Hedge", "Long-Only Equity"];
  const subStrategy = pickAE(pool);
  const isDebt = subStrategy === "Private Credit / Debt";
  const isHedge = subStrategy === "Long-Short Hedge";
  const corpus = Math.round(rAE(50, 2500, 0)); // AED Million
  return {
    category: "AIF",
    id: `AIF-AE-${5000 + i}`,
    name: `${manager} ${subStrategy} Fund ${["I", "II", "III", "IV"][i % 4]}`,
    manager,
    sebiCategory,
    subStrategy,
    structure: sebiCategory === "Category III" && isHedge ? pickAE(["Open-Ended", "Close-Ended"] as const) : "Close-Ended",
    vintage: 2018 + Math.floor(randAE() * 8),
    corpusTarget: corpus,
    commitments: Math.round(corpus * rAE(0.4, 1.0)),
    minInvestment: 1000000,                     // AED 1M typical DIFC/ADGM QI ticket
    tenureYears: sebiCategory === "Category III" ? pickAE([3, 5, 7]) : pickAE([7, 8, 10]),
    drawdownStatus: Math.round(rAE(15, 100, 0)),
    targetIRR: rAE(isDebt ? 9 : 14, isDebt ? 13 : 26),
    netIRR: rAE(isDebt ? 6 : -2, isDebt ? 12 : 30),
    moic: rAE(0.9, 3.0),
    hurdleRate: rAE(6, 10),
    carry: pickAE([10, 15, 20, 20]),
    managementFee: rAE(1.0, 2.5),
    domicile: pickAE(["India - GIFT IFSC", "India - Onshore"] as AIF["domicile"][]), // type only allows India; treat as alt-jurisdiction label
    risk: isDebt ? "Mod-High" : isHedge ? "High" : "Very High",
    rating: Math.round(rAE(3, 5, 0)),
  };
});

// --- UAE Equities (DFM + ADX) -------------------------------------------
const STOCKS_SEED_AE: { ticker: string; name: string; sector: string; cap: EquityStock["marketCap"]; price: number }[] = [
  // ADX heavyweights
  { ticker: "IHC.AD",    name: "International Holding Co",    sector: "Conglomerate",       cap: "Large Cap", price: 414 },
  { ticker: "FAB.AD",    name: "First Abu Dhabi Bank",        sector: "Banking",            cap: "Large Cap", price: 14.8 },
  { ticker: "ADCB.AD",   name: "Abu Dhabi Commercial Bank",   sector: "Banking",            cap: "Large Cap", price: 11.4 },
  { ticker: "ADIB.AD",   name: "Abu Dhabi Islamic Bank",      sector: "Banking",            cap: "Large Cap", price: 16.2 },
  { ticker: "EAND.AD",   name: "e& (Emirates Telecom Group)", sector: "Telecom",            cap: "Large Cap", price: 18.6 },
  { ticker: "ALDAR.AD",  name: "Aldar Properties",            sector: "Realty",             cap: "Large Cap", price: 8.2 },
  { ticker: "ADNOCDIST.AD", name: "ADNOC Distribution",       sector: "Oil & Gas Distribution", cap: "Large Cap", price: 3.85 },
  { ticker: "ADNOCGAS.AD",  name: "ADNOC Gas",                sector: "Oil & Gas",          cap: "Large Cap", price: 3.42 },
  { ticker: "ADNOCDRILL.AD", name: "ADNOC Drilling",          sector: "Oilfield Services",  cap: "Large Cap", price: 5.78 },
  { ticker: "BOROUGE.AD", name: "Borouge",                    sector: "Petrochemicals",     cap: "Large Cap", price: 2.46 },
  { ticker: "TAQA.AD",   name: "Abu Dhabi National Energy",   sector: "Power Utility",      cap: "Large Cap", price: 3.18 },
  { ticker: "AGTHIA.AD", name: "Agthia Group",                sector: "FMCG",               cap: "Mid Cap",   price: 6.4 },
  { ticker: "MULTIPLY.AD", name: "Multiply Group",            sector: "Investment Holding", cap: "Mid Cap",   price: 1.92 },
  { ticker: "Q.AD",      name: "Q Holding",                   sector: "Investment Holding", cap: "Mid Cap",   price: 2.86 },
  { ticker: "PUREHEALTH.AD", name: "Pure Health Holding",     sector: "Healthcare",         cap: "Large Cap", price: 4.12 },
  { ticker: "ADPORTS.AD", name: "AD Ports Group",             sector: "Logistics",          cap: "Large Cap", price: 5.48 },
  { ticker: "ALPHADHA.AD", name: "Alpha Dhabi Holding",       sector: "Conglomerate",       cap: "Large Cap", price: 12.3 },
  { ticker: "EMSTEEL.AD", name: "Emirates Steel Arkan",       sector: "Metals",             cap: "Mid Cap",   price: 1.62 },
  { ticker: "RAKCEC.AD", name: "RAK Ceramics",                sector: "Building Products",  cap: "Mid Cap",   price: 3.85 },
  { ticker: "NMDC.AD",   name: "NMDC Energy",                 sector: "Oilfield Services",  cap: "Mid Cap",   price: 4.62 },
  // DFM heavyweights
  { ticker: "EMAAR.DU",  name: "Emaar Properties",            sector: "Realty",             cap: "Large Cap", price: 13.85 },
  { ticker: "EMAARDEV.DU", name: "Emaar Development",         sector: "Realty",             cap: "Large Cap", price: 14.2 },
  { ticker: "DEWA.DU",   name: "Dubai Electricity & Water",   sector: "Power Utility",      cap: "Large Cap", price: 2.68 },
  { ticker: "ENBD.DU",   name: "Emirates NBD Bank",           sector: "Banking",            cap: "Large Cap", price: 22.5 },
  { ticker: "DIB.DU",    name: "Dubai Islamic Bank",          sector: "Banking",            cap: "Large Cap", price: 7.84 },
  { ticker: "MASB.DU",   name: "Mashreq Bank",                sector: "Banking",            cap: "Mid Cap",   price: 232.0 },
  { ticker: "CBD.DU",    name: "Commercial Bank of Dubai",    sector: "Banking",            cap: "Mid Cap",   price: 9.85 },
  { ticker: "DU.DU",     name: "du (EITC)",                   sector: "Telecom",            cap: "Large Cap", price: 7.92 },
  { ticker: "EMIRATES.DU", name: "Emirates (DAE)",            sector: "Aviation",           cap: "Large Cap", price: 35.0 },
  { ticker: "AIRARABIA.DU", name: "Air Arabia",               sector: "Aviation",           cap: "Mid Cap",   price: 3.18 },
  { ticker: "AMR.DU",    name: "Amanat Holdings",             sector: "Education / Health", cap: "Small Cap", price: 1.42 },
  { ticker: "DXBE.DU",   name: "DXB Entertainments",          sector: "Leisure",            cap: "Small Cap", price: 0.42 },
  { ticker: "TECOM.DU",  name: "TECOM Group",                 sector: "Realty",             cap: "Mid Cap",   price: 3.24 },
  { ticker: "SALIK.DU",  name: "Salik Company",               sector: "Toll / Infra",       cap: "Large Cap", price: 5.96 },
  { ticker: "PARKIN.DU", name: "Parkin Company",              sector: "Parking / Infra",    cap: "Mid Cap",   price: 6.34 },
  { ticker: "EMPOWER.DU", name: "Empower (Emirates District Cooling)", sector: "Utility", cap: "Mid Cap",   price: 1.78 },
  { ticker: "TALABAT.DU", name: "Talabat Holding",            sector: "Internet / Food Tech", cap: "Large Cap", price: 1.62 },
  { ticker: "DTC.DU",    name: "Dubai Taxi Company",          sector: "Transport",          cap: "Mid Cap",   price: 2.86 },
  { ticker: "GFH.DU",    name: "GFH Financial Group",         sector: "Financial Services", cap: "Mid Cap",   price: 1.95 },
  { ticker: "DIC.DU",    name: "Dubai Investments",           sector: "Conglomerate",       cap: "Mid Cap",   price: 2.42 },
  { ticker: "UNB.DU",    name: "Union National Bank",         sector: "Banking",            cap: "Mid Cap",   price: 4.18 },
  { ticker: "ARMX.DU",   name: "Aramex",                      sector: "Logistics",          cap: "Mid Cap",   price: 3.14 },
  { ticker: "ALANSARI.DU", name: "Al Ansari Financial Svc",   sector: "Financial Services", cap: "Mid Cap",   price: 1.12 },
  { ticker: "SHUAA.DU",  name: "Shuaa Capital",               sector: "Financial Services", cap: "Small Cap", price: 0.36 },
  { ticker: "DAMAC.DU",  name: "DAMAC Properties",            sector: "Realty",             cap: "Mid Cap",   price: 1.85 },
  { ticker: "DEYAAR.DU", name: "Deyaar Development",          sector: "Realty",             cap: "Small Cap", price: 0.68 },
];

const equityStocksAE: EquityStock[] = STOCKS_SEED_AE.map((s, i) => {
  const isLarge = s.cap === "Large Cap";
  const cagr3 = rAE(isLarge ? 6 : 4, isLarge ? 24 : 38);
  const dy = rAE(0.2, isLarge ? 5.0 : 2.0);
  const eps = rAE(isLarge ? 6 : 10, isLarge ? 16 : 26);
  return {
    category: "EQ",
    id: `EQ-AE-${6000 + i}`,
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    marketCap: s.cap,
    price: s.price,
    pe: rAE(8, 60),
    pb: rAE(0.8, 8),
    dividendYield: dy,
    roe: rAE(8, 32),
    beta: rAE(0.6, 1.4),
    cagr3y: cagr3,
    cagr5y: rAE(isLarge ? 7 : 6, isLarge ? 22 : 30),
    expectedReturn: +(eps + dy).toFixed(2),
    risk: isLarge ? "Mod-High" : s.cap === "Mid Cap" ? "High" : "Very High",
  };
});

// --- UAE Bonds / Sukuk --------------------------------------------------
const BOND_SEED_AE: { issuer: string; type: Bond["bondType"]; rating: string; coupon: number; tenor: number; taxable: boolean }[] = [
  // UAE Federal & Emirate-level Sovereign
  { issuer: "UAE Federal Govt", type: "G-Sec", rating: "Sovereign", coupon: 4.85, tenor: 10, taxable: false },
  { issuer: "UAE Federal Govt", type: "G-Sec", rating: "Sovereign", coupon: 5.15, tenor: 30, taxable: false },
  { issuer: "UAE Federal Govt", type: "G-Sec", rating: "Sovereign", coupon: 4.55, tenor: 5, taxable: false },
  { issuer: "Abu Dhabi Govt",   type: "G-Sec", rating: "Sovereign", coupon: 4.65, tenor: 10, taxable: false },
  { issuer: "Abu Dhabi Govt",   type: "G-Sec", rating: "Sovereign", coupon: 5.05, tenor: 30, taxable: false },
  { issuer: "Dubai Govt Sukuk", type: "G-Sec", rating: "Sovereign", coupon: 4.95, tenor: 10, taxable: false },
  { issuer: "Sharjah Govt",     type: "State Dev Loan", rating: "BBB+", coupon: 5.85, tenor: 10, taxable: false },
  // PSU / GRE
  { issuer: "Mubadala", type: "PSU Bond", rating: "AA", coupon: 4.95, tenor: 10, taxable: false },
  { issuer: "ADNOC Murban",    type: "PSU Bond", rating: "AA", coupon: 4.85, tenor: 10, taxable: false },
  { issuer: "TAQA", type: "PSU Bond", rating: "AA-", coupon: 5.15, tenor: 7, taxable: false },
  { issuer: "DP World", type: "PSU Bond", rating: "BBB+", coupon: 5.65, tenor: 10, taxable: false },
  { issuer: "Etisalat (e&) Sukuk", type: "PSU Bond", rating: "AA-", coupon: 4.75, tenor: 5, taxable: false },
  { issuer: "Emaar Sukuk", type: "Corporate Bond", rating: "BBB+", coupon: 5.95, tenor: 7, taxable: false },
  { issuer: "DEWA Sukuk", type: "PSU Bond", rating: "AA-", coupon: 4.85, tenor: 10, taxable: false },
  { issuer: "Aldar Sukuk", type: "Corporate Bond", rating: "BBB", coupon: 5.85, tenor: 7, taxable: false },
  // Banks AT1 / Senior
  { issuer: "Emirates NBD AT1", type: "Perpetual / AT1", rating: "BBB-", coupon: 7.85, tenor: 5, taxable: false },
  { issuer: "FAB AT1", type: "Perpetual / AT1", rating: "BBB", coupon: 7.45, tenor: 5, taxable: false },
  { issuer: "ADCB AT1", type: "Perpetual / AT1", rating: "BB+", coupon: 8.15, tenor: 5, taxable: false },
  { issuer: "ADIB Sukuk AT1", type: "Perpetual / AT1", rating: "BB+", coupon: 7.95, tenor: 5, taxable: false },
  { issuer: "FAB Senior", type: "Corporate Bond", rating: "AA-", coupon: 4.85, tenor: 5, taxable: false },
  { issuer: "Emirates NBD Senior", type: "Corporate Bond", rating: "A+", coupon: 4.95, tenor: 5, taxable: false },
  // Corporate Sukuk
  { issuer: "Majid Al Futtaim Sukuk", type: "Corporate Bond", rating: "BBB", coupon: 5.55, tenor: 5, taxable: false },
  { issuer: "Damac Real Estate Sukuk", type: "NCD", rating: "BB-", coupon: 7.65, tenor: 3, taxable: false },
  { issuer: "Aldar Investment Sukuk", type: "Corporate Bond", rating: "BBB", coupon: 5.95, tenor: 7, taxable: false },
  { issuer: "Dubai Aerospace Enterprise", type: "Corporate Bond", rating: "BBB+", coupon: 5.75, tenor: 5, taxable: false },
  { issuer: "Investment Corp of Dubai", type: "PSU Bond", rating: "A", coupon: 5.05, tenor: 10, taxable: false },
  // Tax-free retail Sukuk
  { issuer: "Sharjah Islamic Sukuk", type: "Tax-Free Bond", rating: "A", coupon: 5.15, tenor: 5, taxable: false },
  { issuer: "DIB Tier 1 Sukuk", type: "Perpetual / AT1", rating: "BB+", coupon: 7.65, tenor: 5, taxable: false },
];

const bondsAE: Bond[] = BOND_SEED_AE.map((b, i) => ({
  category: "BOND",
  id: `BD-AE-${7000 + i}`,
  name: `${b.issuer} ${b.coupon}% ${b.tenor}Y`,
  issuer: b.issuer,
  bondType: b.type,
  rating: b.rating,
  couponRate: b.coupon,
  ytm: +(b.coupon + rAE(-0.3, 0.6)).toFixed(2),
  residualTenorYears: b.tenor,
  faceValue: 1000,
  minInvestment: b.type === "G-Sec" ? 10000 : 200000,  // AED — most UAE corporate sukuk have ~$50K min
  payout: b.type === "Zero Coupon" ? "Cumulative" : "Semi-Annual",
  taxable: b.taxable,
  risk: b.rating === "Sovereign" ? "Low" : b.type === "Perpetual / AT1" ? "Mod-High" : b.rating.startsWith("AA") ? "Low-Mod" : b.rating.startsWith("A") ? "Moderate" : "Mod-High",
}));

// =====================================================================
// ================ REGION-AWARE PROXY EXPORTS =========================
// =====================================================================

// =====================================================================
// ================ PHILIPPINES DATASET =================================
// =====================================================================
// PH-flavored mock data. PHP-denominated; PSE-listed equities, BSP/Bureau of Treasury
// govt bonds, BDO/BPI/Metrobank UITFs/Mutual funds, SEC-registered investment houses.

const randPH = seeded(5621);
const pickPH = <T,>(arr: T[]) => arr[Math.floor(randPH() * arr.length)];
const rPH = (min: number, max: number, dp = 2) => +(min + randPH() * (max - min)).toFixed(dp);

const AMCS_PH = [
  "BDO Trust", "BPI Investment Mgmt", "Metrobank Trust", "ATR Asset Mgmt",
  "Sun Life Asset Mgmt", "ALFM Mutual Funds", "First Metro Asset Mgmt",
  "Philequity Mgmt", "Manulife Investment", "ATRAM Trust", "PNB Trust",
  "Security Bank Trust", "Rizal Commercial Banking Trust",
];
const MF_SUB_PH = [
  "Philippine Equity", "Philippine Stock Index", "Balanced", "Bond", "Money Market",
  "Global Equity Feeder", "US Equity Feeder", "ASEAN Equity", "Dollar Bond", "Peso Bond",
];
const BENCH_PH = [
  "PSEi", "PSE All Shares", "HSBC Phil Bond Index", "MSCI Philippines",
  "Markit iBoxx ALBI Philippines", "MSCI Emerging Markets",
];
const FUND_MGRS_PH = [
  "M. Dela Cruz", "R. Santos", "J. Reyes", "A. Gonzales", "C. Bautista",
  "L. Aquino", "F. Tan", "K. Lim", "P. Cruz", "E. Mendoza",
];

const mutualFundsPH: MutualFund[] = Array.from({ length: 30 }, (_, i) => {
  const sub = pickPH(MF_SUB_PH);
  const isDebt = ["Bond", "Money Market", "Dollar Bond", "Peso Bond"].includes(sub);
  const isHybrid = sub === "Balanced";
  const assetClass: MutualFund["assetClass"] = isDebt ? "Debt" : isHybrid ? "Hybrid" : "Equity";
  const amc = pickPH(AMCS_PH);
  const r3 = rPH(isDebt ? 3 : 5, isDebt ? 6 : 20);
  const sharpe = rPH(0.2, 1.7);
  return {
    category: "MF",
    id: `MF-PH-${1000 + i}`,
    name: `${amc} ${sub} Fund`,
    amc,
    subCategory: sub,
    assetClass,
    nav: rPH(1.2, 8.5),
    aum: Math.round(rPH(50, 8500, 0)),         // PHP Million
    expenseRatio: rPH(0.5, 2.25),
    returns1y: rPH(isDebt ? 2.5 : -6, isDebt ? 6 : 28),
    returns3y: r3,
    returns5y: rPH(isDebt ? 3 : 5, isDebt ? 5.5 : 16),
    ytdReturn: rPH(isDebt ? 1 : -4, isDebt ? 4.5 : 16),
    sharpe,
    sortino: +(sharpe * rPH(1.1, 1.6)).toFixed(2),
    alpha: rPH(-2, 5),
    beta: isDebt ? rPH(0.05, 0.4) : rPH(0.6, 1.2),
    maxDrawdown: isDebt ? rPH(-4, -0.5) : isHybrid ? rPH(-16, -5) : rPH(-38, -10),
    risk: isDebt ? "Low-Mod" : isHybrid ? "Moderate" : pickPH(["Mod-High", "High", "Very High"] as RiskLevel[]),
    rating: Math.round(rPH(2, 5, 0)),
    minInvestment: pickPH([1000, 5000, 10000, 50000]),
    sipMin: pickPH([500, 1000, 2500, 5000]),
    exitLoad: isDebt ? "Nil" : "1% if <1Y",
    exitLoadDays: isDebt ? 0 : 365,
    lockInYears: 0,
    taxation: isDebt ? "Debt" : isHybrid ? "Hybrid" : "Equity",
    benchmark: isDebt ? "Markit iBoxx ALBI Philippines" : pickPH(BENCH_PH),
    fundManager: pickPH(FUND_MGRS_PH),
    inceptionYear: Math.round(rPH(2003, 2022, 0)),
  };
});

const BANKS_PH_PUB = ["Land Bank of the Philippines", "Development Bank of the Phil"];
const BANKS_PH_PVT = ["BDO Unibank", "BPI", "Metrobank", "PNB", "Security Bank", "China Bank", "Union Bank", "RCBC", "EastWest Bank"];
const NBFC_PH = ["Asialink Finance", "Maybank Phil", "Citystate Savings Bank", "Sun Life Grepa Financial"];

const FD_ENTRIES_PH: { issuer: string; sub: FixedDeposit["subCategory"]; rating: string }[] = [
  ...BANKS_PH_PUB.map(b => ({ issuer: b, sub: "Public Bank" as const, rating: "BBB+" })),
  ...BANKS_PH_PVT.map(b => ({ issuer: b, sub: "Private Bank" as const, rating: pickPH(["BBB+", "BBB", "A-"]) })),
  ...NBFC_PH.map(b => ({ issuer: b, sub: "NBFC" as const, rating: pickPH(["BB+", "BB"]) })),
];

const fixedDepositsPH: FixedDeposit[] = FD_ENTRIES_PH.flatMap((e, i) =>
  TENURES.slice(0, 4 + (i % 3)).map((t, j) => {
    const base = e.sub === "NBFC" ? 5.5 : e.sub === "Private Bank" ? 4.8 : 4.4;
    const rate = +(base + (t > 12 ? 0.3 : 0) + randPH() * 0.9).toFixed(2);
    return {
      category: "FD",
      id: `FD-PH-${2000 + i * 10 + j}`,
      name: `${e.issuer} ${t}M Time Deposit`,
      issuer: e.issuer,
      subCategory: e.sub,
      tenureMonths: t,
      interestRate: rate,
      seniorRate: +(rate + 0.25).toFixed(2),
      compounding: pickPH(["Quarterly", "Monthly", "At Maturity"] as FixedDeposit["compounding"][]),
      minInvestment: pickPH([10000, 50000, 100000, 500000]),
      maxInvestment: null,
      premature: randPH() > 0.2,
      rating: e.rating,
      insuredDICGC: true,         // PDIC covers up to ₱500K per depositor
      payout: pickPH(["Cumulative", "Non-Cumulative"] as const),
    };
  })
);

const INSURERS_PH = [
  "Sun Life of Canada (Phils)", "Philam Life (AIA)", "Manulife Phil", "BPI AIA Life",
  "Insular Life", "Pru Life UK", "FWD Life Insurance", "AXA Philippines",
  "Generali Phil", "BDO Life Assurance", "Allianz PNB Life", "Sun Life Grepa",
];

const insurancePH: Insurance[] = Array.from({ length: 26 }, (_, i) => {
  const sub = INS_SUB[i % INS_SUB.length];
  const insurer = pickPH(INSURERS_PH);
  const isTerm = sub === "Term";
  const isHealth = sub === "Health";
  const sa = isTerm ? pickPH([1000000, 3000000, 5000000, 10000000]) : isHealth ? pickPH([250000, 500000, 1000000, 2500000]) : pickPH([500000, 1000000, 2500000]);
  const premium = isTerm ? Math.round(sa * rPH(0.0010, 0.0025)) : isHealth ? Math.round(sa * rPH(0.025, 0.06)) : Math.round(sa * rPH(0.05, 0.13));
  return {
    category: "INS",
    id: `IN-PH-${3000 + i}`,
    name: `${insurer} ${sub} ${isTerm ? "Protect" : isHealth ? "Care" : "Plus"}`,
    insurer,
    subCategory: sub,
    sumAssured: sa,
    premiumAnnual: premium,
    policyTermYears: isTerm ? pickPH([20, 25, 30]) : sub === "Annuity" ? pickPH([10, 15, 20]) : pickPH([10, 15, 20]),
    ppt: isTerm ? pickPH([10, 15, 20]) : pickPH([5, 7, 10]),
    claimSettlement: rPH(91, 99),
    solvencyRatio: rPH(1.4, 2.6),
    irr: ["Endowment", "ULIP", "Annuity", "Child"].includes(sub) ? rPH(3.5, 7.0) : undefined,
    taxBenefit: "Premiums deductible under NIRC §34",
    riders: pickPH([["Critical Illness"], ["Accidental Death"], ["Critical Illness", "Waiver of Premium"], ["Accidental Death", "Critical Illness"]]),
    rating: Math.round(rPH(3, 5, 0)),
  };
});

const PMS_HOUSES_PH = [
  "BDO Trust", "BPI Wealth", "Metrobank Trust", "ATRAM Trust",
  "Security Bank Trust", "Manulife Investment Mgmt", "Sun Life Investment Mgmt",
  "Philequity Mgmt", "First Metro Sec", "China Bank Capital", "RCBC Trust",
];
const PMS_BENCH_PH = ["PSEi", "PSE All Shares", "MSCI Philippines", "Markit iBoxx ALBI Philippines"];

const pmsSchemesPH: PMS[] = Array.from({ length: 20 }, (_, i) => {
  const manager = pickPH(PMS_HOUSES_PH);
  const strategy = PMS_STRATEGIES[i % PMS_STRATEGIES.length];
  const isDebt = strategy === "Debt";
  return {
    category: "PMS",
    id: `PMS-PH-${4000 + i}`,
    name: `${manager} ${strategy} Mandate`,
    manager,
    structure: pickPH(["Discretionary", "Discretionary", "Non-Discretionary", "Advisory"] as PMS["structure"][]),
    strategy,
    benchmark: isDebt ? "Markit iBoxx ALBI Philippines" : pickPH(PMS_BENCH_PH),
    aum: Math.round(rPH(30, 3500, 0)),         // PHP Million
    minInvestment: 1000000,                    // ₱1M typical UITF-discretionary minimum
    returns1y: rPH(isDebt ? 3 : -4, isDebt ? 7 : 32),
    returns3y: rPH(isDebt ? 3.5 : 5, isDebt ? 6 : 22),
    returns5y: rPH(isDebt ? 4 : 7, isDebt ? 5.5 : 18),
    alpha: rPH(-2, 6),
    sharpe: rPH(0.4, 1.8),
    beta: isDebt ? rPH(0.1, 0.5) : rPH(0.7, 1.3),
    maxDrawdown: rPH(isDebt ? -6 : -32, isDebt ? -2 : -10),
    fixedFee: rPH(0.5, 2.0),
    performanceFee: pickPH(["20% over 8% hurdle", "15% over 6% hurdle", "Nil", "15% over benchmark"]),
    exitLoad: pickPH(["1% if <1Y", "Nil after 1Y", "2% Y1, 1% Y2"]),
    inception: `${2012 + Math.floor(randPH() * 12)}-0${1 + Math.floor(randPH() * 9)}`,
    risk: isDebt ? "Moderate" : pickPH(["Mod-High", "High", "Very High"] as RiskLevel[]),
    rating: Math.round(rPH(3, 5, 0)),
  };
});

const AIF_HOUSES_PH = [
  "Navegar PE", "Kickstart Ventures", "Foxmont Capital Partners", "Core Capital",
  "Ayala Corp Ventures", "Gobi-Core Phil Fund", "ICCP SBI Venture Partners",
  "JG Summit Capital", "SM Investments Capital", "Ascend Capital", "Cathay Land VC",
  "ATR KimEng Capital", "First Metro Sec Capital",
];

const aifSchemesPH: AIF[] = Array.from({ length: 22 }, (_, i) => {
  const manager = pickPH(AIF_HOUSES_PH);
  const catRoll = i % 3;
  const sebiCategory: AIF["sebiCategory"] = catRoll === 0 ? "Category I" : catRoll === 1 ? "Category II" : "Category III";
  const pool: AIF["subStrategy"][] = sebiCategory === "Category I"
    ? ["Venture Capital", "SME Fund", "Social Venture", "Infrastructure"]
    : sebiCategory === "Category II"
      ? ["Private Equity", "Real Estate", "Private Credit / Debt", "Distressed / Special Sit."]
      : ["Long-Short Hedge", "Long-Only Equity"];
  const subStrategy = pickPH(pool);
  const isDebt = subStrategy === "Private Credit / Debt";
  const isHedge = subStrategy === "Long-Short Hedge";
  const corpus = Math.round(rPH(30, 2000, 0)); // PHP Million
  return {
    category: "AIF",
    id: `AIF-PH-${5000 + i}`,
    name: `${manager} ${subStrategy} Fund ${["I", "II", "III", "IV"][i % 4]}`,
    manager,
    sebiCategory,
    subStrategy,
    structure: sebiCategory === "Category III" && isHedge ? pickPH(["Open-Ended", "Close-Ended"] as const) : "Close-Ended",
    vintage: 2018 + Math.floor(randPH() * 8),
    corpusTarget: corpus,
    commitments: Math.round(corpus * rPH(0.4, 1.0)),
    minInvestment: 5000000,                    // ₱5M typical SEC QI ticket
    tenureYears: sebiCategory === "Category III" ? pickPH([3, 5, 7]) : pickPH([7, 8, 10]),
    drawdownStatus: Math.round(rPH(15, 100, 0)),
    targetIRR: rPH(isDebt ? 10 : 15, isDebt ? 14 : 28),
    netIRR: rPH(isDebt ? 7 : -2, isDebt ? 13 : 30),
    moic: rPH(0.9, 3.0),
    hurdleRate: rPH(7, 11),
    carry: pickPH([10, 15, 20, 20]),
    managementFee: rPH(1.0, 2.5),
    domicile: pickPH(["India - GIFT IFSC", "India - Onshore"] as AIF["domicile"][]),
    risk: isDebt ? "Mod-High" : isHedge ? "High" : "Very High",
    rating: Math.round(rPH(3, 5, 0)),
  };
});

// --- PH Equities (PSE) -------------------------------------------------
const STOCKS_SEED_PH: { ticker: string; name: string; sector: string; cap: EquityStock["marketCap"]; price: number }[] = [
  // PSEi 30
  { ticker: "SM",    name: "SM Investments",            sector: "Conglomerate",     cap: "Large Cap", price: 880 },
  { ticker: "BDO",   name: "BDO Unibank",               sector: "Banking",          cap: "Large Cap", price: 158 },
  { ticker: "BPI",   name: "Bank of the Philippine Islands", sector: "Banking",     cap: "Large Cap", price: 142 },
  { ticker: "MBT",   name: "Metropolitan Bank & Trust", sector: "Banking",          cap: "Large Cap", price: 78 },
  { ticker: "ALI",   name: "Ayala Land",                sector: "Realty",           cap: "Large Cap", price: 28 },
  { ticker: "SMPH",  name: "SM Prime Holdings",         sector: "Realty",           cap: "Large Cap", price: 28.5 },
  { ticker: "AC",    name: "Ayala Corporation",         sector: "Conglomerate",     cap: "Large Cap", price: 615 },
  { ticker: "JFC",   name: "Jollibee Foods Corp",       sector: "Restaurants",      cap: "Large Cap", price: 245 },
  { ticker: "ICT",   name: "Intl Container Terminal",   sector: "Logistics",        cap: "Large Cap", price: 410 },
  { ticker: "TEL",   name: "PLDT",                      sector: "Telecom",          cap: "Large Cap", price: 1320 },
  { ticker: "GLO",   name: "Globe Telecom",             sector: "Telecom",          cap: "Large Cap", price: 1985 },
  { ticker: "MER",   name: "Manila Electric Co",        sector: "Power Utility",    cap: "Large Cap", price: 480 },
  { ticker: "ACEN",  name: "ACEN Corporation",          sector: "Power / Renewables", cap: "Large Cap", price: 4.85 },
  { ticker: "AEV",   name: "Aboitiz Equity Ventures",   sector: "Conglomerate",     cap: "Large Cap", price: 38 },
  { ticker: "AP",    name: "Aboitiz Power",             sector: "Power Utility",    cap: "Large Cap", price: 36 },
  { ticker: "URC",   name: "Universal Robina",          sector: "FMCG",             cap: "Large Cap", price: 84 },
  { ticker: "CNVRG", name: "Converge ICT Solutions",    sector: "Telecom / Fiber",  cap: "Large Cap", price: 16.5 },
  { ticker: "GTCAP", name: "GT Capital Holdings",       sector: "Conglomerate",     cap: "Large Cap", price: 685 },
  { ticker: "JGS",   name: "JG Summit Holdings",        sector: "Conglomerate",     cap: "Large Cap", price: 22 },
  { ticker: "DMC",   name: "DMCI Holdings",             sector: "Mining / Construction", cap: "Large Cap", price: 11.2 },
  { ticker: "SCC",   name: "Semirara Mining & Power",   sector: "Mining / Power",   cap: "Large Cap", price: 32 },
  { ticker: "PGOLD", name: "Puregold Price Club",       sector: "Retail",           cap: "Large Cap", price: 28.5 },
  { ticker: "EMP",   name: "Emperador",                 sector: "Beverages",        cap: "Large Cap", price: 18.5 },
  { ticker: "BLOOM", name: "Bloomberry Resorts",        sector: "Gaming / Leisure", cap: "Large Cap", price: 6.85 },
  { ticker: "MONDE", name: "Monde Nissin",              sector: "FMCG",             cap: "Large Cap", price: 8.45 },
  { ticker: "NIKL",  name: "Nickel Asia",               sector: "Mining",           cap: "Mid Cap",   price: 4.62 },
  { ticker: "FGEN",  name: "First Gen Corporation",     sector: "Power Utility",    cap: "Mid Cap",   price: 16.8 },
  { ticker: "PCOR",  name: "Petron Corporation",        sector: "Oil & Gas",        cap: "Mid Cap",   price: 3.18 },
  { ticker: "WLCON", name: "Wilcon Depot",              sector: "Retail",           cap: "Mid Cap",   price: 19.5 },
  { ticker: "AGI",   name: "Alliance Global Group",     sector: "Conglomerate",     cap: "Mid Cap",   price: 10.4 },
  // Mid / Small caps
  { ticker: "RLC",   name: "Robinsons Land",            sector: "Realty",           cap: "Mid Cap",   price: 14.2 },
  { ticker: "MEG",   name: "Megaworld",                 sector: "Realty",           cap: "Mid Cap",   price: 1.85 },
  { ticker: "VLL",   name: "Vista Land & Lifescapes",   sector: "Realty",           cap: "Mid Cap",   price: 1.62 },
  { ticker: "PIZZA", name: "Shakey's Pizza Asia",       sector: "Restaurants",      cap: "Mid Cap",   price: 8.95 },
  { ticker: "MAXS",  name: "Max's Group",               sector: "Restaurants",      cap: "Small Cap", price: 4.42 },
  { ticker: "CEB",   name: "Cebu Air (Cebu Pacific)",   sector: "Aviation",         cap: "Mid Cap",   price: 32 },
  { ticker: "PAL",   name: "PAL Holdings",              sector: "Aviation",         cap: "Mid Cap",   price: 7.15 },
  { ticker: "DDPC",  name: "DoubleDragon Properties",   sector: "Realty",           cap: "Small Cap", price: 8.4 },
  { ticker: "FB",    name: "San Miguel Food & Beverage", sector: "FMCG",            cap: "Mid Cap",   price: 4.65 },
  { ticker: "SMC",   name: "San Miguel Corporation",    sector: "Conglomerate",     cap: "Large Cap", price: 108 },
  { ticker: "EW",    name: "EastWest Banking",          sector: "Banking",          cap: "Mid Cap",   price: 12.4 },
  { ticker: "CHIB",  name: "China Banking Corp",        sector: "Banking",          cap: "Mid Cap",   price: 48 },
  { ticker: "SECB",  name: "Security Bank",             sector: "Banking",          cap: "Mid Cap",   price: 86 },
  { ticker: "PNB",   name: "Philippine National Bank",  sector: "Banking",          cap: "Mid Cap",   price: 28.5 },
  { ticker: "RCB",   name: "RCBC",                      sector: "Banking",          cap: "Mid Cap",   price: 24.8 },
  { ticker: "UBP",   name: "Union Bank of the Phil",    sector: "Banking",          cap: "Mid Cap",   price: 32 },
  { ticker: "MWIDE", name: "Megawide Construction",     sector: "Construction",     cap: "Small Cap", price: 3.15 },
  { ticker: "FNI",   name: "Global Ferronickel",        sector: "Mining",           cap: "Small Cap", price: 1.82 },
  { ticker: "AREIT", name: "AREIT Inc",                 sector: "REIT",             cap: "Mid Cap",   price: 38 },
  { ticker: "RCR",   name: "RL Commercial REIT",        sector: "REIT",             cap: "Mid Cap",   price: 5.85 },
  { ticker: "MREIT", name: "Megaworld REIT",            sector: "REIT",             cap: "Mid Cap",   price: 14.2 },
];

const equityStocksPH: EquityStock[] = STOCKS_SEED_PH.map((s, i) => {
  const isLarge = s.cap === "Large Cap";
  const cagr3 = rPH(isLarge ? 5 : 3, isLarge ? 22 : 36);
  const dy = rPH(0.3, isLarge ? 4.5 : 2.2);
  const eps = rPH(isLarge ? 6 : 10, isLarge ? 16 : 24);
  return {
    category: "EQ",
    id: `EQ-PH-${6000 + i}`,
    ticker: s.ticker,
    name: s.name,
    sector: s.sector,
    marketCap: s.cap,
    price: s.price,
    pe: rPH(8, 55),
    pb: rPH(0.7, 6),
    dividendYield: dy,
    roe: rPH(7, 28),
    beta: rPH(0.6, 1.4),
    cagr3y: cagr3,
    cagr5y: rPH(isLarge ? 6 : 5, isLarge ? 20 : 28),
    expectedReturn: +(eps + dy).toFixed(2),
    risk: isLarge ? "Mod-High" : s.cap === "Mid Cap" ? "High" : "Very High",
  };
});

// --- PH Bonds (Bureau of Treasury, corporate) --------------------------
const BOND_SEED_PH: { issuer: string; type: Bond["bondType"]; rating: string; coupon: number; tenor: number; taxable: boolean }[] = [
  // Govt — RTBs / FXTNs
  { issuer: "Bureau of Treasury PH", type: "G-Sec", rating: "Sovereign", coupon: 6.25, tenor: 10, taxable: true },
  { issuer: "Bureau of Treasury PH", type: "G-Sec", rating: "Sovereign", coupon: 6.85, tenor: 25, taxable: true },
  { issuer: "Bureau of Treasury PH", type: "G-Sec", rating: "Sovereign", coupon: 5.95, tenor: 5, taxable: true },
  { issuer: "Bureau of Treasury PH", type: "G-Sec", rating: "Sovereign", coupon: 6.15, tenor: 7, taxable: true },
  { issuer: "BTr Retail Treasury Bond", type: "G-Sec", rating: "Sovereign", coupon: 6.45, tenor: 5, taxable: true },
  { issuer: "BTr Premyo Bond", type: "G-Sec", rating: "Sovereign", coupon: 5.25, tenor: 1, taxable: true },
  { issuer: "BTr Dollar Sovereign", type: "G-Sec", rating: "Sovereign", coupon: 5.65, tenor: 10, taxable: false },
  // LGU / SDL-equivalent
  { issuer: "City of Manila LGU", type: "State Dev Loan", rating: "BBB-", coupon: 6.95, tenor: 10, taxable: true },
  { issuer: "Cebu City LGU", type: "State Dev Loan", rating: "BBB-", coupon: 7.05, tenor: 10, taxable: true },
  // PSU / GRE
  { issuer: "Power Sector Assets & Liabilities (PSALM)", type: "PSU Bond", rating: "BBB+", coupon: 6.55, tenor: 10, taxable: true },
  { issuer: "National Power Corp (NPC)", type: "PSU Bond", rating: "BBB+", coupon: 6.65, tenor: 7, taxable: true },
  { issuer: "Land Bank of the Philippines", type: "PSU Bond", rating: "BBB", coupon: 6.45, tenor: 5, taxable: true },
  { issuer: "Development Bank of the Phil", type: "PSU Bond", rating: "BBB", coupon: 6.55, tenor: 5, taxable: true },
  // Corporate
  { issuer: "Ayala Corporation", type: "Corporate Bond", rating: "AAA", coupon: 6.85, tenor: 7, taxable: true },
  { issuer: "Ayala Land", type: "Corporate Bond", rating: "AAA", coupon: 6.75, tenor: 5, taxable: true },
  { issuer: "SM Investments", type: "Corporate Bond", rating: "AAA", coupon: 6.65, tenor: 5, taxable: true },
  { issuer: "SM Prime Holdings", type: "Corporate Bond", rating: "AAA", coupon: 6.55, tenor: 7, taxable: true },
  { issuer: "BDO Unibank", type: "Corporate Bond", rating: "AAA", coupon: 6.45, tenor: 5, taxable: true },
  { issuer: "Metrobank", type: "Corporate Bond", rating: "AAA", coupon: 6.55, tenor: 5, taxable: true },
  { issuer: "PLDT", type: "Corporate Bond", rating: "AAA", coupon: 6.85, tenor: 10, taxable: true },
  { issuer: "Globe Telecom", type: "Corporate Bond", rating: "AAA", coupon: 6.75, tenor: 7, taxable: true },
  { issuer: "Meralco", type: "Corporate Bond", rating: "AAA", coupon: 6.85, tenor: 10, taxable: true },
  { issuer: "Aboitiz Equity Ventures", type: "Corporate Bond", rating: "AA+", coupon: 7.05, tenor: 5, taxable: true },
  { issuer: "JG Summit Holdings", type: "Corporate Bond", rating: "AA+", coupon: 7.15, tenor: 7, taxable: true },
  { issuer: "Jollibee Foods Corp", type: "Corporate Bond", rating: "AA", coupon: 7.25, tenor: 5, taxable: true },
  { issuer: "Petron Corporation", type: "Corporate Bond", rating: "A+", coupon: 7.85, tenor: 5, taxable: true },
  { issuer: "San Miguel Corporation", type: "Corporate Bond", rating: "AA", coupon: 7.45, tenor: 7, taxable: true },
  // AT1
  { issuer: "BDO Tier 2 Notes", type: "Perpetual / AT1", rating: "AA-", coupon: 8.25, tenor: 5, taxable: true },
  { issuer: "BPI Tier 2 Notes", type: "Perpetual / AT1", rating: "AA-", coupon: 8.15, tenor: 5, taxable: true },
  { issuer: "Metrobank Tier 2", type: "Perpetual / AT1", rating: "A+", coupon: 8.35, tenor: 5, taxable: true },
];

const bondsPH: Bond[] = BOND_SEED_PH.map((b, i) => ({
  category: "BOND",
  id: `BD-PH-${7000 + i}`,
  name: `${b.issuer} ${b.coupon}% ${b.tenor}Y`,
  issuer: b.issuer,
  bondType: b.type,
  rating: b.rating,
  couponRate: b.coupon,
  ytm: +(b.coupon + rPH(-0.3, 0.6)).toFixed(2),
  residualTenorYears: b.tenor,
  faceValue: 1000,
  minInvestment: b.type === "G-Sec" ? 5000 : 100000,
  payout: b.type === "Zero Coupon" ? "Cumulative" : "Semi-Annual",
  taxable: b.taxable,
  risk: b.rating === "Sovereign" ? "Low" : b.type === "Perpetual / AT1" ? "Mod-High" : b.rating.startsWith("AA") ? "Low-Mod" : b.rating.startsWith("A") ? "Moderate" : "Mod-High",
}));

// =====================================================================
// ================ REGION-AWARE PROXY EXPORTS =========================
// =====================================================================

const DATA_SETS: Record<Region, {
  mutualFunds: MutualFund[];
  fixedDeposits: FixedDeposit[];
  insurance: Insurance[];
  pmsSchemes: PMS[];
  aifSchemes: AIF[];
  equityStocks: EquityStock[];
  bonds: Bond[];
}> = {
  IN: {
    mutualFunds: mutualFundsIN,
    fixedDeposits: fixedDepositsIN,
    insurance: insuranceIN,
    pmsSchemes: pmsSchemesIN,
    aifSchemes: aifSchemesIN,
    equityStocks: equityStocksIN,
    bonds: bondsIN,
  },
  AE: {
    mutualFunds: mutualFundsAE,
    fixedDeposits: fixedDepositsAE,
    insurance: insuranceAE,
    pmsSchemes: pmsSchemesAE,
    aifSchemes: aifSchemesAE,
    equityStocks: equityStocksAE,
    bonds: bondsAE,
  },
  PH: {
    mutualFunds: mutualFundsPH,
    fixedDeposits: fixedDepositsPH,
    insurance: insurancePH,
    pmsSchemes: pmsSchemesPH,
    aifSchemes: aifSchemesPH,
    equityStocks: equityStocksPH,
    bonds: bondsPH,
  },
};

function regionArrayProxy<T>(key: keyof typeof DATA_SETS[Region]): T[] {
  // Proxy forwards array reads to the current region's array.
  const handler: ProxyHandler<any[]> = {
    get(_t, prop, _r) {
      const arr = DATA_SETS[getCurrentRegion()][key] as unknown as any[];
      const v: any = (arr as any)[prop as any];
      return typeof v === "function" ? v.bind(arr) : v;
    },
    has(_t, prop) {
      return prop in (DATA_SETS[getCurrentRegion()][key] as unknown as any[]);
    },
    ownKeys() {
      return Reflect.ownKeys(DATA_SETS[getCurrentRegion()][key] as unknown as any[]);
    },
    getOwnPropertyDescriptor(_t, p) {
      return Object.getOwnPropertyDescriptor(DATA_SETS[getCurrentRegion()][key] as unknown as any[], p);
    },
    set() { return true; }, // arrays are read-only from consumers
  };
  return new Proxy([] as any[], handler) as T[];
}

export const mutualFunds   = regionArrayProxy<MutualFund>("mutualFunds");
export const fixedDeposits = regionArrayProxy<FixedDeposit>("fixedDeposits");
export const insurance     = regionArrayProxy<Insurance>("insurance");
export const pmsSchemes    = regionArrayProxy<PMS>("pmsSchemes");
export const aifSchemes    = regionArrayProxy<AIF>("aifSchemes");
export const equityStocks  = regionArrayProxy<EquityStock>("equityStocks");
export const bonds         = regionArrayProxy<Bond>("bonds");

// Recomputed each access via proxy semantics:
export const allProducts: Product[] = new Proxy([] as Product[], {
  get(_t, prop) {
    const r = getCurrentRegion();
    const d = DATA_SETS[r];
    const merged: Product[] = [
      ...d.mutualFunds, ...d.fixedDeposits, ...d.insurance, ...d.pmsSchemes, ...d.aifSchemes,
    ];
    const v: any = (merged as any)[prop as any];
    return typeof v === "function" ? v.bind(merged) : v;
  },
  ownKeys() {
    const d = DATA_SETS[getCurrentRegion()];
    const merged = [...d.mutualFunds, ...d.fixedDeposits, ...d.insurance, ...d.pmsSchemes, ...d.aifSchemes];
    return Reflect.ownKeys(merged);
  },
});
