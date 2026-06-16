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
    return pairs
      .map((p) => {
        const t = byPair.get(p.pair);
        if (!t) return null;
        const price = Number(t.lastPrice) || 0;
        const change = Number(t.priceChange) || 0;
        const pct = Number(t.priceChangePercent) || 0;
        return {
          symbol: p.symbol,
          name: p.name,
          price,
          change,
          changePct: pct,
          currency: "USD",
          group: "crypto" as const,
        } satisfies Quote;
      })
      .filter((x): x is Quote => x !== null);
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

export const getMarketQuotes = createServerFn({ method: "GET" }).handler(
  async () => {
    const [india, crypto, fx] = await Promise.all([
      fetchNseIndices(),
      fetchCrypto(),
      fetchFx(),
    ]);
    return [...india, ...crypto, ...fx];
  },
);

// ============ NEWS ============

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
    const title = tag(block, "title");
    const link = tag(block, "link") || attr(block, "link", "href");
    const pubDate = tag(block, "pubDate") || tag(block, "updated");
    const source = tag(block, "source") || sourceFallback;
    const descRaw = tag(block, "description") || tag(block, "summary");
    const imgMatch =
      descRaw.match(/<img[^>]+src="([^"]+)"/i) ||
      block.match(/<media:content[^>]+url="([^"]+)"/i) ||
      block.match(/<enclosure[^>]+url="([^"]+)"/i);
    const description = descRaw
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()
      .slice(0, 240);
    if (title && link) {
      items.push({
        title: title
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'"),
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

const FEEDS: Record<string, { url: string; source: string }[]> = {
  markets: [
    {
      url: "https://news.google.com/rss/search?q=indian+stock+market+nifty+sensex+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
      source: "Google News",
    },
  ],
  india: [
    {
      url: "https://news.google.com/rss/search?q=india+economy+business+rbi+when:1d&hl=en-IN&gl=IN&ceid=IN:en",
      source: "Google News",
    },
  ],
  macro: [
    {
      url: "https://news.google.com/rss/search?q=federal+reserve+inflation+interest+rates+bond+yields+when:1d&hl=en-US&gl=US&ceid=US:en",
      source: "Google News",
    },
  ],
  global: [
    {
      url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en",
      source: "Google News",
    },
  ],
};

export const getNews = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const cat = (d as any)?.category as string;
    if (!(cat in FEEDS)) throw new Error("invalid category");
    return { category: cat as keyof typeof FEEDS };
  })
  .handler(async ({ data }) => {
    const feeds = FEEDS[data.category];
    const all: NewsItem[] = [];
    await Promise.all(
      feeds.map(async (f) => {
        try {
          const r = await fetch(f.url, { headers: { "User-Agent": "Mozilla/5.0" } });
          if (!r.ok) return;
          const xml = await r.text();
          all.push(...parseRss(xml, f.source));
        } catch {
          /* ignore */
        }
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
    out.sort(
      (a, b) =>
        new Date(b.pubDate || 0).getTime() - new Date(a.pubDate || 0).getTime(),
    );
    return out.slice(0, 30);
  });
