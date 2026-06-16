export type Category = "MF" | "FD" | "INS" | "PMS" | "AIF";

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
  sharpe: number;
  alpha: number;
  beta: number;
  risk: RiskLevel;
  rating: number; // 1-5
  minInvestment: number;
  exitLoad: string;
  benchmark: string;
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

export const mutualFunds: MutualFund[] = Array.from({ length: 38 }, (_, i) => {
  const sub = pick(MF_SUB);
  const isDebt = ["Liquid", "Corporate Bond", "Gilt"].includes(sub);
  const isHybrid = sub.startsWith("Hybrid");
  const assetClass: MutualFund["assetClass"] = isDebt ? "Debt" : isHybrid ? "Hybrid" : "Equity";
  const amc = pick(AMCS);
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
    returns3y: r(isDebt ? 5 : 6, isDebt ? 8.5 : 28),
    returns5y: r(isDebt ? 5.5 : 8, isDebt ? 8 : 22),
    sharpe: r(0.2, 1.9),
    alpha: r(-3, 7),
    beta: isDebt ? r(0.05, 0.4) : r(0.7, 1.25),
    risk: isDebt ? "Low-Mod" : isHybrid ? "Moderate" : pick(["Mod-High", "High", "Very High"] as RiskLevel[]),
    rating: Math.round(r(2, 5, 0)),
    minInvestment: pick([100, 500, 1000, 5000]),
    exitLoad: isDebt ? "Nil" : "1% if <1Y",
    benchmark: isDebt ? "CRISIL Composite Bond" : pick(BENCH),
  };
});

const FD_ENTRIES: { issuer: string; sub: FixedDeposit["subCategory"]; rating: string }[] = [
  ...BANKS.slice(0, 4).map(b => ({ issuer: b, sub: "Public Bank" as const, rating: "AAA" })),
  ...BANKS.slice(4).map(b => ({ issuer: b, sub: "Private Bank" as const, rating: pick(["AAA", "AA+"]) })),
  ...SFB.map(b => ({ issuer: b, sub: "Small Finance" as const, rating: pick(["AA-", "A+", "AA"]) })),
  ...NBFC.map(b => ({ issuer: b, sub: "NBFC" as const, rating: pick(["AAA", "AA+"]) })),
];

const TENURES = [3, 6, 12, 18, 24, 36, 60, 84, 120];

export const fixedDeposits: FixedDeposit[] = FD_ENTRIES.flatMap((e, i) =>
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

export const insurance: Insurance[] = Array.from({ length: 32 }, (_, i) => {
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

export const pmsSchemes: PMS[] = Array.from({ length: 28 }, (_, i) => {
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

export const aifSchemes: AIF[] = Array.from({ length: 30 }, (_, i) => {
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

export const allProducts: Product[] = [...mutualFunds, ...fixedDeposits, ...insurance, ...pmsSchemes, ...aifSchemes];

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
  { ticker: "PERSISTENT", name: "Persistent Systems", sector: "IT Services", cap: "Mid Cap", price: 5680 },
  { ticker: "POLYCAB", name: "Polycab India", sector: "Capital Goods", cap: "Mid Cap", price: 6720 },
  { ticker: "TRENT", name: "Trent", sector: "Retail", cap: "Mid Cap", price: 7240 },
  { ticker: "DIXON", name: "Dixon Technologies", sector: "Electronics Mfg", cap: "Mid Cap", price: 14820 },
  { ticker: "KEI", name: "KEI Industries", sector: "Capital Goods", cap: "Mid Cap", price: 3960 },
  { ticker: "CAMS", name: "Computer Age Mgmt", sector: "Financial Services", cap: "Mid Cap", price: 4380 },
  { ticker: "CDSL", name: "Central Depository Svc", sector: "Financial Services", cap: "Small Cap", price: 1620 },
  { ticker: "MAPMYINDIA", name: "C.E. Info Systems", sector: "Tech / Maps", cap: "Small Cap", price: 1985 },
  { ticker: "AETHER", name: "Aether Industries", sector: "Specialty Chemicals", cap: "Small Cap", price: 845 },
  { ticker: "RAINBOW", name: "Rainbow Children's", sector: "Healthcare", cap: "Small Cap", price: 1480 },
];

export const equityStocks: EquityStock[] = STOCKS_SEED.map((s, i) => {
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
  bondType: "G-Sec" | "State Dev Loan" | "PSU Bond" | "Corporate Bond" | "Tax-Free Bond" | "Perpetual / AT1";
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
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 7.18, tenor: 10, taxable: true },
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 7.34, tenor: 30, taxable: true },
  { issuer: "Govt of India", type: "G-Sec", rating: "Sovereign", coupon: 6.79, tenor: 5, taxable: true },
  { issuer: "Maharashtra SDL", type: "State Dev Loan", rating: "Sovereign", coupon: 7.45, tenor: 12, taxable: true },
  { issuer: "Tamil Nadu SDL", type: "State Dev Loan", rating: "Sovereign", coupon: 7.42, tenor: 10, taxable: true },
  { issuer: "NHAI", type: "PSU Bond", rating: "AAA", coupon: 7.65, tenor: 15, taxable: true },
  { issuer: "PFC", type: "PSU Bond", rating: "AAA", coupon: 7.78, tenor: 10, taxable: true },
  { issuer: "REC", type: "PSU Bond", rating: "AAA", coupon: 7.72, tenor: 7, taxable: true },
  { issuer: "IRFC", type: "Tax-Free Bond", rating: "AAA", coupon: 7.35, tenor: 10, taxable: false },
  { issuer: "NHAI", type: "Tax-Free Bond", rating: "AAA", coupon: 7.39, tenor: 15, taxable: false },
  { issuer: "HDFC Ltd", type: "Corporate Bond", rating: "AAA", coupon: 7.95, tenor: 5, taxable: true },
  { issuer: "Bajaj Finance", type: "Corporate Bond", rating: "AAA", coupon: 8.15, tenor: 5, taxable: true },
  { issuer: "L&T Finance", type: "Corporate Bond", rating: "AA+", coupon: 8.45, tenor: 3, taxable: true },
  { issuer: "Shriram Finance", type: "Corporate Bond", rating: "AA+", coupon: 9.05, tenor: 5, taxable: true },
  { issuer: "Muthoot Finance", type: "Corporate Bond", rating: "AA+", coupon: 9.25, tenor: 3, taxable: true },
  { issuer: "SBI", type: "Perpetual / AT1", rating: "AA+", coupon: 8.75, tenor: 5, taxable: true },
  { issuer: "HDFC Bank", type: "Perpetual / AT1", rating: "AA+", coupon: 8.55, tenor: 5, taxable: true },
];

export const bonds: Bond[] = BOND_SEED.map((b, i) => ({
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
  payout: b.type === "Tax-Free Bond" ? "Annual" : "Semi-Annual",
  taxable: b.taxable,
  risk: b.rating === "Sovereign" ? "Low" : b.rating === "AAA" ? "Low-Mod" : b.type === "Perpetual / AT1" ? "Mod-High" : "Moderate",
}));
