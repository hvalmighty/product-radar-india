// Sample portfolios + families for demo / onboarding.
// Region-aware: India samples live under one storage key, UAE samples under another,
// keyed off the active region in src/lib/region.tsx.

import type { Holding, PortfolioParseResult } from "@/lib/ecas-parser";
import { getCurrentRegion, type Region } from "@/lib/region";

const STORAGE_KEY_BASE = "mpower.savedPortfolios.v1";
export function storageKeyForRegion(r: Region): string {
  return r === "IN" ? STORAGE_KEY_BASE : `${STORAGE_KEY_BASE}.${r}`;
}
/** Back-compat default export — points at India storage. New code should
 * prefer storageKeyForRegion(getCurrentRegion()). */
export const STORAGE_KEY = STORAGE_KEY_BASE;

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
function isin(prefix: string = "INE") {
  _isinCounter += 1;
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

// --- UAE factory helpers (AED) -------------------------------------------
const mkAeEquity: Mk = (name, value, opts) => ({
  isin: isin("AED"), name, type: "Equity",
  quantity: Math.round(value / 100), price: 100, value,
  source: "DFM", productCategory: "Direct Equity", ...opts,
});
const mkAeSukuk: Mk = (name, value, opts) => ({
  isin: isin("AED"), name, type: "Bond",
  quantity: Math.round(value / 1000), price: 1000, value,
  source: "DFM", productCategory: "Direct Debt", ...opts,
});
const mkAeMfEquity: Mk = (name, value, opts) => ({
  isin: isin("AED"), name, type: "Mutual Fund",
  quantity: Math.round(value / 100), price: 100, value,
  source: "DFM", productCategory: "Mutual Fund - Equity", ...opts,
});
const mkAeMfDebt: Mk = (name, value, opts) => ({
  isin: isin("AED"), name, type: "Mutual Fund",
  quantity: Math.round(value / 1000), price: 1000, value,
  source: "DFM", productCategory: "Mutual Fund - Debt", ...opts,
});
const mkAeReit: Mk = (name, value, opts) => ({
  isin: isin("AED"), name: `${name} REIT`, type: "Equity",
  quantity: Math.round(value / 350), price: 350, value,
  source: "DFM", productCategory: "REIT", ...opts,
});
const mkAeRe: Mk = (name, value, opts) => ({
  isin: isin("AED"), name: `${name} Real Estate`, type: "Other",
  quantity: 1, price: value, value,
  source: "DFM", productCategory: "Real Estate", ...opts,
});

function pkg(investor: string, pan: string, holdings: Holding[], opts?: { source?: PortfolioParseResult["source"]; asOf?: string }): PortfolioParseResult {
  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  return {
    source: opts?.source ?? "NSDL", asOf: opts?.asOf ?? "31-May-2026", investor, pan,
    holdings, totalValue, rawTextLength: 0,
  };
}

// ============================================================================
// INDIA portfolios
// ============================================================================
function buildPortfoliosIN(): SavedPortfolio[] {
  const now = Date.now();
  const list: Array<Omit<SavedPortfolio, "savedAt" | "isSample">> = [
    {
      id: "sample-sharma-rajesh", name: "Rajesh Sharma — HUF", family: "Sharma Family",
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
      id: "sample-sharma-priya", name: "Priya Sharma", family: "Sharma Family",
      data: pkg("Priya Sharma", "AAAPS5678P", [
        mkEquity("TCS", 1200000), mkEquity("Asian Paints", 800000),
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
      id: "sample-sharma-aarav", name: "Aarav Sharma (Minor)", family: "Sharma Family",
      data: pkg("Aarav Sharma (Minor) U/G Rajesh Sharma", "AAAPS9999A", [
        mkMfEquity("UTI Nifty 50 Index Fund - Direct Growth", 600000),
        mkMfEquity("Quant Small Cap Fund - Direct Growth", 400000),
        mkMfDebt("SBI Magnum Gilt Fund - Direct Growth", 300000),
        mkEquity("Bharti Airtel", 250000),
      ]),
    },
    {
      id: "sample-patel-arun", name: "Arun Patel", family: "Patel Family",
      data: pkg("Arun Patel", "AAEPP4321A", [
        mkEquity("ICICI Bank", 2800000), mkEquity("Larsen & Toubro", 2100000),
        mkEquity("Sun Pharma", 1500000), mkEquity("Maruti Suzuki", 1700000),
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
      id: "sample-patel-meera", name: "Meera Patel", family: "Patel Family",
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
      id: "sample-patel-karan", name: "Karan Patel", family: "Patel Family",
      data: pkg("Karan Patel", "AAEPP1111K", [
        mkEquity("Adani Ports", 700000), mkEquity("Titan Company", 600000),
        mkMfEquity("Parag Parikh Flexi Cap - Direct Growth", 1500000),
        mkMfEquity("Quant Active Fund - Direct Growth", 1100000),
        mkAif("True North Fund VII CAT-II", 3500000),
        mkInvit("PowerGrid InvIT", 400000),
      ]),
    },
    {
      id: "sample-mehta-vikram", name: "Vikram Mehta", family: "Mehta Family",
      data: pkg("Vikram Mehta", "AABCM2345V", [
        mkEquity("HUL", 1800000), mkEquity("Bajaj Finance", 2200000), mkEquity("UltraTech Cement", 1600000),
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
      id: "sample-mehta-anita", name: "Anita Mehta", family: "Mehta Family",
      data: pkg("Anita Mehta", "AABCM6789N", [
        mkMfEquity("ICICI Pru Bluechip - Direct Growth", 2000000),
        mkMfEquity("Tata Digital India Fund - Direct Growth", 1100000),
        mkMfDebt("Axis Banking & PSU Debt - Direct Growth", 1500000),
        mkBond("7.42% GOI 2033 G-Sec", 1200000),
        mkPms("ASK Lifestyle Portfolio", 3500000),
        mkReit("Brookfield India REIT", 450000),
      ]),
    },
    {
      id: "sample-singh-harpreet", name: "Harpreet Singh — Family Office", family: "Singh Family Office",
      data: pkg("Harpreet Singh", "AAGPS3456H", [
        mkEquity("Reliance Industries", 6500000), mkEquity("HDFC Bank", 4200000),
        mkEquity("Tata Consultancy Services", 3800000), mkEquity("Bharti Airtel", 2400000),
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
        mkReit("Embassy Office Parks", 3200000), mkReit("Mindspace Business Parks", 1800000),
        mkInvit("PowerGrid InvIT", 2200000), mkInvit("IndiGrid InvIT", 1600000),
        mkPe("Kotak India Growth IV", 14000000), mkPe("ChrysCapital IX", 10000000),
        mkRe("Gurgaon Cyber City Office Floor", 35000000),
        mkRe("Goa Beachfront Villa", 18000000),
      ]),
    },
    {
      id: "sample-iyer-ramesh", name: "Ramesh Iyer — Retiree",
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

// ============================================================================
// UAE portfolios (AED, DFM/ADX securities, DIFC funds)
// ============================================================================
function buildPortfoliosAE(): SavedPortfolio[] {
  const now = Date.now();
  const ae = (investor: string, pan: string, holdings: Holding[]) =>
    pkg(investor, pan, holdings, { source: "DFM/ADX Custodian", asOf: "31-May-2026" });
  const list: Array<Omit<SavedPortfolio, "savedAt" | "isSample">> = [
    {
      id: "sample-ae-almaktoum-rashid", name: "Sheikh Rashid Al Maktoum", family: "Al Maktoum Family Office",
      data: ae("Sheikh Rashid Al Maktoum", "EID-784-1980-1234567-1", [
        mkAeEquity("Emaar Properties", 4_200_000),
        mkAeEquity("Emirates NBD Bank", 3_100_000),
        mkAeEquity("DEWA", 2_400_000),
        mkAeEquity("Salik Company", 1_800_000),
        mkAeMfEquity("Emirates NBD GCC Equity Fund", 2_800_000),
        mkAeMfEquity("FAB UAE Equity Fund", 2_100_000),
        mkAeMfDebt("Mashreq Sukuk Fund", 3_500_000),
        mkAeSukuk("Dubai Govt Sukuk 4.95% 2034", 5_000_000),
        mkAeSukuk("DEWA Sukuk 4.85% 2034 AA-", 2_500_000),
        mkAeSukuk("Emirates NBD AT1 7.85%", 2_000_000),
        mkAeReit("Emirates REIT", 900_000),
        mkAeRe("Downtown Dubai Office Floor", 18_000_000),
        mkAeRe("Palm Jumeirah Villa", 22_000_000),
      ]),
    },
    {
      id: "sample-ae-almaktoum-maryam", name: "Sheikha Maryam Al Maktoum", family: "Al Maktoum Family Office",
      data: ae("Sheikha Maryam Al Maktoum", "EID-784-1992-2345678-2", [
        mkAeEquity("Aldar Properties", 1_500_000),
        mkAeEquity("ADCB", 1_200_000),
        mkAeMfEquity("ADIB Capital Sharia Equity Fund", 1_800_000),
        mkAeMfEquity("Lunate Global Equity Fund", 1_400_000),
        mkAeMfDebt("Rasmala MENA Bond Fund", 1_200_000),
        mkAeSukuk("Mubadala 4.95% 2034 AA", 1_500_000),
        mkAeReit("ENBD REIT", 450_000),
      ]),
    },
    {
      id: "sample-ae-alnahyan-hamdan", name: "Sheikh Hamdan Al Nahyan", family: "Al Nahyan Family Office",
      data: ae("Sheikh Hamdan Al Nahyan", "EID-784-1975-3456789-3", [
        mkAeEquity("International Holding Co", 6_500_000),
        mkAeEquity("FAB", 4_200_000),
        mkAeEquity("ADNOC Gas", 3_800_000),
        mkAeEquity("ADNOC Drilling", 2_400_000),
        mkAeEquity("e& (Etisalat Group)", 1_800_000),
        mkAeEquity("TAQA", 1_500_000),
        mkAeMfEquity("Chimera UAE Equity Fund", 4_500_000),
        mkAeMfDebt("FAB Sukuk Income Fund", 3_500_000),
        mkAeSukuk("Abu Dhabi Govt Sukuk 4.65% 2034", 6_000_000),
        mkAeSukuk("ADNOC Murban 4.85% 2034 AA", 4_500_000),
        mkAeSukuk("UAE Federal Govt 4.85% 2034", 5_500_000),
        mkAeSukuk("FAB AT1 7.45% Perp BBB", 3_500_000),
        mkAeRe("Saadiyat Island Beachfront Villa", 28_000_000),
        mkAeRe("Yas Island Hospitality Asset", 15_000_000),
      ]),
    },
    {
      id: "sample-ae-alnahyan-sara", name: "Sara Al Nahyan", family: "Al Nahyan Family Office",
      data: ae("Sara Al Nahyan", "EID-784-1995-4567890-4", [
        mkAeEquity("Multiply Group", 800_000),
        mkAeEquity("Pure Health Holding", 700_000),
        mkAeMfEquity("Daman GCC Equity Fund", 1_200_000),
        mkAeMfDebt("Mashreq Money Market Fund", 900_000),
        mkAeSukuk("Sharjah Islamic Sukuk 5.15% 2031", 1_000_000),
      ]),
    },
    {
      id: "sample-ae-kapoor-vivek", name: "Vivek Kapoor — Indian Expat HNI",
      data: ae("Vivek Kapoor (UAE Resident)", "EID-784-1982-5678901-5", [
        mkAeEquity("Emaar Properties", 1_500_000),
        mkAeEquity("Air Arabia", 600_000),
        mkAeEquity("Salik Company", 800_000),
        mkAeMfEquity("Mashreq Capital Global Equity Fund", 1_800_000),
        mkAeMfDebt("Emirates NBD Sukuk Fund", 1_200_000),
        mkAeSukuk("Emaar Sukuk 5.95% 2032 BBB+", 1_500_000),
        mkAeSukuk("DEWA Sukuk 4.85% 2034 AA-", 1_000_000),
        mkAeReit("Emirates REIT", 400_000),
        mkAeRe("Business Bay Apartment", 4_500_000),
      ]),
    },
  ];
  return list.map(p => ({ ...p, savedAt: now, isSample: true }));
}

// ============================================================================
// Region-keyed registries
// ============================================================================
export const SAMPLE_PORTFOLIOS_BY_REGION: Record<Region, SavedPortfolio[]> = {
  IN: buildPortfoliosIN(),
  AE: buildPortfoliosAE(),
};

export const SAMPLE_FAMILIES_BY_REGION: Record<Region, { name: string; portfolioIds: string[] }[]> = {
  IN: [
    { name: "Sharma Family",       portfolioIds: ["sample-sharma-rajesh", "sample-sharma-priya", "sample-sharma-aarav"] },
    { name: "Patel Family",        portfolioIds: ["sample-patel-arun", "sample-patel-meera", "sample-patel-karan"] },
    { name: "Mehta Family",        portfolioIds: ["sample-mehta-vikram", "sample-mehta-anita"] },
    { name: "Singh Family Office", portfolioIds: ["sample-singh-harpreet"] },
  ],
  AE: [
    { name: "Al Maktoum Family Office", portfolioIds: ["sample-ae-almaktoum-rashid", "sample-ae-almaktoum-maryam"] },
    { name: "Al Nahyan Family Office",  portfolioIds: ["sample-ae-alnahyan-hamdan", "sample-ae-alnahyan-sara"] },
  ],
};

/** Reactive accessors that switch with the active region. */
export const SAMPLE_PORTFOLIOS: SavedPortfolio[] = new Proxy([] as SavedPortfolio[], {
  get(_t, prop) {
    const arr = SAMPLE_PORTFOLIOS_BY_REGION[getCurrentRegion()];
    const v: any = (arr as any)[prop as any];
    return typeof v === "function" ? v.bind(arr) : v;
  },
  ownKeys() { return Reflect.ownKeys(SAMPLE_PORTFOLIOS_BY_REGION[getCurrentRegion()]); },
}) as SavedPortfolio[];

export const SAMPLE_FAMILIES: { name: string; portfolioIds: string[] }[] = new Proxy([] as any[], {
  get(_t, prop) {
    const arr = SAMPLE_FAMILIES_BY_REGION[getCurrentRegion()];
    const v: any = (arr as any)[prop as any];
    return typeof v === "function" ? v.bind(arr) : v;
  },
  ownKeys() { return Reflect.ownKeys(SAMPLE_FAMILIES_BY_REGION[getCurrentRegion()]); },
}) as { name: string; portfolioIds: string[] }[];

// ============================================================================
// Seed / remove helpers — region-aware
// ============================================================================
function readSavedFor(r: Region): SavedPortfolio[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(storageKeyForRegion(r)) || "[]"); } catch { return []; }
}
function writeSavedFor(r: Region, list: SavedPortfolio[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKeyForRegion(r), JSON.stringify(list));
}

/** Merge sample portfolios for the active region into the saved list (idempotent — keyed by id). */
export function seedSamplePortfolios(): SavedPortfolio[] {
  const r = getCurrentRegion();
  const existing = readSavedFor(r);
  const haveIds = new Set(existing.map(s => s.id));
  const samples = SAMPLE_PORTFOLIOS_BY_REGION[r];
  const toAdd = samples.filter(s => !haveIds.has(s.id));
  const next = [...toAdd, ...existing];
  writeSavedFor(r, next);
  return next;
}

export function removeSamplePortfolios(): SavedPortfolio[] {
  const r = getCurrentRegion();
  const existing = readSavedFor(r);
  const sampleIds = new Set(SAMPLE_PORTFOLIOS_BY_REGION[r].map(s => s.id));
  const next = existing.filter(s => !sampleIds.has(s.id) && !s.isSample);
  writeSavedFor(r, next);
  return next;
}
