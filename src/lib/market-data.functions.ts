import { createServerFn } from "@tanstack/react-start";

const UA = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  Accept: "*/*",
};

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  currency?: string;
  spark?: number[];
};

export type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  image?: string;
  description?: string;
};

const INDEX_SYMBOLS: Record<string, string> = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX",
  "^NSEBANK": "BANK NIFTY",
  "NIFTY_MIDCAP_100.NS": "NIFTY MIDCAP 100",
  "^GSPC": "S&P 500",
  "^IXIC": "NASDAQ",
  "^DJI": "DOW JONES",
  "^FTSE": "FTSE 100",
  "^N225": "NIKKEI 225",
  "^HSI": "HANG SENG",
  "INR=X": "USD/INR",
  "GC=F": "GOLD (USD/oz)",
  "SI=F": "SILVER (USD/oz)",
  "CL=F": "CRUDE OIL (WTI)",
  "BTC-USD": "BITCOIN",
  "ETH-USD": "ETHEREUM",
};

async function fetchYahooChart(symbol: string): Promise<Quote | null> {
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol,
      )}?range=1d&interval=15m`,
      { headers: UA },
    );
    if (!r.ok) {
      console.error(`[yahoo] ${symbol} HTTP ${r.status}`);
      return null;
    }
    const j: any = await r.json();
    const res = j?.chart?.result?.[0];
    if (!res) {
      console.error(`[yahoo] ${symbol} no result: ${JSON.stringify(j).slice(0, 200)}`);
      return null;
    }
    const meta = res.meta;
    const closes: number[] = (res.indicators?.quote?.[0]?.close ?? []).filter(
      (x: any) => typeof x === "number",
    );
    const price = meta.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prev;
    const changePct = prev ? (change / prev) * 100 : 0;
    return {
      symbol,
      name: INDEX_SYMBOLS[symbol] ?? symbol,
      price,
      change,
      changePct,
      currency: meta.currency,
      spark: closes.slice(-40),
    };
  } catch (e) {
    console.error(`[yahoo] ${symbol} threw`, e);
    return null;
  }
}

export const getMarketQuotes = createServerFn({ method: "GET" }).handler(
  async () => {
    const symbols = Object.keys(INDEX_SYMBOLS);
    const results = await Promise.all(symbols.map(fetchYahooChart));
    return results.filter((x): x is Quote => !!x);
  },
);

// Lightweight RSS parser (no deps, server-side only)
function parseRss(xml: string, sourceFallback = ""): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/g;
  const tag = (block: string, t: string) => {
    const m = block.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, "i"));
    if (!m) return "";
    return m[1]
      .replace(/<!\[CDATA\[/g, "")
      .replace(/\]\]>/g, "")
      .trim();
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
          const r = await fetch(f.url, { headers: UA });
          if (!r.ok) return;
          const xml = await r.text();
          all.push(...parseRss(xml, f.source));
        } catch {
          /* ignore */
        }
      }),
    );
    // dedupe by title
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
