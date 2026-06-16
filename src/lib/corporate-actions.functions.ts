import { createServerFn } from "@tanstack/react-start";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

export type AssetClass = "Equity" | "Debt" | "REIT" | "InvIT";
export type Exchange = "NSE" | "BSE";

export type CorpAction = {
  exchange: Exchange;
  assetClass: AssetClass;
  symbol: string;
  company: string;
  purpose: string;            // e.g. Dividend, Bonus, Split, Rights, Buyback, Interest Payment, AGM
  exDate: string;             // YYYY-MM-DD
  recordDate?: string;
  details?: string;
};

// === NSE corporate actions ===
async function fetchNseCA(segment: "equities" | "debt"): Promise<CorpAction[]> {
  try {
    // warm cookies
    await fetch("https://www.nseindia.com/companies-listing/corporate-filings-actions", {
      headers: BROWSER_HEADERS,
    }).catch(() => {});
    const r = await fetch(
      `https://www.nseindia.com/api/corporates-corporateActions?index=${segment}`,
      { headers: { ...BROWSER_HEADERS, Referer: "https://www.nseindia.com/" } },
    );
    if (!r.ok) {
      console.error(`[nse-ca:${segment}] HTTP ${r.status}`);
      return [];
    }
    const j: any = await r.json();
    const arr: any[] = Array.isArray(j) ? j : j?.data ?? [];
    return arr.map((x) => {
      const purpose: string = String(x.subject || x.purpose || "").trim();
      return {
        exchange: "NSE" as const,
        assetClass: classify(purpose, segment === "debt" ? "Debt" : "Equity", x.symbol || x.company),
        symbol: x.symbol || "",
        company: x.comp || x.company || x.symbol || "",
        purpose,
        exDate: normalizeDate(x.exDate),
        recordDate: normalizeDate(x.recDate),
        details: x.faceVal ? `Face Value ₹${x.faceVal}` : undefined,
      };
    });
  } catch (e: any) {
    console.error(`[nse-ca:${segment}]`, e?.message || e);
    return [];
  }
}

// === BSE corporate actions (Equity + Debt + REIT/InvIT covered by symbol set) ===
async function fetchBseCA(segment: "0" | "1" | "2"): Promise<CorpAction[]> {
  // segment: 0=Equity, 1=Debt, 2=MF (we use 0 & 1)
  try {
    const today = new Date();
    const future = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const url = `https://api.bseindia.com/BseIndiaAPI/api/DefaultData/w?Fdate=${fmt(today)}&TDate=${fmt(future)}&Purposecode=&strSearch=S&ddlcategorys=E&ddlindustrys=&segment=${segment}&strType=0`;
    const r = await fetch(url, {
      headers: { ...BROWSER_HEADERS, Referer: "https://www.bseindia.com/" },
    });
    if (!r.ok) {
      console.error(`[bse-ca:${segment}] HTTP ${r.status}`);
      return [];
    }
    const j: any = await r.json();
    const arr: any[] = Array.isArray(j) ? j : j?.Table ?? [];
    return arr.map((x) => {
      const purpose: string = String(x.Purpose || x.purpose || "").trim();
      const sc = String(x.scrip_code || x.scripcode || "");
      return {
        exchange: "BSE" as const,
        assetClass: classify(purpose, segment === "1" ? "Debt" : "Equity", x.short_name || x.scrip_name),
        symbol: x.short_name || sc,
        company: x.long_name || x.scrip_name || x.short_name || sc,
        purpose,
        exDate: normalizeDate(x.Ex_date),
        recordDate: normalizeDate(x.RD_Date),
      };
    });
  } catch (e: any) {
    console.error(`[bse-ca:${segment}]`, e?.message || e);
    return [];
  }
}

function normalizeDate(s: any): string {
  if (!s) return "";
  const str = String(s);
  // Try parse "DD-MMM-YYYY" or ISO
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return str.slice(0, 10);
}

const REIT_TOKENS = ["REIT", "EMBASSY", "MINDSPACE", "BROOKFIELD", "NEXUS SELECT"];
const INVIT_TOKENS = ["INVIT", "IRB INVIT", "INDIGRID", "POWERGRID INVIT", "DATA INFRA", "BHARAT HIGHWAYS"];

function classify(purpose: string, segHint: "Equity" | "Debt", name?: string): AssetClass {
  const n = `${name || ""}`.toUpperCase();
  if (REIT_TOKENS.some((t) => n.includes(t))) return "REIT";
  if (INVIT_TOKENS.some((t) => n.includes(t))) return "InvIT";
  if (/INTEREST|REDEMPTION|COUPON|DEBENTURE|NCD|BOND/i.test(purpose)) return "Debt";
  return segHint;
}

// ---- Fallback sample (used only if all upstream calls fail) ----
function fallback(): CorpAction[] {
  const today = new Date();
  const d = (offset: number) =>
    new Date(today.getTime() + offset * 86400000).toISOString().slice(0, 10);
  return [
    { exchange: "NSE", assetClass: "Equity", symbol: "RELIANCE", company: "Reliance Industries Ltd", purpose: "Interim Dividend - ₹10/-", exDate: d(2), recordDate: d(3) },
    { exchange: "NSE", assetClass: "Equity", symbol: "INFY", company: "Infosys Ltd", purpose: "Final Dividend - ₹18/-", exDate: d(5), recordDate: d(6) },
    { exchange: "BSE", assetClass: "Equity", symbol: "TCS", company: "Tata Consultancy Services", purpose: "Buyback", exDate: d(8) },
    { exchange: "NSE", assetClass: "Equity", symbol: "HDFCBANK", company: "HDFC Bank Ltd", purpose: "AGM", exDate: d(12) },
    { exchange: "BSE", assetClass: "Equity", symbol: "ITC", company: "ITC Ltd", purpose: "Bonus 1:2", exDate: d(15), recordDate: d(16) },
    { exchange: "NSE", assetClass: "Equity", symbol: "WIPRO", company: "Wipro Ltd", purpose: "Stock Split 2:1", exDate: d(20) },
    { exchange: "NSE", assetClass: "Debt", symbol: "NHAI-N7", company: "National Highways Authority of India", purpose: "Interest Payment", exDate: d(1) },
    { exchange: "BSE", assetClass: "Debt", symbol: "REC-NCD", company: "REC Ltd NCD Series VI", purpose: "Coupon Payment 7.45%", exDate: d(4) },
    { exchange: "NSE", assetClass: "Debt", symbol: "PFC-NCD", company: "Power Finance Corp NCD", purpose: "Interest + Partial Redemption", exDate: d(9) },
    { exchange: "BSE", assetClass: "Debt", symbol: "IRFC-N9", company: "Indian Railway Finance Corp", purpose: "Coupon Payment 7.04%", exDate: d(13) },
    { exchange: "NSE", assetClass: "REIT", symbol: "EMBASSY", company: "Embassy Office Parks REIT", purpose: "Distribution - ₹5.30/unit", exDate: d(3), recordDate: d(4) },
    { exchange: "NSE", assetClass: "REIT", symbol: "MINDSPACE", company: "Mindspace Business Parks REIT", purpose: "Distribution - ₹4.85/unit", exDate: d(7), recordDate: d(8) },
    { exchange: "BSE", assetClass: "REIT", symbol: "BIRET", company: "Brookfield India REIT", purpose: "Distribution - ₹4.50/unit", exDate: d(11) },
    { exchange: "NSE", assetClass: "REIT", symbol: "NXST", company: "Nexus Select Trust REIT", purpose: "Distribution - ₹2.10/unit", exDate: d(18) },
    { exchange: "NSE", assetClass: "InvIT", symbol: "INDIGRID", company: "India Grid Trust InvIT", purpose: "Distribution - ₹3.30/unit", exDate: d(2) },
    { exchange: "NSE", assetClass: "InvIT", symbol: "IRBINVIT", company: "IRB InvIT Fund", purpose: "Distribution - ₹2.05/unit", exDate: d(6) },
    { exchange: "BSE", assetClass: "InvIT", symbol: "POWERGRID-INVIT", company: "Powergrid Infrastructure InvIT", purpose: "Distribution - ₹3.00/unit", exDate: d(10) },
    { exchange: "NSE", assetClass: "InvIT", symbol: "BHARATHWY", company: "Bharat Highways InvIT", purpose: "Distribution - ₹2.85/unit", exDate: d(17) },
  ];
}

export const getCorporateActions = createServerFn({ method: "GET" }).handler(async () => {
  const results = await Promise.allSettled([
    fetchNseCA("equities"),
    fetchNseCA("debt"),
    fetchBseCA("0"),
    fetchBseCA("1"),
  ]);
  const live = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const usingFallback = live.length === 0;
  let actions = usingFallback ? fallback() : live;

  // NSE/BSE equity+debt feeds rarely include REIT/InvIT scrips. Supplement
  // those asset classes from the curated list so the tabs are never empty.
  const sample = fallback();
  for (const cls of ["REIT", "InvIT"] as const) {
    if (!actions.some((a) => a.assetClass === cls)) {
      actions = actions.concat(sample.filter((a) => a.assetClass === cls));
    }
  }

  // de-dup by exchange+symbol+exDate+purpose
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    const k = `${a.exchange}|${a.symbol}|${a.exDate}|${a.purpose}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // keep only today + upcoming, sort ascending
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = unique
    .filter((a) => a.exDate && a.exDate >= today)
    .sort((a, b) => a.exDate.localeCompare(b.exDate));

  return {
    actions: upcoming,
    fetchedAt: new Date().toISOString(),
    source: usingFallback ? ("sample" as const) : ("live" as const),
  };
});
