import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  getMarketQuotes,
  getNews,
  type Quote,
  type NewsItem,
} from "@/lib/market-data.functions";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Globe,
  Newspaper,
  Building2,
  LineChart,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import kfintechLogo from "@/assets/kfintech.png.asset.json";

export const Route = createFileRoute("/market-data")({
  head: () => ({
    meta: [
      { title: "Market Data & News — mPower Wealth" },
      {
        name: "description",
        content:
          "Live market data, India business news, macro updates and global events — all in one institutional terminal view.",
      },
    ],
  }),
  component: MarketDataPage,
});

const GROUPS: { key: Quote["group"]; label: string }[] = [
  { key: "india", label: "India Benchmark Indices" },
  { key: "sector", label: "India Sector Indices" },
  { key: "fx", label: "Currencies (USD base)" },
  { key: "crypto", label: "Crypto" },
];

const NEWS_TABS = [
  { key: "markets", label: "Market News", icon: LineChart },
  { key: "india", label: "India", icon: Building2 },
  { key: "macro", label: "Macro", icon: TrendingUp },
  { key: "global", label: "Global Events", icon: Globe },
] as const;

function fmtNum(n: number, d = 2) {
  return n.toLocaleString("en-IN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function timeAgo(iso: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!t) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Sparkline({ data, positive }: { data?: number[]; positive: boolean }) {
  if (!data || data.length < 2) return <div className="h-8" />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const color = positive ? "hsl(var(--positive))" : "hsl(var(--negative))";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g-${positive}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.4" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#g-${positive})`} />
    </svg>
  );
}

function QuoteCard({ q }: { q: Quote }) {
  const pos = q.changePct >= 0;
  return (
    <div className="rounded-md border border-border bg-surface/60 hover:border-primary/40 transition-colors p-3 flex flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
            {q.name}
          </div>
          <div className="text-[10px] text-muted-foreground/70 mono-num">{q.symbol}</div>
        </div>
        <div
          className={`text-[10px] px-1.5 py-0.5 rounded mono-num flex items-center gap-0.5 ${
            pos ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
          }`}
        >
          {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {pos ? "+" : ""}
          {q.changePct.toFixed(2)}%
        </div>
      </div>
      <div className="text-lg font-semibold mono-num leading-tight">{fmtNum(q.price)}</div>
      <div className={`text-[11px] mono-num ${pos ? "text-positive" : "text-negative"}`}>
        {pos ? "+" : ""}
        {fmtNum(q.change)}
      </div>
      <Sparkline data={q.spark} positive={pos} />
    </div>
  );
}

function NewsCard({ n }: { n: NewsItem }) {
  return (
    <a
      href={n.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-md border border-border bg-surface/60 hover:border-primary/40 hover:bg-surface transition-colors p-3 flex gap-3"
    >
      {n.image ? (
        <img
          src={n.image}
          alt=""
          loading="lazy"
          className="w-20 h-20 object-cover rounded shrink-0 bg-muted"
          onError={(e) => ((e.currentTarget.style.display = "none"))}
        />
      ) : (
        <div className="w-20 h-20 rounded shrink-0 bg-gradient-to-br from-primary/15 to-accent/10 flex items-center justify-center">
          <Newspaper className="w-6 h-6 text-muted-foreground/60" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium leading-snug line-clamp-2 group-hover:text-primary">
          {n.title}
        </div>
        {n.description && (
          <div className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
            {n.description}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground uppercase tracking-wide">
          <span className="truncate max-w-[140px]">{n.source || "Source"}</span>
          <span className="opacity-50">·</span>
          <span>{timeAgo(n.pubDate)}</span>
          <ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100" />
        </div>
      </div>
    </a>
  );
}

function MarketDataPage() {
  const [tab, setTab] = useState<(typeof NEWS_TABS)[number]["key"]>("markets");

  const quotesQ = useQuery({
    queryKey: ["market-quotes"],
    queryFn: () => getMarketQuotes(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const newsQ = useQuery({
    queryKey: ["news", tab],
    queryFn: () => getNews({ data: { category: tab } }),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const quotes = quotesQ.data ?? [];
  const byGroup = (g: Quote["group"]) => quotes.filter((q) => q.group === g);

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={kfintechLogo.url} alt="KFintech" className="h-8 w-auto object-contain" />
            <div className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold leading-tight tracking-tight">Market Data</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-tight">
                Live quotes · News · Macro · Global
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs">
            <Link to="/" className="px-3 py-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 inline-flex items-center gap-1.5">
              <ArrowLeft className="w-3 h-3" /> Screener
            </Link>
            <Link to="/proposal" className="px-3 py-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60">Proposal</Link>
            <Link to="/portfolio" className="px-3 py-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60">Portfolios</Link>
            <span className="px-3 py-1.5 rounded-sm bg-secondary text-secondary-foreground">Market Data</span>
          </nav>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            <button
              onClick={() => { quotesQ.refetch(); newsQ.refetch(); }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border hover:border-primary/40 hover:text-foreground"
            >
              <RefreshCw className={`w-3 h-3 ${quotesQ.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <span className="hidden lg:inline">Auto-refresh: Quotes 60s · News 5m</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-5 space-y-6">
        {/* Quotes */}
        <section className="space-y-4">
          {GROUPS.map((g) => {
            const items = byKey(g.symbols);
            return (
              <div key={g.key}>
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    {g.label}
                  </h2>
                  <span className="text-[10px] text-muted-foreground/70">
                    {items.length} instruments
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
                  {quotesQ.isLoading
                    ? Array.from({ length: g.symbols.length }).map((_, i) => (
                        <div key={i} className="h-[120px] rounded-md border border-border bg-surface/40 animate-pulse" />
                      ))
                    : items.map((q) => <QuoteCard key={q.symbol} q={q} />)}
                </div>
              </div>
            );
          })}
          {quotesQ.isError && (
            <div className="text-[11px] text-negative">
              Live quotes feed temporarily unavailable. Retrying automatically.
            </div>
          )}
        </section>

        {/* News */}
        <section>
          <div className="flex items-center gap-1 border-b border-border mb-3">
            {NEWS_TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-3 py-2 text-xs font-medium tracking-wide border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                    active
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
            <div className="ml-auto text-[10px] text-muted-foreground pb-2">
              Source: Google News RSS · public headlines
            </div>
          </div>

          {newsQ.isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-[100px] rounded-md border border-border bg-surface/40 animate-pulse" />
              ))}
            </div>
          ) : newsQ.data && newsQ.data.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {newsQ.data.map((n) => (
                <NewsCard key={n.link} n={n} />
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No news available right now. Try refreshing in a moment.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
