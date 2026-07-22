// Region-aware synthetic datasets powering the Analytics Studio.
// India, UAE and Philippines each ship their own RM bench, geographic split,
// product mix, MF underlyings and client portfolios so the analytics page
// reflects the active region selected in the global switcher.

import { getCurrentRegion, type Region } from "./region";

// ----------------------------------------------------------------------------
// Shared types & constants
// ----------------------------------------------------------------------------
export type BProduct = string;
export type BRegion = string;
export type BSegment = "UHNI" | "HNI" | "Affluent" | "Mass Affluent";
export type BChannel = "Direct RM" | "Digital Platform" | "IFA Partners" | "Family Office";
export type BRm = string;

export const MONTHS = ["Apr'24","May'24","Jun'24","Jul'24","Aug'24","Sep'24","Oct'24","Nov'24","Dec'24","Jan'25","Feb'25","Mar'25","Apr'25","May'25","Jun'25"];
export const SEGMENTS: BSegment[] = ["UHNI","HNI","Affluent","Mass Affluent"];
export const CHANNELS: BChannel[] = ["Direct RM","Digital Platform","IFA Partners","Family Office"];

const SEGMENT_WEIGHT: Record<BSegment, number> = { UHNI: 0.46, HNI: 0.33, Affluent: 0.16, "Mass Affluent": 0.05 };
const CHANNEL_WEIGHT: Record<BChannel, number> = { "Direct RM": 0.63, "Digital Platform": 0.16, "IFA Partners": 0.12, "Family Office": 0.09 };
const SEGMENT_CLIENTS: Record<BSegment, number> = { UHNI: 84, HNI: 312, Affluent: 1240, "Mass Affluent": 3860 };

export type Holding = {
  security: string;
  issuer: string;
  amc?: string;
  product: "MF" | "PMS" | "AIF" | "Equity" | "Bond" | "Cash";
  assetClass: "Equity" | "Fixed Income" | "Alternates" | "Cash";
  sector: string;
  liquidity: "T+1" | "T+3" | "T+30" | "Locked";
  value: number;
  fee: number;
  underlyings?: { issuer: string; sector: string; weight: number }[];
};

export type ClientPortfolio = {
  id: string;
  client: string;
  segment: BSegment;
  rm: BRm;
  benchmark: string;
  ytdReturn: number;
  benchmarkReturn: number;
  aum: number;
  ipsEquity: number;
  ipsFI: number;
  ipsAlt: number;
  ipsCash: number;
  holdings: Holding[];
};

export type BFact = {
  month: string; mIdx: number;
  product: BProduct; region: BRegion; segment: BSegment; channel: BChannel; rm: BRm;
  aum: number; netFlows: number; revenue: number; clients: number;
};

export type FlatHolding = {
  clientId: string; client: string; segment: BSegment; rm: BRm;
  product: Holding["product"]; assetClass: Holding["assetClass"];
  issuer: string; amc: string; sector: string; liquidity: Holding["liquidity"];
  value: number; fee: number; isUnderlying: boolean; parentSecurity?: string;
};

// ----------------------------------------------------------------------------
// Region configuration
// ----------------------------------------------------------------------------
type RegionConfig = {
  rmInfo: { rm: string; region: string }[];
  geoRegions: string[];
  regionWeight: Record<string, number>;
  products: string[];
  productWeight: Record<string, number>;
  productMargin: Record<string, number>;
  totalAumBase: number;
  mfUnderlyings: Record<string, { issuer: string; sector: string; weight: number }[]>;
  buildClientPortfolios: () => ClientPortfolio[];
  quickFilters: string[];
};

function mkMfH(name: string, amc: string, value: number, mfUnderlyings: RegionConfig["mfUnderlyings"], fee = 1.4): Holding {
  return { security: name, issuer: name, amc, product: "MF", assetClass: "Equity", sector: "Diversified", liquidity: "T+3", value, fee, underlyings: mfUnderlyings[name] ?? [] };
}
function mkBondMfH(name: string, amc: string, value: number, mfUnderlyings: RegionConfig["mfUnderlyings"], fee = 0.6): Holding {
  return { security: name, issuer: name, amc, product: "MF", assetClass: "Fixed Income", sector: "Credit", liquidity: "T+1", value, fee, underlyings: mfUnderlyings[name] ?? [] };
}

// ===== INDIA =====
const IN_MF: RegionConfig["mfUnderlyings"] = {
  "HDFC Flexi Cap Fund": [
    { issuer: "HDFC Bank", sector: "Financials", weight: 9.2 },
    { issuer: "ICICI Bank", sector: "Financials", weight: 7.8 },
    { issuer: "Reliance Inds.", sector: "Energy", weight: 6.4 },
    { issuer: "Infosys", sector: "IT", weight: 5.1 },
    { issuer: "L&T", sector: "Industrials", weight: 4.2 },
    { issuer: "Others", sector: "Mixed", weight: 67.3 },
  ],
  "Mirae Asset Large Cap": [
    { issuer: "HDFC Bank", sector: "Financials", weight: 8.9 },
    { issuer: "Reliance Inds.", sector: "Energy", weight: 8.1 },
    { issuer: "ICICI Bank", sector: "Financials", weight: 7.2 },
    { issuer: "TCS", sector: "IT", weight: 5.8 },
    { issuer: "Bharti Airtel", sector: "Telecom", weight: 3.6 },
    { issuer: "Others", sector: "Mixed", weight: 66.4 },
  ],
  "Axis Bluechip Fund": [
    { issuer: "ICICI Bank", sector: "Financials", weight: 9.0 },
    { issuer: "HDFC Bank", sector: "Financials", weight: 8.4 },
    { issuer: "Infosys", sector: "IT", weight: 6.7 },
    { issuer: "Bajaj Finance", sector: "Financials", weight: 4.8 },
    { issuer: "Others", sector: "Mixed", weight: 71.1 },
  ],
  "SBI Small Cap Fund": [
    { issuer: "Blue Star", sector: "Consumer", weight: 3.4 },
    { issuer: "CDSL", sector: "Financials", weight: 3.1 },
    { issuer: "Carborundum", sector: "Industrials", weight: 2.8 },
    { issuer: "Others", sector: "Mixed", weight: 90.7 },
  ],
  "ICICI Pru Corporate Bond": [
    { issuer: "REC Ltd", sector: "Financials", weight: 9.2 },
    { issuer: "PFC Ltd", sector: "Financials", weight: 8.1 },
    { issuer: "HDFC Bank", sector: "Financials", weight: 6.4 },
    { issuer: "GoI Bonds", sector: "Sovereign", weight: 18.6 },
    { issuer: "Others", sector: "Mixed", weight: 57.7 },
  ],
};

const IN_CONFIG: RegionConfig = {
  rmInfo: [
    { rm: "Anika Mehra", region: "West" },
    { rm: "Karthik Iyer", region: "South" },
    { rm: "Rohan Bhattacharya", region: "East" },
    { rm: "Priya Nair", region: "South" },
    { rm: "Vikram Sethi", region: "North" },
    { rm: "Sneha Kapoor", region: "North" },
    { rm: "Aditya Rao", region: "West" },
    { rm: "Meera Joshi", region: "Central" },
  ],
  geoRegions: ["West","South","North","East","Central"],
  regionWeight: { West: 0.33, South: 0.28, North: 0.21, East: 0.11, Central: 0.07 },
  products: ["Mutual Funds","PMS","AIF Cat-II","AIF Cat-III","Direct Equity","Bonds / FD","Insurance","Unlisted / PE"],
  productWeight: {
    "Mutual Funds": 0.40, "PMS": 0.22, "AIF Cat-II": 0.15, "AIF Cat-III": 0.06,
    "Direct Equity": 0.05, "Bonds / FD": 0.08, "Insurance": 0.02, "Unlisted / PE": 0.02,
  },
  productMargin: {
    "Mutual Funds": 0.80, "PMS": 2.00, "AIF Cat-II": 2.00, "AIF Cat-III": 2.50,
    "Direct Equity": 0.90, "Bonds / FD": 0.70, "Insurance": 2.00, "Unlisted / PE": 2.50,
  },
  totalAumBase: 12_280,
  mfUnderlyings: IN_MF,
  quickFilters: ["HDFC Bank","Reliance Inds.","ICICI Bank","Infosys","Axis AMC","Financials"],
  buildClientPortfolios: () => [
    {
      id: "C001", client: "Rajiv Malhotra", segment: "UHNI", rm: "Anika Mehra",
      benchmark: "Nifty 50 TRI", ytdReturn: 9.4, benchmarkReturn: 12.6, aum: 42.6,
      ipsEquity: 55, ipsFI: 25, ipsAlt: 15, ipsCash: 5,
      holdings: [
        mkMfH("HDFC Flexi Cap Fund", "HDFC AMC", 6.8, IN_MF),
        mkMfH("Mirae Asset Large Cap", "Mirae AMC", 4.2, IN_MF),
        mkBondMfH("ICICI Pru Corporate Bond", "ICICI Pru AMC", 5.1, IN_MF),
        { security: "HDFC Bank", issuer: "HDFC Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 8.4, fee: 0 },
        { security: "Reliance Inds.", issuer: "Reliance Inds.", product: "Equity", assetClass: "Equity", sector: "Energy", liquidity: "T+1", value: 6.2, fee: 0 },
        { security: "Kotak PMS - India Focus", issuer: "Kotak AMC", amc: "Kotak AMC", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 7.4, fee: 2.0 },
        { security: "Edelweiss AIF Cat-II", issuer: "Edelweiss", amc: "Edelweiss", product: "AIF", assetClass: "Alternates", sector: "Credit", liquidity: "Locked", value: 4.5, fee: 2.0 },
      ],
    },
    {
      id: "C002", client: "Suman Iyer Family Trust", segment: "UHNI", rm: "Karthik Iyer",
      benchmark: "Crisil Hybrid 65+35", ytdReturn: 11.2, benchmarkReturn: 10.4, aum: 38.2,
      ipsEquity: 45, ipsFI: 30, ipsAlt: 20, ipsCash: 5,
      holdings: [
        mkMfH("Axis Bluechip Fund", "Axis AMC", 7.8, IN_MF),
        mkMfH("SBI Small Cap Fund", "SBI AMC", 3.4, IN_MF, 1.9),
        { security: "ICICI Bank", issuer: "ICICI Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 6.2, fee: 0 },
        { security: "Infosys", issuer: "Infosys", product: "Equity", assetClass: "Equity", sector: "IT", liquidity: "T+1", value: 5.4, fee: 0 },
        { security: "Motilal PMS - Value Strategy", issuer: "Motilal Oswal AMC", amc: "Motilal Oswal AMC", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 9.8, fee: 2.0 },
        { security: "GoI 7.18% 2033", issuer: "GoI Bonds", product: "Bond", assetClass: "Fixed Income", sector: "Sovereign", liquidity: "T+3", value: 5.6, fee: 0 },
      ],
    },
    {
      id: "C003", client: "Priya Kapoor", segment: "HNI", rm: "Priya Nair",
      benchmark: "Nifty 50 TRI", ytdReturn: 6.8, benchmarkReturn: 12.6, aum: 14.8,
      ipsEquity: 60, ipsFI: 30, ipsAlt: 5, ipsCash: 5,
      holdings: [
        mkMfH("HDFC Flexi Cap Fund", "HDFC AMC", 4.6, IN_MF),
        mkMfH("Axis Bluechip Fund", "Axis AMC", 3.2, IN_MF),
        { security: "HDFC Bank", issuer: "HDFC Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 3.4, fee: 0 },
        { security: "TCS", issuer: "TCS", product: "Equity", assetClass: "Equity", sector: "IT", liquidity: "T+1", value: 2.1, fee: 0 },
        { security: "Bajaj Finance", issuer: "Bajaj Finance", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 1.5, fee: 0 },
      ],
    },
    {
      id: "C004", client: "Arun Khanna HUF", segment: "HNI", rm: "Vikram Sethi",
      benchmark: "Nifty 500 TRI", ytdReturn: 14.6, benchmarkReturn: 13.1, aum: 22.4,
      ipsEquity: 50, ipsFI: 20, ipsAlt: 25, ipsCash: 5,
      holdings: [
        mkMfH("Mirae Asset Large Cap", "Mirae AMC", 5.2, IN_MF),
        mkMfH("SBI Small Cap Fund", "SBI AMC", 4.4, IN_MF, 1.9),
        { security: "Reliance Inds.", issuer: "Reliance Inds.", product: "Equity", assetClass: "Equity", sector: "Energy", liquidity: "T+1", value: 4.2, fee: 0 },
        { security: "Edelweiss AIF Cat-III", issuer: "Edelweiss", amc: "Edelweiss", product: "AIF", assetClass: "Alternates", sector: "Long-Short", liquidity: "Locked", value: 8.6, fee: 2.5 },
      ],
    },
    {
      id: "C005", client: "Sunita Reddy", segment: "Affluent", rm: "Sneha Kapoor",
      benchmark: "Crisil Hybrid 65+35", ytdReturn: 4.2, benchmarkReturn: 10.4, aum: 4.8,
      ipsEquity: 50, ipsFI: 40, ipsAlt: 0, ipsCash: 10,
      holdings: [
        mkMfH("HDFC Flexi Cap Fund", "HDFC AMC", 2.2, IN_MF),
        mkBondMfH("ICICI Pru Corporate Bond", "ICICI Pru AMC", 1.6, IN_MF),
        { security: "HDFC Bank", issuer: "HDFC Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 1.0, fee: 0 },
      ],
    },
    {
      id: "C006", client: "Vivek Shah Family Office", segment: "UHNI", rm: "Anika Mehra",
      benchmark: "Nifty 50 TRI", ytdReturn: 8.1, benchmarkReturn: 12.6, aum: 56.2,
      ipsEquity: 50, ipsFI: 25, ipsAlt: 20, ipsCash: 5,
      holdings: [
        mkMfH("HDFC Flexi Cap Fund", "HDFC AMC", 9.8, IN_MF),
        mkMfH("Axis Bluechip Fund", "Axis AMC", 8.4, IN_MF),
        mkBondMfH("ICICI Pru Corporate Bond", "ICICI Pru AMC", 7.2, IN_MF),
        { security: "HDFC Bank", issuer: "HDFC Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 10.4, fee: 0 },
        { security: "ICICI Bank", issuer: "ICICI Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 6.2, fee: 0 },
        { security: "Kotak PMS - India Focus", issuer: "Kotak AMC", amc: "Kotak AMC", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 14.2, fee: 2.0 },
      ],
    },
  ],
};

// ===== UAE =====
const AE_MF: RegionConfig["mfUnderlyings"] = {
  "Emirates NBD Global Equity Fund": [
    { issuer: "Emirates NBD", sector: "Financials", weight: 9.1 },
    { issuer: "FAB", sector: "Financials", weight: 8.3 },
    { issuer: "DEWA", sector: "Utilities", weight: 5.4 },
    { issuer: "Etisalat", sector: "Telecom", weight: 4.8 },
    { issuer: "ADNOC Drilling", sector: "Energy", weight: 4.1 },
    { issuer: "Others", sector: "Mixed", weight: 68.3 },
  ],
  "ADIB Pulse Equity Fund": [
    { issuer: "FAB", sector: "Financials", weight: 9.6 },
    { issuer: "Emirates NBD", sector: "Financials", weight: 7.4 },
    { issuer: "ADIB", sector: "Financials", weight: 6.1 },
    { issuer: "Alpha Dhabi", sector: "Industrials", weight: 4.7 },
    { issuer: "Others", sector: "Mixed", weight: 72.2 },
  ],
  "Mashreq Al-Islami Sukuk Fund": [
    { issuer: "DP World Sukuk", sector: "Credit", weight: 12.3 },
    { issuer: "Emirates Islamic", sector: "Credit", weight: 9.8 },
    { issuer: "Sharjah Govt Sukuk", sector: "Sovereign", weight: 14.5 },
    { issuer: "Tabreed Sukuk", sector: "Credit", weight: 6.2 },
    { issuer: "Others", sector: "Mixed", weight: 57.2 },
  ],
  "FAB MENA Bond Fund": [
    { issuer: "FAB", sector: "Credit", weight: 11.2 },
    { issuer: "ADCB", sector: "Credit", weight: 8.6 },
    { issuer: "Mubadala 2030", sector: "Sovereign", weight: 15.1 },
    { issuer: "UAE Federal Bond", sector: "Sovereign", weight: 12.4 },
    { issuer: "Others", sector: "Mixed", weight: 52.7 },
  ],
};

const AE_CONFIG: RegionConfig = {
  rmInfo: [
    { rm: "Khalid Al Shamsi", region: "Dubai" },
    { rm: "Mariam Al Hosani", region: "Abu Dhabi" },
    { rm: "Ahmed Al Maktoum", region: "Dubai" },
    { rm: "Fatima Al Zaabi", region: "Sharjah" },
    { rm: "Omar Al Suwaidi", region: "Abu Dhabi" },
    { rm: "Layla Al Mansoori", region: "Dubai" },
    { rm: "Saeed Al Nuaimi", region: "Northern Emirates" },
    { rm: "Noura Al Falasi", region: "Abu Dhabi" },
  ],
  geoRegions: ["Dubai","Abu Dhabi","Sharjah","Northern Emirates"],
  regionWeight: { Dubai: 0.46, "Abu Dhabi": 0.36, Sharjah: 0.12, "Northern Emirates": 0.06 },
  products: ["Mutual Funds","Sukuk","DIFC Feeder Funds","Hedge Funds","Equities (DFM/ADX)","Term Deposits","Takaful","Private Equity"],
  productWeight: {
    "Mutual Funds": 0.28, "Sukuk": 0.20, "DIFC Feeder Funds": 0.12, "Hedge Funds": 0.07,
    "Equities (DFM/ADX)": 0.14, "Term Deposits": 0.10, "Takaful": 0.04, "Private Equity": 0.05,
  },
  productMargin: {
    "Mutual Funds": 0.90, "Sukuk": 0.70, "DIFC Feeder Funds": 1.80, "Hedge Funds": 2.20,
    "Equities (DFM/ADX)": 0.85, "Term Deposits": 0.40, "Takaful": 1.80, "Private Equity": 2.40,
  },
  totalAumBase: 9_640, // AED M
  mfUnderlyings: AE_MF,
  quickFilters: ["FAB","Emirates NBD","ADNOC","DP World","Sukuk","Financials"],
  buildClientPortfolios: () => [
    {
      id: "AE001", client: "Rashid Al Maktoum Family Office", segment: "UHNI", rm: "Khalid Al Shamsi",
      benchmark: "DFM General Index", ytdReturn: 8.6, benchmarkReturn: 11.2, aum: 92.4,
      ipsEquity: 50, ipsFI: 25, ipsAlt: 20, ipsCash: 5,
      holdings: [
        mkMfH("Emirates NBD Global Equity Fund", "Emirates NBD AM", 14.6, AE_MF),
        mkBondMfH("Mashreq Al-Islami Sukuk Fund", "Mashreq Capital", 12.2, AE_MF),
        { security: "FAB", issuer: "FAB", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 18.4, fee: 0 },
        { security: "Emaar Properties", issuer: "Emaar", product: "Equity", assetClass: "Equity", sector: "Real Estate", liquidity: "T+1", value: 10.2, fee: 0 },
        { security: "ADQ DIFC Feeder Fund", issuer: "ADQ Capital", amc: "ADQ Capital", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 16.4, fee: 1.8 },
        { security: "Mubadala Private Equity Sleeve", issuer: "Mubadala", amc: "Mubadala", product: "AIF", assetClass: "Alternates", sector: "Private Equity", liquidity: "Locked", value: 12.6, fee: 2.0 },
        { security: "AED Cash Sweep", issuer: "Mashreq", product: "Cash", assetClass: "Cash", sector: "Cash", liquidity: "T+1", value: 8.0, fee: 0 },
      ],
    },
    {
      id: "AE002", client: "Maryam Al Nahyan", segment: "UHNI", rm: "Mariam Al Hosani",
      benchmark: "ADX General Index", ytdReturn: 12.4, benchmarkReturn: 9.8, aum: 68.6,
      ipsEquity: 45, ipsFI: 30, ipsAlt: 20, ipsCash: 5,
      holdings: [
        mkMfH("ADIB Pulse Equity Fund", "ADIB AM", 11.8, AE_MF),
        mkBondMfH("FAB MENA Bond Fund", "FAB AM", 14.2, AE_MF),
        { security: "ADNOC Drilling", issuer: "ADNOC Drilling", product: "Equity", assetClass: "Equity", sector: "Energy", liquidity: "T+1", value: 12.4, fee: 0 },
        { security: "IHC", issuer: "IHC", product: "Equity", assetClass: "Equity", sector: "Conglomerate", liquidity: "T+1", value: 8.8, fee: 0 },
        { security: "UAE Federal Sukuk 2030", issuer: "UAE Federal", product: "Bond", assetClass: "Fixed Income", sector: "Sovereign", liquidity: "T+3", value: 9.4, fee: 0 },
        { security: "Brevan Howard ADGM Feeder", issuer: "Brevan Howard", amc: "Brevan Howard", product: "AIF", assetClass: "Alternates", sector: "Hedge Fund", liquidity: "T+30", value: 12.0, fee: 2.0 },
      ],
    },
    {
      id: "AE003", client: "Hamdan Trading LLC Treasury", segment: "HNI", rm: "Ahmed Al Maktoum",
      benchmark: "MSCI GCC", ytdReturn: 6.2, benchmarkReturn: 10.4, aum: 24.8,
      ipsEquity: 35, ipsFI: 50, ipsAlt: 5, ipsCash: 10,
      holdings: [
        mkBondMfH("FAB MENA Bond Fund", "FAB AM", 7.2, AE_MF),
        mkBondMfH("Mashreq Al-Islami Sukuk Fund", "Mashreq Capital", 5.4, AE_MF),
        { security: "Emirates NBD", issuer: "Emirates NBD", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 4.6, fee: 0 },
        { security: "DEWA", issuer: "DEWA", product: "Equity", assetClass: "Equity", sector: "Utilities", liquidity: "T+1", value: 3.4, fee: 0 },
        { security: "AED 12M Term Deposit", issuer: "ADCB", product: "Bond", assetClass: "Fixed Income", sector: "Term Deposit", liquidity: "T+30", value: 4.2, fee: 0 },
      ],
    },
    {
      id: "AE004", client: "Sara Al Suwaidi", segment: "HNI", rm: "Fatima Al Zaabi",
      benchmark: "DFM General Index", ytdReturn: 14.2, benchmarkReturn: 11.2, aum: 18.4,
      ipsEquity: 60, ipsFI: 20, ipsAlt: 15, ipsCash: 5,
      holdings: [
        mkMfH("Emirates NBD Global Equity Fund", "Emirates NBD AM", 5.6, AE_MF),
        { security: "FAB", issuer: "FAB", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 3.8, fee: 0 },
        { security: "Alpha Dhabi", issuer: "Alpha Dhabi", product: "Equity", assetClass: "Equity", sector: "Industrials", liquidity: "T+1", value: 2.6, fee: 0 },
        { security: "Pure Health", issuer: "Pure Health", product: "Equity", assetClass: "Equity", sector: "Healthcare", liquidity: "T+1", value: 2.2, fee: 0 },
        { security: "DIFC Growth Feeder III", issuer: "DIFC Capital", amc: "DIFC Capital", product: "AIF", assetClass: "Alternates", sector: "Growth Equity", liquidity: "Locked", value: 4.2, fee: 2.2 },
      ],
    },
    {
      id: "AE005", client: "Noura Al Falasi Trust", segment: "Affluent", rm: "Layla Al Mansoori",
      benchmark: "MSCI GCC", ytdReturn: 4.8, benchmarkReturn: 10.4, aum: 6.2,
      ipsEquity: 50, ipsFI: 40, ipsAlt: 0, ipsCash: 10,
      holdings: [
        mkMfH("ADIB Pulse Equity Fund", "ADIB AM", 2.8, AE_MF),
        mkBondMfH("Mashreq Al-Islami Sukuk Fund", "Mashreq Capital", 2.0, AE_MF),
        { security: "Emirates NBD", issuer: "Emirates NBD", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 1.4, fee: 0 },
      ],
    },
    {
      id: "AE006", client: "Almazrouei Family Office", segment: "UHNI", rm: "Omar Al Suwaidi",
      benchmark: "ADX General Index", ytdReturn: 10.4, benchmarkReturn: 9.8, aum: 124.6,
      ipsEquity: 45, ipsFI: 25, ipsAlt: 25, ipsCash: 5,
      holdings: [
        mkMfH("Emirates NBD Global Equity Fund", "Emirates NBD AM", 18.4, AE_MF),
        mkMfH("ADIB Pulse Equity Fund", "ADIB AM", 14.8, AE_MF),
        mkBondMfH("FAB MENA Bond Fund", "FAB AM", 16.2, AE_MF),
        { security: "FAB", issuer: "FAB", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 22.6, fee: 0 },
        { security: "Emaar Properties", issuer: "Emaar", product: "Equity", assetClass: "Equity", sector: "Real Estate", liquidity: "T+1", value: 12.4, fee: 0 },
        { security: "ADQ DIFC Feeder Fund", issuer: "ADQ Capital", amc: "ADQ Capital", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 28.4, fee: 1.8 },
      ],
    },
  ],
};

// ===== PHILIPPINES =====
const PH_MF: RegionConfig["mfUnderlyings"] = {
  "BPI Equity Value Fund": [
    { issuer: "SM Investments", sector: "Conglomerate", weight: 10.2 },
    { issuer: "Ayala Corp", sector: "Conglomerate", weight: 8.4 },
    { issuer: "BDO Unibank", sector: "Financials", weight: 7.6 },
    { issuer: "BPI", sector: "Financials", weight: 6.4 },
    { issuer: "Jollibee Foods", sector: "Consumer", weight: 4.8 },
    { issuer: "Others", sector: "Mixed", weight: 62.6 },
  ],
  "BDO Equity Fund": [
    { issuer: "SM Investments", sector: "Conglomerate", weight: 9.6 },
    { issuer: "Ayala Land", sector: "Real Estate", weight: 7.2 },
    { issuer: "BDO Unibank", sector: "Financials", weight: 8.1 },
    { issuer: "Aboitiz Power", sector: "Utilities", weight: 5.4 },
    { issuer: "Others", sector: "Mixed", weight: 69.7 },
  ],
  "Sun Life PH Equity Fund": [
    { issuer: "SM Prime", sector: "Real Estate", weight: 9.8 },
    { issuer: "Ayala Corp", sector: "Conglomerate", weight: 8.2 },
    { issuer: "Globe Telecom", sector: "Telecom", weight: 6.4 },
    { issuer: "JG Summit", sector: "Conglomerate", weight: 5.6 },
    { issuer: "Others", sector: "Mixed", weight: 70.0 },
  ],
  "ATRAM Phil Bond Fund": [
    { issuer: "BTr 5Y", sector: "Sovereign", weight: 22.4 },
    { issuer: "RTB-29", sector: "Sovereign", weight: 18.6 },
    { issuer: "BSP Bills", sector: "Sovereign", weight: 12.4 },
    { issuer: "Ayala Land Corp Bond", sector: "Credit", weight: 6.4 },
    { issuer: "Others", sector: "Mixed", weight: 40.2 },
  ],
};

const PH_CONFIG: RegionConfig = {
  rmInfo: [
    { rm: "Miguel Santos", region: "Metro Manila" },
    { rm: "Isabella Reyes", region: "Metro Manila" },
    { rm: "Antonio Cruz", region: "Luzon" },
    { rm: "Sofia Lim", region: "Visayas" },
    { rm: "Rafael Garcia", region: "Mindanao" },
    { rm: "Carmela Aquino", region: "Metro Manila" },
    { rm: "Diego Tan", region: "Luzon" },
    { rm: "Patricia Ong", region: "Visayas" },
  ],
  geoRegions: ["Metro Manila","Luzon","Visayas","Mindanao"],
  regionWeight: { "Metro Manila": 0.58, Luzon: 0.22, Visayas: 0.12, Mindanao: 0.08 },
  products: ["Mutual Funds","UITF","Equities (PSE)","RTB / FXTN","Time Deposits","VUL Insurance","Private Equity","REITs"],
  productWeight: {
    "Mutual Funds": 0.26, "UITF": 0.22, "Equities (PSE)": 0.14, "RTB / FXTN": 0.18,
    "Time Deposits": 0.08, "VUL Insurance": 0.05, "Private Equity": 0.04, "REITs": 0.03,
  },
  productMargin: {
    "Mutual Funds": 1.10, "UITF": 1.20, "Equities (PSE)": 0.95, "RTB / FXTN": 0.55,
    "Time Deposits": 0.35, "VUL Insurance": 2.20, "Private Equity": 2.50, "REITs": 0.80,
  },
  totalAumBase: 7_420, // PHP M
  mfUnderlyings: PH_MF,
  quickFilters: ["BDO Unibank","SM Investments","Ayala Corp","Jollibee","BPI","Financials"],
  buildClientPortfolios: () => [
    {
      id: "PH001", client: "Santos Family Office", segment: "UHNI", rm: "Miguel Santos",
      benchmark: "PSEi TRI", ytdReturn: 7.4, benchmarkReturn: 9.6, aum: 64.8,
      ipsEquity: 50, ipsFI: 30, ipsAlt: 15, ipsCash: 5,
      holdings: [
        mkMfH("BPI Equity Value Fund", "BPI AM", 9.6, PH_MF),
        mkBondMfH("ATRAM Phil Bond Fund", "ATRAM Trust", 8.2, PH_MF),
        { security: "SM Investments", issuer: "SM Investments", product: "Equity", assetClass: "Equity", sector: "Conglomerate", liquidity: "T+1", value: 11.4, fee: 0 },
        { security: "Ayala Corp", issuer: "Ayala Corp", product: "Equity", assetClass: "Equity", sector: "Conglomerate", liquidity: "T+1", value: 8.6, fee: 0 },
        { security: "BDO Capital PMS - PH Growth", issuer: "BDO Capital", amc: "BDO Capital", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 12.4, fee: 1.9 },
        { security: "Navegar PE Fund II", issuer: "Navegar", amc: "Navegar", product: "AIF", assetClass: "Alternates", sector: "Private Equity", liquidity: "Locked", value: 8.6, fee: 2.4 },
        { security: "PHP Cash Sweep", issuer: "BPI", product: "Cash", assetClass: "Cash", sector: "Cash", liquidity: "T+1", value: 6.0, fee: 0 },
      ],
    },
    {
      id: "PH002", client: "Reyes Family Trust", segment: "UHNI", rm: "Isabella Reyes",
      benchmark: "PSEi TRI", ytdReturn: 10.2, benchmarkReturn: 9.6, aum: 48.4,
      ipsEquity: 45, ipsFI: 35, ipsAlt: 15, ipsCash: 5,
      holdings: [
        mkMfH("BDO Equity Fund", "BDO Trust", 8.4, PH_MF),
        mkBondMfH("ATRAM Phil Bond Fund", "ATRAM Trust", 10.6, PH_MF),
        { security: "BDO Unibank", issuer: "BDO Unibank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 6.8, fee: 0 },
        { security: "Ayala Land", issuer: "Ayala Land", product: "Equity", assetClass: "Equity", sector: "Real Estate", liquidity: "T+1", value: 5.2, fee: 0 },
        { security: "RTB-29 (2029)", issuer: "BTr", product: "Bond", assetClass: "Fixed Income", sector: "Sovereign", liquidity: "T+3", value: 7.8, fee: 0 },
        { security: "AREIT", issuer: "Ayala Land", product: "Equity", assetClass: "Equity", sector: "REIT", liquidity: "T+1", value: 4.2, fee: 0 },
        { security: "ATR KE Hedge Sleeve", issuer: "ATR Asset Mgmt", amc: "ATR Asset Mgmt", product: "AIF", assetClass: "Alternates", sector: "Hedge Fund", liquidity: "T+30", value: 5.4, fee: 2.1 },
      ],
    },
    {
      id: "PH003", client: "Cruz Holdings Treasury", segment: "HNI", rm: "Antonio Cruz",
      benchmark: "PSEi", ytdReturn: 5.8, benchmarkReturn: 9.6, aum: 22.6,
      ipsEquity: 40, ipsFI: 45, ipsAlt: 5, ipsCash: 10,
      holdings: [
        mkBondMfH("ATRAM Phil Bond Fund", "ATRAM Trust", 6.4, PH_MF),
        mkMfH("Sun Life PH Equity Fund", "Sun Life AM", 4.2, PH_MF),
        { security: "BPI", issuer: "BPI", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 3.6, fee: 0 },
        { security: "Jollibee Foods", issuer: "Jollibee Foods", product: "Equity", assetClass: "Equity", sector: "Consumer", liquidity: "T+1", value: 2.4, fee: 0 },
        { security: "PHP 12M Time Deposit", issuer: "BDO Unibank", product: "Bond", assetClass: "Fixed Income", sector: "Time Deposit", liquidity: "T+30", value: 4.0, fee: 0 },
      ],
    },
    {
      id: "PH004", client: "Lim Maritime Inc", segment: "HNI", rm: "Sofia Lim",
      benchmark: "PSEi TRI", ytdReturn: 13.4, benchmarkReturn: 9.6, aum: 17.8,
      ipsEquity: 55, ipsFI: 25, ipsAlt: 15, ipsCash: 5,
      holdings: [
        mkMfH("BPI Equity Value Fund", "BPI AM", 4.8, PH_MF),
        { security: "SM Investments", issuer: "SM Investments", product: "Equity", assetClass: "Equity", sector: "Conglomerate", liquidity: "T+1", value: 3.4, fee: 0 },
        { security: "Globe Telecom", issuer: "Globe Telecom", product: "Equity", assetClass: "Equity", sector: "Telecom", liquidity: "T+1", value: 2.2, fee: 0 },
        { security: "Aboitiz Power", issuer: "Aboitiz Power", product: "Equity", assetClass: "Equity", sector: "Utilities", liquidity: "T+1", value: 1.8, fee: 0 },
        { security: "Kickstart Ventures PH II", issuer: "Globe Capital", amc: "Globe Capital", product: "AIF", assetClass: "Alternates", sector: "Venture", liquidity: "Locked", value: 3.6, fee: 2.5 },
      ],
    },
    {
      id: "PH005", client: "Garcia Estate", segment: "Affluent", rm: "Rafael Garcia",
      benchmark: "PSEi", ytdReturn: 3.6, benchmarkReturn: 9.6, aum: 5.4,
      ipsEquity: 50, ipsFI: 40, ipsAlt: 0, ipsCash: 10,
      holdings: [
        mkMfH("Sun Life PH Equity Fund", "Sun Life AM", 2.4, PH_MF),
        mkBondMfH("ATRAM Phil Bond Fund", "ATRAM Trust", 1.8, PH_MF),
        { security: "BDO Unibank", issuer: "BDO Unibank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 1.2, fee: 0 },
      ],
    },
    {
      id: "PH006", client: "Aquino Family Office", segment: "UHNI", rm: "Carmela Aquino",
      benchmark: "PSEi TRI", ytdReturn: 8.8, benchmarkReturn: 9.6, aum: 86.2,
      ipsEquity: 50, ipsFI: 25, ipsAlt: 20, ipsCash: 5,
      holdings: [
        mkMfH("BPI Equity Value Fund", "BPI AM", 13.2, PH_MF),
        mkMfH("BDO Equity Fund", "BDO Trust", 11.4, PH_MF),
        mkBondMfH("ATRAM Phil Bond Fund", "ATRAM Trust", 10.8, PH_MF),
        { security: "SM Investments", issuer: "SM Investments", product: "Equity", assetClass: "Equity", sector: "Conglomerate", liquidity: "T+1", value: 14.2, fee: 0 },
        { security: "Ayala Corp", issuer: "Ayala Corp", product: "Equity", assetClass: "Equity", sector: "Conglomerate", liquidity: "T+1", value: 9.6, fee: 0 },
        { security: "BDO Capital PMS - PH Growth", issuer: "BDO Capital", amc: "BDO Capital", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 18.4, fee: 1.9 },
      ],
    },
  ],
};


// ===== SINGAPORE =====
const SG_MF: RegionConfig["mfUnderlyings"] = {
  "LionGlobal Infinity Global Stock Index": [
    { issuer: "Apple", sector: "Technology", weight: 8.2 },
    { issuer: "Microsoft", sector: "Technology", weight: 7.5 },
    { issuer: "NVIDIA", sector: "Technology", weight: 4.2 },
    { issuer: "DBS Group", sector: "Financials", weight: 3.1 },
    { issuer: "Alphabet", sector: "Communication", weight: 2.8 },
    { issuer: "Others", sector: "Mixed", weight: 74.2 },
  ],
  "Nikko AM Singapore STI ETF": [
    { issuer: "DBS Group", sector: "Financials", weight: 20.5 },
    { issuer: "OCBC Bank", sector: "Financials", weight: 16.4 },
    { issuer: "UOB", sector: "Financials", weight: 14.2 },
    { issuer: "Singtel", sector: "Telecom", weight: 5.6 },
    { issuer: "CapitaLand Integrated Commercial Trust", sector: "Real Estate", weight: 4.8 },
    { issuer: "Others", sector: "Mixed", weight: 38.5 },
  ],
  "ABF Singapore Bond Index Fund": [
    { issuer: "Singapore Government", sector: "Sovereign", weight: 42.5 },
    { issuer: "HDB", sector: "Statutory Board", weight: 18.2 },
    { issuer: "JTC Corporation", sector: "Statutory Board", weight: 12.4 },
    { issuer: "DBS Group", sector: "Financials", weight: 7.1 },
    { issuer: "OCBC Bank", sector: "Financials", weight: 6.3 },
    { issuer: "Others", sector: "Mixed", weight: 13.5 },
  ],
  "Fullerton SGD Cash Fund": [
    { issuer: "DBS Bank", sector: "Banking", weight: 28.4 },
    { issuer: "OCBC Bank", sector: "Banking", weight: 24.6 },
    { issuer: "UOB", sector: "Banking", weight: 22.8 },
    { issuer: "Others", sector: "Mixed", weight: 24.2 },
  ],
};

const SG_CONFIG: RegionConfig = {
  rmInfo: [
    { rm: "Wei Ling Lee", region: "Orchard / Central" },
    { rm: "Marcus Tan", region: "Marina Bay / Raffles" },
    { rm: "Sarah Lee", region: "Sentosa / Harbourfront" },
    { rm: "Alex Ong", region: "East / Tampines" },
    { rm: "Chloe Tan", region: "Jurong / West" },
    { rm: "Daniel Goh", region: "Orchard / Central" },
    { rm: "Emily Yeo", region: "Marina Bay / Raffles" },
    { rm: "Felix Chua", region: "East / Tampines" },
  ],
  geoRegions: ["Orchard / Central", "Marina Bay / Raffles", "Sentosa / Harbourfront", "East / Tampines", "Jurong / West"],
  regionWeight: { "Orchard / Central": 0.36, "Marina Bay / Raffles": 0.28, "Sentosa / Harbourfront": 0.14, "East / Tampines": 0.12, "Jurong / West": 0.10 },
  products: ["Mutual Funds / ETFs", "PMS / IAM", "AIF / VCC", "Direct Equities (SGX)", "SGS Bonds / T-bills", "Cash / Fixed Deposits", "REITs", "Insurance (ILP / VUL)"],
  productWeight: {
    "Mutual Funds / ETFs": 0.30, "PMS / IAM": 0.18, "AIF / VCC": 0.12, "Direct Equities (SGX)": 0.16,
    "SGS Bonds / T-bills": 0.12, "Cash / Fixed Deposits": 0.06, "REITs": 0.04, "Insurance (ILP / VUL)": 0.02,
  },
  productMargin: {
    "Mutual Funds / ETFs": 0.90, "PMS / IAM": 1.80, "AIF / VCC": 2.20, "Direct Equities (SGX)": 0.85,
    "SGS Bonds / T-bills": 0.45, "Cash / Fixed Deposits": 0.35, "REITs": 0.75, "Insurance (ILP / VUL)": 2.00,
  },
  totalAumBase: 9_600, // SGD M
  mfUnderlyings: SG_MF,
  quickFilters: ["DBS Group", "OCBC Bank", "UOB", "Singtel", "CapitaLand", "REITs"],
  buildClientPortfolios: () => [
    {
      id: "SG001", client: "Lee Family Office", segment: "UHNI", rm: "Wei Ling Lee",
      benchmark: "Straits Times Index", ytdReturn: 8.4, benchmarkReturn: 7.2, aum: 78.2,
      ipsEquity: 50, ipsFI: 30, ipsAlt: 15, ipsCash: 5,
      holdings: [
        mkMfH("LionGlobal Infinity Global Stock Index", "Lion Global", 14.2, SG_MF),
        mkBondMfH("ABF Singapore Bond Index Fund", "ABF", 10.8, SG_MF),
        { security: "DBS Group", issuer: "DBS Group", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 12.4, fee: 0 },
        { security: "OCBC Bank", issuer: "OCBC Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 8.6, fee: 0 },
        { security: "UOB", issuer: "UOB", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 6.2, fee: 0 },
        { security: "Bank of Singapore IAM - Asia Core", issuer: "Bank of Singapore", amc: "Bank of Singapore", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 16.4, fee: 1.8 },
        { security: "Temasek-linked Private Equity IV", issuer: "Azalea Asset Management", amc: "Azalea", product: "AIF", assetClass: "Alternates", sector: "Private Equity", liquidity: "Locked", value: 11.2, fee: 2.2 },
        { security: "SGD Cash Sweep", issuer: "DBS Bank", product: "Cash", assetClass: "Cash", sector: "Cash", liquidity: "T+1", value: 4.4, fee: 0 },
      ],
    },
    {
      id: "SG002", client: "Tan Family Office", segment: "UHNI", rm: "Marcus Tan",
      benchmark: "FTSE ST All-Share", ytdReturn: 11.6, benchmarkReturn: 7.5, aum: 64.8,
      ipsEquity: 55, ipsFI: 25, ipsAlt: 15, ipsCash: 5,
      holdings: [
        mkMfH("Nikko AM Singapore STI ETF", "Nikko AM", 12.4, SG_MF),
        mkMfH("LionGlobal Infinity Global Stock Index", "Lion Global", 9.6, SG_MF),
        { security: "Singapore Exchange", issuer: "Singapore Exchange", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 8.2, fee: 0 },
        { security: "Singapore Airlines", issuer: "Singapore Airlines", product: "Equity", assetClass: "Equity", sector: "Transport", liquidity: "T+1", value: 5.8, fee: 0 },
        { security: "SGS 10Y 2.75% 2034", issuer: "Singapore Government", product: "Bond", assetClass: "Fixed Income", sector: "Sovereign", liquidity: "T+3", value: 9.6, fee: 0 },
        { security: "Mapletree Treasury 4.0% 2029", issuer: "Mapletree Treasury", product: "Bond", assetClass: "Fixed Income", sector: "Real Estate", liquidity: "T+3", value: 6.4, fee: 0 },
        { security: "Keppel DC REIT", issuer: "Keppel DC REIT", product: "Equity", assetClass: "Equity", sector: "REIT", liquidity: "T+1", value: 3.6, fee: 0 },
        { security: "Investcorp-Tiga Private Credit III", issuer: "Investcorp-Tiga", amc: "Investcorp-Tiga", product: "AIF", assetClass: "Alternates", sector: "Private Credit", liquidity: "Locked", value: 9.2, fee: 2.0 },
      ],
    },
    {
      id: "SG003", client: "Sarah Lee Trust", segment: "HNI", rm: "Sarah Lee",
      benchmark: "MSCI World", ytdReturn: 6.2, benchmarkReturn: 9.8, aum: 18.4,
      ipsEquity: 60, ipsFI: 30, ipsAlt: 5, ipsCash: 5,
      holdings: [
        mkMfH("LionGlobal Infinity US 500 Stock Index", "Lion Global", 6.2, SG_MF),
        mkBondMfH("Fullerton SGD Cash Fund", "Fullerton", 3.8, SG_MF),
        { security: "CapitaLand Integrated Commercial Trust", issuer: "CapitaLand", product: "Equity", assetClass: "Equity", sector: "Real Estate", liquidity: "T+1", value: 2.8, fee: 0 },
        { security: "Singtel", issuer: "Singtel", product: "Equity", assetClass: "Equity", sector: "Telecom", liquidity: "T+1", value: 2.1, fee: 0 },
        { security: "SGS 6M T-bill 3.35%", issuer: "Singapore Government", product: "Bond", assetClass: "Fixed Income", sector: "Sovereign", liquidity: "T+1", value: 3.5, fee: 0 },
      ],
    },
    {
      id: "SG004", client: "Alex Ong (PR Professional)", segment: "HNI", rm: "Alex Ong",
      benchmark: "Straits Times Index", ytdReturn: 5.8, benchmarkReturn: 7.2, aum: 12.8,
      ipsEquity: 50, ipsFI: 35, ipsAlt: 5, ipsCash: 10,
      holdings: [
        mkMfH("Nikko AM Singapore STI ETF", "Nikko AM", 3.8, SG_MF),
        mkBondMfH("ABF Singapore Bond Index Fund", "ABF", 2.8, SG_MF),
        { security: "DBS Group", issuer: "DBS Group", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 3.2, fee: 0 },
        { security: "Ascendas REIT", issuer: "Ascendas REIT", product: "Equity", assetClass: "Equity", sector: "REIT", liquidity: "T+1", value: 1.6, fee: 0 },
        { security: "SGD 12M Fixed Deposit", issuer: "OCBC Bank", product: "Bond", assetClass: "Fixed Income", sector: "Time Deposit", liquidity: "T+30", value: 1.4, fee: 0 },
      ],
    },
    {
      id: "SG005", client: "Chloe Tan", segment: "Affluent", rm: "Chloe Tan",
      benchmark: "MSCI AC Asia Pacific ex-Japan", ytdReturn: 4.4, benchmarkReturn: 8.2, aum: 4.2,
      ipsEquity: 55, ipsFI: 35, ipsAlt: 0, ipsCash: 10,
      holdings: [
        mkMfH("LionGlobal India Fund", "Lion Global", 1.8, SG_MF),
        mkBondMfH("Fullerton SGD Cash Fund", "Fullerton", 1.2, SG_MF),
        { security: "Sea Ltd", issuer: "Sea Ltd", product: "Equity", assetClass: "Equity", sector: "Technology", liquidity: "T+1", value: 1.2, fee: 0 },
      ],
    },
    {
      id: "SG006", client: "Goh Family Office", segment: "UHNI", rm: "Daniel Goh",
      benchmark: "Straits Times Index", ytdReturn: 9.8, benchmarkReturn: 7.2, aum: 92.4,
      ipsEquity: 45, ipsFI: 30, ipsAlt: 20, ipsCash: 5,
      holdings: [
        mkMfH("LionGlobal Infinity Global Stock Index", "Lion Global", 16.2, SG_MF),
        mkMfH("Nikko AM Singapore STI ETF", "Nikko AM", 11.8, SG_MF),
        mkBondMfH("ABF Singapore Bond Index Fund", "ABF", 10.4, SG_MF),
        { security: "DBS Group", issuer: "DBS Group", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 13.6, fee: 0 },
        { security: "OCBC Bank", issuer: "OCBC Bank", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 9.4, fee: 0 },
        { security: "UOB", issuer: "UOB", product: "Equity", assetClass: "Equity", sector: "Financials", liquidity: "T+1", value: 7.8, fee: 0 },
        { security: "DBS Treasures Private Client - SG Core", issuer: "DBS Bank", amc: "DBS Bank", product: "PMS", assetClass: "Equity", sector: "Diversified", liquidity: "T+30", value: 18.2, fee: 1.7 },
        { security: "Northstar Group Asia Buyout III", issuer: "Northstar Group", amc: "Northstar", product: "AIF", assetClass: "Alternates", sector: "Private Equity", liquidity: "Locked", value: 15.0, fee: 2.2 },
      ],
    },
  ],
};

// ----------------------------------------------------------------------------
// Build derived data (facts + flat/lookthrough holdings) per region
// ----------------------------------------------------------------------------
function rand(seed: number) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

type DataSet = {
  rmInfo: RegionConfig["rmInfo"];
  geoRegions: string[];
  products: string[];
  clientPortfolios: ClientPortfolio[];
  businessFacts: BFact[];
  flatHoldings: FlatHolding[];
  lookthroughHoldings: FlatHolding[];
  quickFilters: string[];
  mfUnderlyings: RegionConfig["mfUnderlyings"];
};

function buildDataset(seed: number, cfg: RegionConfig): DataSet {
  const r = rand(seed);
  const facts: BFact[] = [];
  MONTHS.forEach((month, mIdx) => {
    const growth = 1 + 0.012 * mIdx + (r() - 0.5) * 0.01;
    const monthTotal = cfg.totalAumBase * (growth / (1 + 0.012 * (MONTHS.length - 1)));
    cfg.products.forEach((product) => {
      cfg.geoRegions.forEach((region) => {
        SEGMENTS.forEach((segment) => {
          CHANNELS.forEach((channel) => {
            const eligibleRms = cfg.rmInfo.filter((x) => x.region === region);
            if (eligibleRms.length === 0) return;
            eligibleRms.forEach(({ rm }) => {
              const w = (cfg.productWeight[product] ?? 0) * (cfg.regionWeight[region] ?? 0) * SEGMENT_WEIGHT[segment] * CHANNEL_WEIGHT[channel] / eligibleRms.length;
              const noise = 0.85 + r() * 0.3;
              const aum = +(monthTotal * w * noise).toFixed(2);
              const netFlows = +(aum * (0.008 + (r() - 0.4) * 0.012)).toFixed(3);
              const revenue = +((aum * (cfg.productMargin[product] ?? 1) / 100) / 12).toFixed(3);
              const clients = Math.max(1, Math.round(SEGMENT_CLIENTS[segment] * (cfg.regionWeight[region] ?? 0) * CHANNEL_WEIGHT[channel] / eligibleRms.length * (0.6 + r() * 0.8)));
              if (aum > 0.05) facts.push({ month, mIdx, product, region, segment, channel, rm, aum, netFlows, revenue, clients });
            });
          });
        });
      });
    });
  });

  const clientPortfolios = cfg.buildClientPortfolios();

  const flatHoldings: FlatHolding[] = [];
  clientPortfolios.forEach((p) => {
    p.holdings.forEach((h) => {
      flatHoldings.push({
        clientId: p.id, client: p.client, segment: p.segment, rm: p.rm,
        product: h.product, assetClass: h.assetClass,
        issuer: h.issuer, amc: h.amc ?? h.issuer, sector: h.sector, liquidity: h.liquidity,
        value: h.value, fee: h.fee, isUnderlying: false,
      });
    });
  });

  const lookthroughHoldings: FlatHolding[] = [];
  clientPortfolios.forEach((p) => {
    p.holdings.forEach((h) => {
      if (h.product === "MF" && h.underlyings && h.underlyings.length) {
        h.underlyings.forEach((u) => {
          lookthroughHoldings.push({
            clientId: p.id, client: p.client, segment: p.segment, rm: p.rm,
            product: h.product, assetClass: h.assetClass,
            issuer: u.issuer, amc: h.amc ?? h.issuer, sector: u.sector, liquidity: h.liquidity,
            value: +(h.value * u.weight / 100).toFixed(3), fee: h.fee, isUnderlying: true, parentSecurity: h.security,
          });
        });
      } else {
        lookthroughHoldings.push({
          clientId: p.id, client: p.client, segment: p.segment, rm: p.rm,
          product: h.product, assetClass: h.assetClass,
          issuer: h.issuer, amc: h.amc ?? h.issuer, sector: h.sector, liquidity: h.liquidity,
          value: h.value, fee: h.fee, isUnderlying: false,
        });
      }
    });
  });

  return {
    rmInfo: cfg.rmInfo,
    geoRegions: cfg.geoRegions,
    products: cfg.products,
    clientPortfolios,
    businessFacts: facts,
    flatHoldings,
    lookthroughHoldings,
    quickFilters: cfg.quickFilters,
    mfUnderlyings: cfg.mfUnderlyings,
  };
}

const DATASETS: Record<Region, DataSet> = {
  IN: buildDataset(424242, IN_CONFIG),
  AE: buildDataset(909090, AE_CONFIG),
  PH: buildDataset(717171, PH_CONFIG),
  SG: buildDataset(565656, SG_CONFIG),
};

function ds(): DataSet { return DATASETS[getCurrentRegion()]; }

// ----------------------------------------------------------------------------
// Region-reactive proxy exports
// ----------------------------------------------------------------------------
function arrayProxy<T>(getArr: () => T[]): T[] {
  return new Proxy([] as T[], {
    get(_t, p) {
      const a = getArr() as any;
      const v = a[p as any];
      return typeof v === "function" ? v.bind(a) : v;
    },
    ownKeys() { return Reflect.ownKeys(getArr() as any); },
    getOwnPropertyDescriptor(_t, p) { return Object.getOwnPropertyDescriptor(getArr() as any, p); },
    has(_t, p) { return p in (getArr() as any); },
  }) as T[];
}

export const RM_INFO = arrayProxy(() => ds().rmInfo);
export const REGIONS = arrayProxy(() => ds().geoRegions);
export const PRODUCTS = arrayProxy(() => ds().products);
export const businessFacts = arrayProxy(() => ds().businessFacts);
export const clientPortfolios = arrayProxy(() => ds().clientPortfolios);
export const flatHoldings = arrayProxy(() => ds().flatHoldings);
export const lookthroughHoldings = arrayProxy(() => ds().lookthroughHoldings);

export function getQuickFilters(): string[] { return ds().quickFilters; }
