// Sample portfolios + families for demo / onboarding.
// Stored in the same localStorage key the eCAS importer uses, so the Reports
// page and Portfolio page can consume them without any extra plumbing.

import type { Holding, PortfolioParseResult } from "@/lib/ecas-parser";

export const STORAGE_KEY = "mpower.savedPortfolios.v1";

export type SavedPortfolio = {
  id: string;
  name: string;
  savedAt: number;
  family?: string;
  isSample?: boolean;
  data: PortfolioParseResult;
};

// ---------- Holding factory helpers ---------------------------------------

let _isinCounter = 1000;
function isin(prefix: "INE" | "INF" = "INE") {
  _isinCounter += 1;
  // pad to 9 alphanumerics
  const suffix = (_isinCounter.toString(36).toUpperCase() + "AAAAAAAA").slice(0, 9);
  return `${prefix}${suffix}`;
}

type Mk = (name: string, value: number, opts?: Partial<Holding>) => Holding;

const mkMfEquity: Mk = (name, value, opts) => ({
  isin: isin("INF"), name, type: "Mutual Fund",
  quantity: Math.round(value / 100), price: 100, value,
  source: "NSDL", productCategory: "Mutual Fund - Equity", ...opts,
});
const mkMfDebt: Mk = (name, value, opts) => ({
  isin: isin("INF"), name, type: "Mutual Fund",
  quantity: Math.round(value / 1000), price: 1000, value,
  source: "NSDL", productCategory: "Mutual Fund - Debt", ...opts,
});
const mkMfHybrid: Mk = (name, value, opts) => ({
  isin: isin("INF"), name, type: "Mutual Fund",
  quantity: Math.round(value / 50), price: 50, value,
  source: "NSDL", productCategory: "Mutual Fund - Hybrid", ...opts,
});
const mkEquity: Mk = (name, value, opts) => ({
  isin: isin("INE"), name, type: "Equity",
  quantity: Math.round(value / 500), price: 500, value,
  source: "NSDL", productCategory: "Direct Equity", ...opts,
});
const mkBond: Mk = (name, value, opts) => ({
  isin: isin("INE"), name, type: "Bond",
  quantity: Math.round(value / 1000), price: 1000, value,
  source: "NSDL", productCategory: "Direct Debt", ...opts,
});
const mkPms: Mk = (name, value, opts) => ({
  isin: isin("INE"), name: `${name} PMS`, type: "Other",
  quantity: 1, price: value, value,
  source: "NSDL", productCategory: "PMS", ...opts,
});
const mkAif: Mk = (name, value, opts) => ({
  isin: isin("INE"), name: `${name} AIF`, type: "Other",
  quantity: 1, price: value, value,
  source: "NSDL", productCategory: "AIF", ...opts,
});
const mkReit: Mk = (name, value, opts) => ({
  isin: isin("INE"), name: `${name} REIT`, type: "Equity",
  quantity: Math.round(value / 350), price: 350, value,
  source: "NSDL", productCategory: "REIT", ...opts,
});
const mkInvit: Mk = (name, value, opts) => ({
  isin: isin("INE"), name: `${name} InvIT`, type: "Equity",
  quantity: Math.round(value / 120), price: 120, value,
  source: "NSDL", productCategory: "InvIT", ...opts,
});
const mkPe: Mk = (name, value, opts) => ({
  isin: isin("INE"), name: `${name} Private Equity Fund`, type: "Other",
  quantity: 1, price: value, value,
  source: "NSDL", productCategory: "Private Equity", ...opts,
});
const mkRe: Mk = (name, value, opts) => ({
  isin: isin("INE"), name: `${name} Real Estate`, type: "Other",
  quantity: 1, price: value, value,
  source: "NSDL", productCategory: "Real Estate", ...opts,
});

function pkg(investor: string, pan: string, holdings: Holding[]): PortfolioParseResult {
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  return {
    source: "NSDL", asOf: "31-May-2026", investor, pan,
    holdings, totalValue, rawTextLength: 0,
  };
}

// ---------- 10 portfolios across 4 families -------------------------------

function buildPortfolios(): SavedPortfolio[] {
  const now = Date.now();
  const list: Array<Omit<SavedPortfolio, "savedAt" | "isSample">> = [
    // -------- Sharma Family (3 members) -------------------------------
    {
      id: "sample-sharma-rajesh",
      name: "Rajesh Sharma — HUF",
      family: "Sharma Family",
      data: pkg("Rajesh Sharma (HUF)", "AAAPS1234R", [
        mkEquity("Reliance Industries", 4200000),
        mkEquity("HDFC Bank", 3100000),
        mkEquity("Infosys", 2400000),
        mkMfEquity("Mirae Asset Large Cap Fund - Direct Growth", 5800000),
        mkMfEquity("Parag Parikh Flexi Cap Fund - Direct Growth", 4200000),
        mkMfHybrid("ICICI Pru Balanced Advantage - Direct Growth", 2800000),
        mkMfDebt("HDFC Corporate Bond Fund - Direct Growth", 3500000),
        mkBond("8.05% HDFC Ltd NCD 2028 AAA", 2500000),
        mkBond("7.42% GOI 2033 G-Sec", 1800000),
        mkPms("Marcellus Consistent Compounders", 9000000),
        mkAif("Edelweiss Crossover Opportunities Fund III CAT-II", 7500000),
        mkReit("Embassy Office Parks", 1400000),
        mkInvit("PowerGrid InvIT", 900000),
        mkPe("Kotak India Growth Fund IV", 6000000),
        mkRe("Bengaluru Whitefield Commercial Unit", 12000000),
      ]),
    },
    {
      id: "sample-sharma-priya",
      name: "Priya Sharma",
      family: "Sharma Family",
      data: pkg("Priya Sharma", "AAAPS5678P", [
        mkEquity("TCS", 1200000),
        mkEquity("Asian Paints", 800000),
        mkMfEquity("Axis Mid Cap Fund - Direct Growth", 2400000),
        mkMfEquity("Nippon India Small Cap Fund - Direct Growth", 1800000),
        mkMfHybrid("HDFC Balanced Advantage - Direct Growth", 1500000),
        mkMfDebt("ICICI Pru Short Term Debt Fund - Direct Growth", 1200000),
        mkBond("7.65% PFC Bond 2029 AAA", 1000000),
        mkPms("ASK India Select Portfolio", 5000000),
        mkReit("Mindspace Business Parks", 600000),
      ]),
    },
    {
      id: "sample-sharma-aarav",
      name: "Aarav Sharma (Minor)",
      family: "Sharma Family",
      data: pkg("Aarav Sharma (Minor) U/G Rajesh Sharma", "AAAPS9999A", [
        mkMfEquity("UTI Nifty 50 Index Fund - Direct Growth", 600000),
        mkMfEquity("Quant Small Cap Fund - Direct Growth", 400000),
        mkMfDebt("SBI Magnum Gilt Fund - Direct Growth", 300000),
        mkEquity("Bharti Airtel", 250000),
      ]),
    },

    // -------- Patel Family (3 members) --------------------------------
    {
      id: "sample-patel-arun",
      name: "Arun Patel",
      family: "Patel Family",
      data: pkg("Arun Patel", "AAEPP4321A", [
        mkEquity("ICICI Bank", 2800000),
        mkEquity("Larsen & Toubro", 2100000),
        mkEquity("Sun Pharma", 1500000),
        mkEquity("Maruti Suzuki", 1700000),
        mkMfEquity("SBI Bluechip Fund - Direct Growth", 4500000),
        mkMfEquity("Kotak Emerging Equity - Direct Growth", 3200000),
        mkMfDebt("Aditya Birla SL Corporate Bond - Direct Growth", 2500000),
        mkMfDebt("Bandhan Banking & PSU Debt - Direct Growth", 2000000),
        mkBond("7.95% NHAI Bond 2030 AAA", 3000000),
        mkBond("8.30% NABARD 2032 AAA", 2200000),
        mkBond("7.26% GOI 2033 G-Sec", 1500000),
        mkPms("Motilal Oswal Value Strategy", 7500000),
        mkAif("ICICI Pru Real Estate AIF CAT-II", 5000000),
        mkInvit("IndiGrid InvIT", 1100000),
        mkReit("Brookfield India REIT", 800000),
        mkPe("Chiratae Ventures Fund IV", 4500000),
        mkRe("Ahmedabad SG Highway Office", 9500000),
      ]),
    },
    {
      id: "sample-patel-meera",
      name: "Meera Patel",
      family: "Patel Family",
      data: pkg("Meera Patel", "AAEPP8765M", [
        mkEquity("Nestle India", 900000),
        mkMfEquity("Canara Robeco Bluechip - Direct Growth", 1800000),
        mkMfEquity("DSP Mid Cap Fund - Direct Growth", 1400000),
        mkMfHybrid("ICICI Pru Equity & Debt - Direct Growth", 1200000),
        mkMfDebt("HDFC Short Term Debt - Direct Growth", 1000000),
        mkBond("7.50% REC Ltd 2028 AAA", 800000),
        mkPms("White Oak India Pioneers Equity", 4000000),
        mkReit("Embassy Office Parks", 500000),
      ]),
    },
    {
      id: "sample-patel-karan",
      name: "Karan Patel",
      family: "Patel Family",
      data: pkg("Karan Patel", "AAEPP1111K", [
        mkEquity("Adani Ports", 700000),
        mkEquity("Titan Company", 600000),
        mkMfEquity("Parag Parikh Flexi Cap - Direct Growth", 1500000),
        mkMfEquity("Quant Active Fund - Direct Growth", 1100000),
        mkAif("True North Fund VII CAT-II", 3500000),
        mkInvit("PowerGrid InvIT", 400000),
      ]),
    },

    // -------- Mehta Family (2 members) --------------------------------
    {
      id: "sample-mehta-vikram",
      name: "Vikram Mehta",
      family: "Mehta Family",
      data: pkg("Vikram Mehta", "AABCM2345V", [
        mkEquity("HUL", 1800000),
        mkEquity("Bajaj Finance", 2200000),
        mkEquity("UltraTech Cement", 1600000),
        mkMfEquity("HDFC Top 100 Fund - Direct Growth", 3000000),
        mkMfEquity("Mirae Asset Emerging Bluechip - Direct Growth", 2500000),
        mkMfHybrid("Edelweiss Balanced Advantage - Direct Growth", 1500000),
        mkMfDebt("Kotak Corporate Bond Fund - Direct Growth", 2000000),
        mkBond("7.75% IRFC Bond 2031 AAA", 2500000),
        mkBond("8.10% LIC Housing Finance 2029 AAA", 1800000),
        mkPms("Sundaram India Secular Opportunities", 5500000),
        mkAif("Avendus Absolute Return Fund CAT-III", 6000000),
        mkReit("Mindspace Business Parks", 700000),
        mkInvit("IndiGrid InvIT", 600000),
        mkRe("Mumbai BKC Commercial Office Fraction", 8000000),
      ]),
    },
    {
      id: "sample-mehta-anita",
      name: "Anita Mehta",
      family: "Mehta Family",
      data: pkg("Anita Mehta", "AABCM6789N", [
        mkMfEquity("ICICI Pru Bluechip - Direct Growth", 2000000),
        mkMfEquity("Tata Digital India Fund - Direct Growth", 1100000),
        mkMfDebt("Axis Banking & PSU Debt - Direct Growth", 1500000),
        mkBond("7.42% GOI 2033 G-Sec", 1200000),
        mkPms("ASK Lifestyle Portfolio", 3500000),
        mkReit("Brookfield India REIT", 450000),
      ]),
    },

    // -------- Singh (single, ultra-HNI) -------------------------------
    {
      id: "sample-singh-harpreet",
      name: "Harpreet Singh — Family Office",
      family: "Singh Family Office",
      data: pkg("Harpreet Singh", "AAGPS3456H", [
        mkEquity("Reliance Industries", 6500000),
        mkEquity("HDFC Bank", 4200000),
        mkEquity("Tata Consultancy Services", 3800000),
        mkEquity("Bharti Airtel", 2400000),
        mkEquity("Pidilite Industries", 1800000),
        mkMfEquity("Parag Parikh Flexi Cap - Direct Growth", 7000000),
        mkMfEquity("Mirae Asset Large Cap Fund - Direct Growth", 5500000),
        mkMfDebt("HDFC Corporate Bond Fund - Direct Growth", 6000000),
        mkBond("7.95% NHAI 2030 AAA", 4500000),
        mkBond("8.05% HDFC Ltd NCD 2028 AAA", 3500000),
        mkBond("7.26% GOI 2033 G-Sec", 5500000),
        mkPms("Marcellus Consistent Compounders", 15000000),
        mkPms("White Oak India Pioneers", 12000000),
        mkAif("Edelweiss Crossover Fund IV CAT-II", 18000000),
        mkAif("Avendus Absolute Return CAT-III", 12000000),
        mkReit("Embassy Office Parks", 3200000),
        mkReit("Mindspace Business Parks", 1800000),
        mkInvit("PowerGrid InvIT", 2200000),
        mkInvit("IndiGrid InvIT", 1600000),
        mkPe("Kotak India Growth IV", 14000000),
        mkPe("ChrysCapital IX", 10000000),
        mkRe("Gurgaon Cyber City Office Floor", 35000000),
        mkRe("Goa Beachfront Villa", 18000000),
      ]),
    },

    // -------- Iyer (retiree, debt-heavy) ------------------------------
    {
      id: "sample-iyer-ramesh",
      name: "Ramesh Iyer — Retiree",
      data: pkg("Ramesh Iyer", "AAAPI7890R", [
        mkMfDebt("HDFC Corporate Bond - Direct Growth", 4500000),
        mkMfDebt("ICICI Pru All Seasons Bond - Direct Growth", 3500000),
        mkMfDebt("SBI Magnum Gilt - Direct Growth", 2800000),
        mkMfHybrid("ICICI Pru Equity & Debt - Direct Growth", 2200000),
        mkMfEquity("UTI Nifty 50 Index Fund - Direct Growth", 1500000),
        mkBond("7.95% NHAI Bond 2030 AAA", 3000000),
        mkBond("8.10% LIC Housing Finance 2029 AAA", 2500000),
        mkBond("7.42% GOI 2033 G-Sec", 2200000),
        mkBond("7.26% GOI 2033 G-Sec", 1800000),
        mkReit("Embassy Office Parks", 900000),
        mkInvit("PowerGrid InvIT", 700000),
      ]),
    },
  ];

  return list.map(p => ({ ...p, savedAt: now, isSample: true }));
}

export const SAMPLE_PORTFOLIOS: SavedPortfolio[] = buildPortfolios();

export const SAMPLE_FAMILIES: { name: string; portfolioIds: string[] }[] = [
  { name: "Sharma Family",       portfolioIds: ["sample-sharma-rajesh", "sample-sharma-priya", "sample-sharma-aarav"] },
  { name: "Patel Family",        portfolioIds: ["sample-patel-arun", "sample-patel-meera", "sample-patel-karan"] },
  { name: "Mehta Family",        portfolioIds: ["sample-mehta-vikram", "sample-mehta-anita"] },
  { name: "Singh Family Office", portfolioIds: ["sample-singh-harpreet"] },
];

/** Merge sample portfolios into the existing saved list (idempotent — keyed by id). */
export function seedSamplePortfolios(): SavedPortfolio[] {
  if (typeof window === "undefined") return [];
  let existing: SavedPortfolio[] = [];
  try { existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { /* noop */ }
  const haveIds = new Set(existing.map(s => s.id));
  const toAdd = SAMPLE_PORTFOLIOS.filter(s => !haveIds.has(s.id));
  const next = [...toAdd, ...existing];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function removeSamplePortfolios(): SavedPortfolio[] {
  if (typeof window === "undefined") return [];
  let existing: SavedPortfolio[] = [];
  try { existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { /* noop */ }
  const sampleIds = new Set(SAMPLE_PORTFOLIOS.map(s => s.id));
  const next = existing.filter(s => !sampleIds.has(s.id) && !s.isSample);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
