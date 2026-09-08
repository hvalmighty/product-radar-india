// Bridges the demo sample portfolios (src/lib/sample-portfolios.ts) into the
// analytics dataset shape so every saved client shows up in firm-wide analysis
// such as the Mutual Fund Exposure & Overlap module.

import type { ClientPortfolio, Holding as AHolding, BSegment } from "./analytics-data";
import { SAMPLE_PORTFOLIOS_BY_REGION } from "./sample-portfolios";
import type { Region } from "./region";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rand = (s: string) => (hash(s) % 10000) / 10000;

/** Strip plan/option suffixes so "X Fund - Direct Growth" == "X Fund". */
export function canonicalScheme(name: string): string {
  return name
    .replace(/\s*[-–]\s*(Direct|Regular)\s*(Growth|Plan|IDCW)?.*$/i, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/\s+Fund$/i, " Fund")
    .replace(/\s+/g, " ")
    .trim();
}

type U = { issuer: string; sector: string; weight: number };

const LARGE: U[] = [
  { issuer: "HDFC Bank", sector: "Financials", weight: 0 },
  { issuer: "ICICI Bank", sector: "Financials", weight: 0 },
  { issuer: "Reliance Inds.", sector: "Energy", weight: 0 },
  { issuer: "Infosys", sector: "IT", weight: 0 },
  { issuer: "TCS", sector: "IT", weight: 0 },
  { issuer: "Bharti Airtel", sector: "Telecom", weight: 0 },
  { issuer: "L&T", sector: "Industrials", weight: 0 },
  { issuer: "Axis Bank", sector: "Financials", weight: 0 },
  { issuer: "ITC", sector: "Consumer", weight: 0 },
  { issuer: "Bajaj Finance", sector: "Financials", weight: 0 },
];
const MID: U[] = [
  { issuer: "Persistent Systems", sector: "IT", weight: 0 },
  { issuer: "Cummins India", sector: "Industrials", weight: 0 },
  { issuer: "Federal Bank", sector: "Financials", weight: 0 },
  { issuer: "Max Healthcare", sector: "Healthcare", weight: 0 },
  { issuer: "Polycab", sector: "Industrials", weight: 0 },
  { issuer: "Supreme Inds.", sector: "Materials", weight: 0 },
  { issuer: "Trent", sector: "Consumer", weight: 0 },
  { issuer: "AU Small Fin. Bank", sector: "Financials", weight: 0 },
];
const SMALL: U[] = [
  { issuer: "CDSL", sector: "Financials", weight: 0 },
  { issuer: "Blue Star", sector: "Consumer", weight: 0 },
  { issuer: "Carborundum", sector: "Industrials", weight: 0 },
  { issuer: "KEI Industries", sector: "Industrials", weight: 0 },
  { issuer: "Century Plyboards", sector: "Materials", weight: 0 },
  { issuer: ".Rategain", sector: "IT", weight: 0 },
];
const DEBT: U[] = [
  { issuer: "GoI Bonds", sector: "Sovereign", weight: 0 },
  { issuer: "REC Ltd", sector: "Financials", weight: 0 },
  { issuer: "PFC Ltd", sector: "Financials", weight: 0 },
  { issuer: "HDFC Bank", sector: "Financials", weight: 0 },
  { issuer: "NABARD", sector: "Financials", weight: 0 },
  { issuer: "SIDBI", sector: "Financials", weight: 0 },
];
const GLOBAL: U[] = [
  { issuer: "Apple", sector: "IT", weight: 0 },
  { issuer: "Microsoft", sector: "IT", weight: 0 },
  { issuer: "Nvidia", sector: "IT", weight: 0 },
  { issuer: "Amazon", sector: "Consumer", weight: 0 },
  { issuer: "Alphabet", sector: "IT", weight: 0 },
];

function poolFor(scheme: string): U[] {
  const n = scheme.toLowerCase();
  if (/nasdaq|us |global|international|feeder|technology fof/.test(n)) return GLOBAL;
  if (/gilt|bond|debt|liquid|money market|short term|ultra short|low duration|banking & psu|all seasons|medium duration/.test(n)) return DEBT;
  if (/small cap/.test(n)) return [...SMALL, ...MID];
  if (/mid cap|midcap|emerging equity|emerging bluechip|growth fund/.test(n)) return [...MID, ...LARGE];
  return LARGE;
}

const underlyingCache = new Map<string, U[]>();

/** Deterministic, look-through style holdings for a scheme name. */
export function underlyingsFor(schemeRaw: string): U[] {
  const scheme = canonicalScheme(schemeRaw);
  const cached = underlyingCache.get(scheme);
  if (cached) return cached;
  const pool = poolFor(scheme);
  const isIndex = /index|nifty|sensex|bluechip|large cap|top 100/i.test(scheme);
  const picks: U[] = [];
  const used = new Set<number>();
  const count = Math.min(pool.length, isIndex ? 6 : 5);
  for (let k = 0; k < count; k++) {
    let idx = Math.floor(rand(scheme + "#" + k) * pool.length);
    // index-style funds anchor on the top of the pool so overlap is realistic
    if (isIndex) idx = k % pool.length;
    let guard = 0;
    while (used.has(idx) && guard++ < pool.length) idx = (idx + 1) % pool.length;
    used.add(idx);
    const base = isIndex ? 9.5 - k * 1.1 : 8.5 - k * 1.0;
    const w = Math.max(1.5, base + (rand(scheme + "w" + k) - 0.5) * 2.4);
    picks.push({ ...pool[idx], weight: Math.round(w * 10) / 10 });
  }
  const sum = picks.reduce((s, p) => s + p.weight, 0);
  picks.push({ issuer: "Others", sector: "Mixed", weight: Math.round((100 - sum) * 10) / 10 });
  underlyingCache.set(scheme, picks);
  return picks;
}

function amcOf(name: string): string {
  const AMCS = ["HDFC", "ICICI Pru", "SBI", "Axis", "Kotak", "Nippon India", "Aditya Birla SL", "DSP", "UTI", "Franklin India", "Mirae Asset", "Parag Parikh", "Edelweiss", "Quant", "Tata", "Invesco India", "Bandhan", "Motilal Oswal", "Canara Robeco", "Sundaram"];
  for (const a of AMCS) if (name.toLowerCase().startsWith(a.toLowerCase())) return `${a} AMC`;
  return `${name.split(/\s+/)[0]} AMC`;
}

const SEGMENTS_ORDER: BSegment[] = ["UHNI", "HNI", "Affluent", "Mass Affluent"];

/**
 * Convert saved sample portfolios of a region into analytics client portfolios.
 * Values are converted from absolute currency units to Cr/M (÷ 1e7) to match
 * the hand-authored analytics portfolios.
 */
export function sampleClientPortfolios(region: Region, rms: string[], benchmark: string): ClientPortfolio[] {
  const samples = SAMPLE_PORTFOLIOS_BY_REGION[region] ?? [];
  return samples.map((sp, i) => {
    const holdings: AHolding[] = sp.data.holdings.map((h) => {
      const value = h.value / 1e7;
      const cat = (h.productCategory ?? "").toLowerCase();
      if (h.type === "Mutual Fund") {
        const debt = /debt|liquid|bond|gilt|money market/.test(cat) || /debt|liquid|bond|gilt|money market|short term|ultra short|low duration|banking & psu|all seasons|medium duration/i.test(h.name);
        const hybrid = /hybrid|balanced|multi asset/i.test(cat + " " + h.name);
        return {
          security: canonicalScheme(h.name), issuer: canonicalScheme(h.name), amc: amcOf(h.name),
          product: "MF", assetClass: debt ? "Fixed Income" : "Equity",
          sector: hybrid ? "Hybrid" : debt ? "Credit" : "Diversified",
          liquidity: debt ? "T+1" : "T+3", value, fee: debt ? 0.6 : 1.4,
          underlyings: underlyingsFor(h.name),
        };
      }
      if (h.type === "Bond") {
        return { security: h.name, issuer: h.name.split(/\s+/).slice(1, 3).join(" ") || h.name, product: "Bond", assetClass: "Fixed Income", sector: /GOI|G-Sec/i.test(h.name) ? "Sovereign" : "Credit", liquidity: "T+1", value, fee: 0 };
      }
      if (h.type === "Equity") {
        return { security: h.name, issuer: h.name, product: "Equity", assetClass: "Equity", sector: "Diversified", liquidity: "T+1", value, fee: 0 };
      }
      const alt = /pms|aif|unlisted|private/i.test(cat + " " + h.name);
      return {
        security: h.name, issuer: h.name, amc: h.name.split(/\s+/)[0],
        product: alt ? "PMS" : "Cash", assetClass: alt ? "Alternates" : "Cash",
        sector: alt ? "Diversified" : "Cash", liquidity: alt ? "T+30" : "T+1",
        value, fee: alt ? 2.0 : 0,
      };
    });
    const aum = holdings.reduce((s, h) => s + h.value, 0);
    const r = rand(sp.id);
    const eq = holdings.filter(h => h.assetClass === "Equity").reduce((s, h) => s + h.value, 0);
    const fi = holdings.filter(h => h.assetClass === "Fixed Income").reduce((s, h) => s + h.value, 0);
    const alt = holdings.filter(h => h.assetClass === "Alternates").reduce((s, h) => s + h.value, 0);
    const pct = (v: number) => Math.round((v / (aum || 1)) * 100);
    return {
      id: `S-${sp.id}`,
      client: sp.name.replace(/\s+—.*$/, ""),
      segment: SEGMENTS_ORDER[aum > 20 ? 0 : aum > 8 ? 1 : aum > 3 ? 2 : 3],
      rm: rms[i % rms.length],
      benchmark,
      ytdReturn: Math.round((6 + r * 9) * 10) / 10,
      benchmarkReturn: Math.round((8 + rand(sp.id + "b") * 6) * 10) / 10,
      aum: Math.round(aum * 10) / 10,
      ipsEquity: pct(eq), ipsFI: pct(fi), ipsAlt: pct(alt),
      ipsCash: Math.max(0, 100 - pct(eq) - pct(fi) - pct(alt)),
      holdings,
    };
  });
}
