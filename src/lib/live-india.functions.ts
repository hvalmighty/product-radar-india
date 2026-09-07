import { createServerFn } from "@tanstack/react-start";

/**
 * Live India market data.
 *
 * Mutual funds  -> AMFI NAVs via api.mfapi.in (free, no key)
 * Equities      -> NSE last traded price via Yahoo Finance chart endpoint
 *
 * Both are cached in-module so a page full of rows costs one upstream call
 * per instrument per TTL window, not per render.
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

type CacheEntry<T> = { at: number; value: T };
const navCache = new Map<string, CacheEntry<LiveNav | null>>();
const searchCache = new Map<string, CacheEntry<number | null>>();
const quoteCache = new Map<string, CacheEntry<LiveQuote | null>>();

const NAV_TTL = 30 * 60_000; // NAVs publish once a day
const SEARCH_TTL = 24 * 60 * 60_000;
const QUOTE_TTL = 60_000;

function fresh<T>(c: Map<string, CacheEntry<T>>, k: string, ttl: number) {
  const hit = c.get(k);
  if (hit && Date.now() - hit.at < ttl) return hit;
  return null;
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]!);
      }
    }),
  );
  return out;
}

// ---------------------------------------------------------------- mutual funds

export type LiveNav = {
  nav: number;
  date: string; // dd-mm-yyyy as published by AMFI
  schemeCode: number;
  schemeName: string;
  fundHouse?: string;
};

/** Score a candidate scheme: prefer Direct + Growth plans, penalise IDCW/Bonus. */
function scoreScheme(name: string, query: string) {
  const n = name.toLowerCase();
  let s = 0;
  if (n.includes("direct")) s += 6;
  if (n.includes("growth")) s += 5;
  if (n.includes("idcw") || n.includes("dividend")) s -= 6;
  if (n.includes("bonus")) s -= 6;
  if (n.includes("institutional")) s -= 3;
  if (n.includes("segregated")) s -= 10;
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  for (const w of words) if (n.includes(w)) s += 2;
  s -= Math.abs(name.length - query.length) / 40;
  return s;
}

async function resolveSchemeCode(name: string): Promise<number | null> {
  const key = name.toLowerCase();
  const cached = fresh(searchCache, key, SEARCH_TTL);
  if (cached) return cached.value;
  try {
    const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(name)}`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const rows = (await r.json()) as { schemeCode: number; schemeName: string }[];
    let best: { code: number; score: number } | null = null;
    for (const row of rows ?? []) {
      const sc = scoreScheme(row.schemeName, name);
      if (!best || sc > best.score) best = { code: row.schemeCode, score: sc };
    }
    const code = best?.code ?? null;
    searchCache.set(key, { at: Date.now(), value: code });
    return code;
  } catch (e) {
    console.error("[mfapi:search]", name, e);
    searchCache.set(key, { at: Date.now(), value: null });
    return null;
  }
}

async function fetchLatestNav(code: number): Promise<LiveNav | null> {
  const key = String(code);
  const cached = fresh(navCache, key, NAV_TTL);
  if (cached) return cached.value;
  try {
    const r = await fetch(`https://api.mfapi.in/mf/${code}/latest`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as {
      meta?: { scheme_name?: string; fund_house?: string };
      data?: { date: string; nav: string }[];
    };
    const row = j.data?.[0];
    if (!row) throw new Error("no nav rows");
    const value: LiveNav = {
      nav: Number(row.nav),
      date: row.date,
      schemeCode: code,
      schemeName: j.meta?.scheme_name ?? "",
      fundHouse: j.meta?.fund_house,
    };
    navCache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error("[mfapi:nav]", code, e);
    navCache.set(key, { at: Date.now(), value: null });
    return null;
  }
}

export type LiveNavResponse = {
  asOf: string;
  source: string;
  entries: Record<string, LiveNav>;
  misses: string[];
};

export const getIndiaFundNavs = createServerFn({ method: "POST" })
  .inputValidator((data: { funds: { id: string; name: string }[] }) => {
    if (!data || !Array.isArray(data.funds)) throw new Error("funds required");
    return { funds: data.funds.slice(0, 80).map((f) => ({ id: String(f.id), name: String(f.name) })) };
  })
  .handler(async ({ data }): Promise<LiveNavResponse> => {
    const entries: Record<string, LiveNav> = {};
    const misses: string[] = [];
    await pool(data.funds, 6, async (f) => {
      const code = await resolveSchemeCode(f.name);
      if (!code) return void misses.push(f.id);
      const nav = await fetchLatestNav(code);
      if (nav) entries[f.id] = nav;
      else misses.push(f.id);
    });
    return {
      asOf: new Date().toISOString(),
      source: "AMFI via mfapi.in",
      entries,
      misses,
    };
  });

/** Full NAV history for one scheme, used for live trailing returns. */
export type NavHistoryPoint = { date: string; nav: number };
export type LiveFundHistory = {
  schemeCode: number;
  schemeName: string;
  fundHouse?: string;
  category?: string;
  points: NavHistoryPoint[]; // ascending by date, monthly sampled
  returns: { r1y: number | null; r3y: number | null; r5y: number | null; ytd: number | null };
};

const historyCache = new Map<string, CacheEntry<LiveFundHistory | null>>();
const HISTORY_TTL = 6 * 60 * 60_000;

function parseDMY(s: string) {
  const [d, m, y] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
}

function cagr(from: number, to: number, years: number) {
  if (!from || !to || from <= 0) return null;
  const v = years <= 1 ? (to / from - 1) * 100 : (Math.pow(to / from, 1 / years) - 1) * 100;
  return Number.isFinite(v) ? Number(v.toFixed(2)) : null;
}

export const getIndiaFundHistory = createServerFn({ method: "POST" })
  .inputValidator((data: { name?: string; schemeCode?: number }) => ({
    name: data?.name ? String(data.name) : undefined,
    schemeCode: data?.schemeCode ? Number(data.schemeCode) : undefined,
  }))
  .handler(async ({ data }): Promise<LiveFundHistory | null> => {
    const code = data.schemeCode ?? (data.name ? await resolveSchemeCode(data.name) : null);
    if (!code) return null;
    const key = String(code);
    const cached = fresh(historyCache, key, HISTORY_TTL);
    if (cached) return cached.value;
    try {
      const r = await fetch(`https://api.mfapi.in/mf/${code}`, {
        headers: { "User-Agent": UA, Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as {
        meta?: { scheme_name?: string; fund_house?: string; scheme_category?: string };
        data?: { date: string; nav: string }[];
      };
      const rows = (j.data ?? [])
        .map((d) => ({ t: parseDMY(d.date).getTime(), nav: Number(d.nav) }))
        .filter((d) => Number.isFinite(d.nav) && d.nav > 0)
        .sort((a, b) => a.t - b.t);
      if (!rows.length) throw new Error("empty history");
      const last = rows[rows.length - 1]!;
      const at = (msAgo: number) => {
        const target = last.t - msAgo;
        let best = rows[0]!;
        for (const row of rows) {
          if (row.t <= target) best = row;
          else break;
        }
        return best.nav;
      };
      const yearMs = 365.25 * 24 * 3600_000;
      const jan1 = Date.UTC(new Date(last.t).getUTCFullYear(), 0, 1);
      let ytdBase = rows[0]!.nav;
      for (const row of rows) {
        if (row.t <= jan1) ytdBase = row.nav;
        else break;
      }
      // monthly sample for charting
      const points: NavHistoryPoint[] = [];
      let lastKey = "";
      for (const row of rows) {
        const d = new Date(row.t);
        const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        if (k !== lastKey) {
          points.push({ date: k, nav: Number(row.nav.toFixed(4)) });
          lastKey = k;
        }
      }
      const value: LiveFundHistory = {
        schemeCode: code,
        schemeName: j.meta?.scheme_name ?? "",
        fundHouse: j.meta?.fund_house,
        category: j.meta?.scheme_category,
        points: points.slice(-72),
        returns: {
          r1y: cagr(at(yearMs), last.nav, 1),
          r3y: cagr(at(yearMs * 3), last.nav, 3),
          r5y: cagr(at(yearMs * 5), last.nav, 5),
          ytd: cagr(ytdBase, last.nav, 1),
        },
      };
      historyCache.set(key, { at: Date.now(), value });
      return value;
    } catch (e) {
      console.error("[mfapi:history]", code, e);
      historyCache.set(key, { at: Date.now(), value: null });
      return null;
    }
  });

// -------------------------------------------------------------------- equities

export type LiveQuote = {
  symbol: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  currency: string;
  marketState?: string;
  time: number;
};

async function fetchNseQuote(symbol: string): Promise<LiveQuote | null> {
  const cached = fresh(quoteCache, symbol, QUOTE_TTL);
  if (cached) return cached.value;
  try {
    const yf = `${symbol.replace(/\s+/g, "")}.NS`;
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yf)}?range=1d&interval=1d`,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()) as any;
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta) throw new Error("no meta");
    const price = Number(meta.regularMarketPrice);
    const prev = Number(meta.chartPreviousClose ?? meta.previousClose ?? price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("no price");
    const value: LiveQuote = {
      symbol,
      price,
      prevClose: prev,
      change: price - prev,
      changePct: prev ? ((price - prev) / prev) * 100 : 0,
      currency: meta.currency ?? "INR",
      marketState: meta.marketState,
      time: (meta.regularMarketTime ?? Math.floor(Date.now() / 1000)) * 1000,
    };
    quoteCache.set(symbol, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.error("[nse:quote]", symbol, e);
    quoteCache.set(symbol, { at: Date.now(), value: null });
    return null;
  }
}

export type LiveQuoteResponse = {
  asOf: string;
  source: string;
  quotes: Record<string, LiveQuote>;
  misses: string[];
};

export const getIndiaEquityQuotes = createServerFn({ method: "POST" })
  .inputValidator((data: { symbols: string[] }) => {
    if (!data || !Array.isArray(data.symbols)) throw new Error("symbols required");
    return { symbols: data.symbols.slice(0, 80).map((s) => String(s).toUpperCase()) };
  })
  .handler(async ({ data }): Promise<LiveQuoteResponse> => {
    const quotes: Record<string, LiveQuote> = {};
    const misses: string[] = [];
    await pool(data.symbols, 8, async (s) => {
      const q = await fetchNseQuote(s);
      if (q) quotes[s] = q;
      else misses.push(s);
    });
    return { asOf: new Date().toISOString(), source: "NSE last traded price", quotes, misses };
  });
