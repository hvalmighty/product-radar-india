import { createServerFn } from "@tanstack/react-start";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/",
};

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  currency?: string;
  spark?: number[];
  group: "india" | "crypto" | "fx" | "sector";
};

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  image?: string;
  description?: string;
};

// === NSE India (indices + sector indices) ===
// Free, no key — primary source for Indian markets.
async function fetchNseIndices(): Promise<Quote[]> {
  try {
    const r = await fetch("https://www.nseindia.com/api/allIndices", {
      headers: BROWSER_HEADERS,
    });
    if (!r.ok) {
      console.error(`[nse] HTTP ${r.status}`);
      return [];
    }
    const j: any = await r.json();
    const wanted = new Set([
      "NIFTY 50",
      "NIFTY NEXT 50",
      "NIFTY BANK",
      "NIFTY MIDCAP 100",
      "NIFTY SMALLCAP 100",
      "NIFTY 500",
      "INDIA VIX",
    ]);
    const sectors = new Set([
      "NIFTY IT",
      "NIFTY AUTO",
      "NIFTY PHARMA",
      "NIFTY FMCG",
      "NIFTY METAL",
      "NIFTY REALTY",
      "NIFTY ENERGY",
      "NIFTY FINANCIAL SERVICES",
    ]);
    const out: Quote[] = [];
    for (const row of j.data ?? []) {
      const name: string = row.index ?? row.indexSymbol;
      const isBenchmark = wanted.has(name);
      const isSector = sectors.has(name);
      if (!isBenchmark && !isSector) continue;
      const price = Number(row.last) || 0;
      const prev = Number(row.previousClose) || price;
      const change = price - prev;
      const pct = Number(row.percentChange);
      out.push({
        symbol: name,
        name,
        price,
        change,
        changePct: Number.isFinite(pct) ? pct : prev ? (change / prev) * 100 : 0,
        currency: "INR",
        group: isSector ? "sector" : "india",
      });
    }
    return out;
  } catch (e) {
    console.error("[nse] threw", e);
    return [];
  }
}

// === Crypto (Binance public API — no key, edge-friendly) ===
// CoinGecko's free endpoint returns 403 from Cloudflare Worker IP ranges,
// so we use Binance 24h ticker which is reliably reachable from workerd.
async function fetchCrypto(): Promise<Quote[]> {
  const pairs: { symbol: string; name: string; pair: string }[] = [
    { symbol: "BTC", name: "Bitcoin", pair: "BTCUSDT" },
    { symbol: "ETH", name: "Ethereum", pair: "ETHUSDT" },
    { symbol: "SOL", name: "Solana", pair: "SOLUSDT" },
    { symbol: "XRP", name: "XRP", pair: "XRPUSDT" },
    { symbol: "BNB", name: "BNB", pair: "BNBUSDT" },
  ];
  try {
    const symbolsParam = encodeURIComponent(
      JSON.stringify(pairs.map((p) => p.pair)),
    );
    const r = await fetch(
      `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`,
      { headers: { Accept: "application/json" } },
    );
    if (!r.ok) {
      console.error(`[binance] HTTP ${r.status}`);
      return [];
    }
    const j: any = await r.json();
    const byPair = new Map<string, any>(
      (Array.isArray(j) ? j : []).map((t: any) => [t.symbol, t]),
    );
    const out: Quote[] = [];
    for (const p of pairs) {
      const t = byPair.get(p.pair);
      if (!t) continue;
      const price = Number(t.lastPrice) || 0;
      const change = Number(t.priceChange) || 0;
      const pct = Number(t.priceChangePercent) || 0;
      out.push({
        symbol: p.symbol,
        name: p.name,
        price,
        change,
        changePct: pct,
        currency: "USD",
        group: "crypto",
      });
    }
    return out;
  } catch (e) {
    console.error("[binance] threw", e);
    return [];
  }
}

// === Frankfurter (FX, ECB rates) ===
async function fetchFx(): Promise<Quote[]> {
  try {
    // Two-day range to compute change vs previous business day
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = `https://api.frankfurter.dev/v1/${fmt(start)}..${fmt(today)}?from=USD&to=INR,EUR,GBP,JPY`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) {
      console.error(`[frankfurter] HTTP ${r.status}`);
      return [];
    }
    const j: any = await r.json();
    const rates: Record<string, Record<string, number>> = j.rates ?? {};
    const dates = Object.keys(rates).sort();
    if (!dates.length) return [];
    const last = rates[dates[dates.length - 1]];
    const prev = rates[dates[dates.length - 2]] ?? last;
    const ccys = ["INR", "EUR", "GBP", "JPY"] as const;
    const out: Quote[] = [];
    for (const cc of ccys) {
      const price = Number(last[cc]);
      const pr = Number(prev[cc]) || price;
      if (!price) continue;
      const change = price - pr;
      out.push({
        symbol: `USD/${cc}`,
        name: `USD → ${cc}`,
        price,
        change,
        changePct: pr ? (change / pr) * 100 : 0,
        currency: cc,
        group: "fx",
      });
    }
    return out;
  } catch (e) {
    console.error("[frankfurter] threw", e);
    return [];
  }
}

// ============ UAE markets (Yahoo) ============
const UAE_INDICES: { yahoo: string; label: string }[] = [
  { yahoo: "^DFMGI", label: "DFM General" },
  { yahoo: "^ADI",   label: "ADX General" },
  { yahoo: "BBGI.AD", label: "FTSE ADX 15" },
];
const UAE_SECTORS: { yahoo: string; label: string }[] = [
  { yahoo: "EMAAR.AE", label: "Emaar Properties" },
  { yahoo: "ENBD.DU",  label: "Emirates NBD" },
  { yahoo: "FAB.AE",   label: "First Abu Dhabi Bank" },
  { yahoo: "ADCB.AE",  label: "ADCB" },
  { yahoo: "DEWA.DU",  label: "DEWA" },
  { yahoo: "EAND.AE",  label: "e& (Etisalat Group)" },
];
async function fetchUaeQuotes(): Promise<Quote[]> {
  const all = [...UAE_INDICES.map(x => ({ ...x, group: "india" as Quote["group"] })),
               ...UAE_SECTORS.map(x => ({ ...x, group: "sector" as Quote["group"] }))];
  const results = await Promise.all(all.map(async (x): Promise<Quote | null> => {
    const q = await fetchYahooQuote(x.yahoo);
    if (!q) return null;
    const change = q.price - q.prev;
    return {
      symbol: x.yahoo, name: x.label, price: q.price, change,
      changePct: q.prev ? (change / q.prev) * 100 : 0,
      currency: "AED", group: x.group,
    };
  }));
  return results.filter((r): r is Quote => r !== null);
}

// ============ Philippines markets (Yahoo) ============
const PH_INDICES: { yahoo: string; label: string }[] = [
  { yahoo: "PSEI.PS", label: "PSEi Composite" },
  { yahoo: "^PSI",    label: "PSE All Shares" },
];
const PH_SECTORS: { yahoo: string; label: string }[] = [
  { yahoo: "SM.PS",  label: "SM Investments" },
  { yahoo: "BDO.PS", label: "BDO Unibank" },
  { yahoo: "ALI.PS", label: "Ayala Land" },
  { yahoo: "TEL.PS", label: "PLDT" },
  { yahoo: "JFC.PS", label: "Jollibee Foods Corp" },
  { yahoo: "MER.PS", label: "Manila Electric" },
];
async function fetchPhQuotes(): Promise<Quote[]> {
  const all = [...PH_INDICES.map(x => ({ ...x, group: "india" as Quote["group"] })),
               ...PH_SECTORS.map(x => ({ ...x, group: "sector" as Quote["group"] }))];
  const results = await Promise.all(all.map(async (x): Promise<Quote | null> => {
    const q = await fetchYahooQuote(x.yahoo);
    if (!q) return null;
    const change = q.price - q.prev;
    return {
      symbol: x.yahoo, name: x.label, price: q.price, change,
      changePct: q.prev ? (change / q.prev) * 100 : 0,
      currency: "PHP", group: x.group,
    };
  }));
  return results.filter((r): r is Quote => r !== null);
}

async function fetchFxAE(): Promise<Quote[]> {
  try {
    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = `https://api.frankfurter.dev/v1/${fmt(start)}..${fmt(today)}?from=USD&to=AED,EUR,GBP,INR,SAR`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return [];
    const j: any = await r.json();
    const rates: Record<string, Record<string, number>> = j.rates ?? {};
    const dates = Object.keys(rates).sort();
    if (!dates.length) return [];
    const last = rates[dates[dates.length - 1]];
    const prev = rates[dates[dates.length - 2]] ?? last;
    const out: Quote[] = [];
    for (const cc of ["AED", "EUR", "GBP", "INR", "SAR"] as const) {
      const price = Number(last[cc]); const pr = Number(prev[cc]) || price;
      if (!price) continue;
      const change = price - pr;
      out.push({ symbol: `USD/${cc}`, name: `USD → ${cc}`, price, change, changePct: pr ? (change / pr) * 100 : 0, currency: cc, group: "fx" });
    }
    return out;
  } catch { return []; }
}

async function fetchFxPH(): Promise<Quote[]> {
  try {
    const today = new Date();
    const start = new Date(today); start.setDate(start.getDate() - 7);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = `https://api.frankfurter.dev/v1/${fmt(start)}..${fmt(today)}?from=USD&to=PHP,EUR,GBP,JPY,SGD`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) return [];
    const j: any = await r.json();
    const rates: Record<string, Record<string, number>> = j.rates ?? {};
    const dates = Object.keys(rates).sort();
    if (!dates.length) return [];
    const last = rates[dates[dates.length - 1]];
    const prev = rates[dates[dates.length - 2]] ?? last;
    const out: Quote[] = [];
    for (const cc of ["PHP", "EUR", "GBP", "JPY", "SGD"] as const) {
      const price = Number(last[cc]); const pr = Number(prev[cc]) || price;
      if (!price) continue;
      const change = price - pr;
      out.push({ symbol: `USD/${cc}`, name: `USD → ${cc}`, price, change, changePct: pr ? (change / pr) * 100 : 0, currency: cc, group: "fx" });
    }
    return out;
  } catch { return []; }
}

export const getMarketQuotes = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const raw = (d as any)?.region;
    const region: "IN" | "AE" | "PH" = raw === "AE" ? "AE" : raw === "PH" ? "PH" : "IN";
    return { region };
  })
  .handler(async ({ data }) => {
    if (data.region === "AE") {
      const [ae, crypto, fx] = await Promise.all([fetchUaeQuotes(), fetchCrypto(), fetchFxAE()]);
      return [...ae, ...crypto, ...fx];
    }
    if (data.region === "PH") {
      const [ph, crypto, fx] = await Promise.all([fetchPhQuotes(), fetchCrypto(), fetchFxPH()]);
      return [...ph, ...crypto, ...fx];
    }
    const [india, crypto, fx] = await Promise.all([fetchNseIndices(), fetchCrypto(), fetchFx()]);
    return [...india, ...crypto, ...fx];
  });

// === Yahoo Finance — top-bar benchmark indices ===
async function fetchYahooQuote(symbol: string): Promise<{ price: number; prev: number } | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`,
      { headers: { "User-Agent": BROWSER_HEADERS["User-Agent"], Accept: "application/json" } },
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    const result = j?.chart?.result?.[0];
    if (!result) return null;
    const price = Number(result.meta?.regularMarketPrice);
    const prev = Number(result.meta?.chartPreviousClose ?? result.meta?.previousClose);
    if (!Number.isFinite(price) || !Number.isFinite(prev)) return null;
    return { price, prev };
  } catch { return null; }
}

export type TopBarIndex = {
  symbol: string;
  label: string;
  price: number;
  changePct: number;
};

export const getTopBarIndices = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const raw = (d as any)?.region;
    const region: "IN" | "AE" | "PH" = raw === "AE" ? "AE" : raw === "PH" ? "PH" : "IN";
    return { region };
  })
  .handler(async ({ data }): Promise<TopBarIndex[]> => {
    const symbols = data.region === "AE"
      ? [{ y: "^DFMGI", l: "DFM" }, { y: "^ADI", l: "ADX" }]
      : data.region === "PH"
      ? [{ y: "PSEI.PS", l: "PSEi" }, { y: "^PSI", l: "PSE ALL" }]
      : [{ y: "^NSEI",  l: "NIFTY" }, { y: "^BSESN", l: "SENSEX" }];
    const results = await Promise.all(symbols.map(async s => {
      const q = await fetchYahooQuote(s.y);
      if (!q) return null;
      return { symbol: s.y, label: s.l, price: q.price, changePct: q.prev ? ((q.price - q.prev) / q.prev) * 100 : 0 } satisfies TopBarIndex;
    }));
    return results.filter((r): r is TopBarIndex => r !== null);
  });

// ============ NEWS ============

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&amp;/g, "&");
}

function parseRss(xml: string, sourceFallback = ""): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/g;
  const tag = (block: string, t: string) => {
    const m = block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
    if (!m) return "";
    return m[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
  };
  const attr = (block: string, t: string, a: string) => {
    const m = block.match(new RegExp(`<${t}[^>]*${a}="([^"]+)"`, "i"));
    return m ? m[1] : "";
  };
  const matches = xml.match(itemRe) ?? [];
  for (const block of matches) {
    const title = decodeEntities(tag(block, "title"));
    const link = tag(block, "link") || attr(block, "link", "href");
    const pubDate = tag(block, "pubDate") || tag(block, "updated");
    const source = decodeEntities(tag(block, "source")) || sourceFallback;
    // Decode entities FIRST so we can strip the HTML inside (Google News encodes
    // <a href=...> as &lt;a href=...&gt;), then strip tags, then trim.
    const descDecoded = decodeEntities(tag(block, "description") || tag(block, "summary"));
    const imgMatch =
      descDecoded.match(/<img[^>]+src="([^"]+)"/i) ||
      block.match(/<media:content[^>]+url="([^"]+)"/i) ||
      block.match(/<enclosure[^>]+url="([^"]+)"/i);
    const description = descDecoded
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 240);
    if (title && link) {
      items.push({
        title,
        link,
        source,
        pubDate,
        image: imgMatch ? imgMatch[1] : undefined,
        description,
      });
    }
  }
  return items;
}

type FeedCat = "markets" | "india" | "macro" | "global";
const FEEDS_BY_REGION: Record<"IN" | "AE", Record<FeedCat, { url: string; source: string }[]>> = {
  IN: {
    markets: [{ url: "https://news.google.com/rss/search?q=indian+stock+market+nifty+sensex+when:1d&hl=en-IN&gl=IN&ceid=IN:en", source: "Google News" }],
    india:   [{ url: "https://news.google.com/rss/search?q=india+economy+business+rbi+when:1d&hl=en-IN&gl=IN&ceid=IN:en", source: "Google News" }],
    macro:   [{ url: "https://news.google.com/rss/search?q=federal+reserve+inflation+interest+rates+bond+yields+when:1d&hl=en-US&gl=US&ceid=US:en", source: "Google News" }],
    global:  [{ url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en", source: "Google News" }],
  },
  AE: {
    markets: [{ url: "https://news.google.com/rss/search?q=DFM+ADX+UAE+stock+market+when:1d&hl=en-AE&gl=AE&ceid=AE:en", source: "Google News" }],
    india:   [{ url: "https://news.google.com/rss/search?q=UAE+economy+business+central+bank+when:1d&hl=en-AE&gl=AE&ceid=AE:en", source: "Google News" }],
    macro:   [{ url: "https://news.google.com/rss/search?q=oil+prices+OPEC+GCC+sukuk+when:1d&hl=en-US&gl=US&ceid=US:en", source: "Google News" }],
    global:  [{ url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en", source: "Google News" }],
  },
};

export const getNews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const cat = (d as any)?.category as string;
    const region = (d as any)?.region === "AE" ? "AE" : "IN";
    if (!["markets", "india", "macro", "global"].includes(cat)) throw new Error("invalid category");
    return { category: cat as FeedCat, region: region as "IN" | "AE" };
  })
  .handler(async ({ data }) => {
    const feeds = FEEDS_BY_REGION[data.region][data.category];
    const all: NewsItem[] = [];
    await Promise.all(
      feeds.map(async (f) => {
        try {
          const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!r.ok) return;
          const xml = await r.text();
          all.push(...parseRss(xml, f.source));
        } catch { /* ignore */ }
      }),
    );
    const seen = new Set<string>();
    const out: NewsItem[] = [];
    for (const it of all) {
      const k = it.title.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(it);
    }
    out.sort((a, b) => new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime());
    return out.slice(0, 30);
  });
