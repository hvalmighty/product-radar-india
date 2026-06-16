import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  getCorporateActions,
  type AssetClass,
  type Exchange,
  type CorpAction,
} from "@/lib/corporate-actions.functions";
import { ArrowLeft, RefreshCw, Bell, AlertCircle, Calendar, Search } from "lucide-react";
import kfintechLogo from "@/assets/kfintech.png.asset.json";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — Corporate Actions NSE & BSE | mPower Wealth" },
      {
        name: "description",
        content:
          "Upcoming NSE & BSE corporate actions across Equity, Debt, REITs and InvITs — auto-refreshed every 2 hours.",
      },
    ],
  }),
  component: AlertsPage,
});

const ASSET_CLASSES: AssetClass[] = ["Equity", "Debt", "REIT", "InvIT"];
const EXCHANGES: Exchange[] = ["NSE", "BSE"];

const PRODUCTS: Record<AssetClass, string[]> = {
  Equity: ["Dividend", "Bonus", "Stock Split", "Rights", "Buyback", "AGM/EGM", "Other"],
  Debt: ["Interest Payment", "Redemption", "Coupon", "Other"],
  REIT: ["Distribution", "Other"],
  InvIT: ["Distribution", "Other"],
};

function classifyProduct(a: CorpAction): string {
  const p = a.purpose.toUpperCase();
  if (a.assetClass === "Equity") {
    if (p.includes("BONUS")) return "Bonus";
    if (p.includes("SPLIT") || p.includes("SUB-DIVISION") || p.includes("SUBDIVISION")) return "Stock Split";
    if (p.includes("RIGHT")) return "Rights";
    if (p.includes("BUY")) return "Buyback";
    if (p.includes("AGM") || p.includes("EGM") || p.includes("MEETING")) return "AGM/EGM";
    if (p.includes("DIVIDEND")) return "Dividend";
    return "Other";
  }
  if (a.assetClass === "Debt") {
    if (p.includes("REDEMPTION")) return "Redemption";
    if (p.includes("COUPON")) return "Coupon";
    if (p.includes("INTEREST")) return "Interest Payment";
    return "Other";
  }
  if (p.includes("DISTRIBUTION") || p.includes("DIVIDEND") || p.includes("INCOME"))
    return "Distribution";
  return "Other";
}

function fmtDate(s: string) {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function daysFromNow(s: string) {
  const d = new Date(s).getTime();
  if (!d) return 0;
  return Math.ceil((d - Date.now()) / 86400000);
}

const ASSET_TONE: Record<AssetClass, string> = {
  Equity: "bg-positive/10 text-positive border-positive/30",
  Debt: "bg-mf/10 text-mf border-mf/30",
  REIT: "bg-aif/10 text-aif border-aif/30",
  InvIT: "bg-ins/10 text-ins border-ins/30",
};

const EX_TONE: Record<Exchange, string> = {
  NSE: "bg-secondary text-foreground border-border",
  BSE: "bg-muted/40 text-foreground border-border",
};

function AlertsPage() {
  const [assetClass, setAssetClass] = useState<AssetClass>("Equity");
  const [exchange, setExchange] = useState<"All" | Exchange>("All");
  const [product, setProduct] = useState<string>("All");
  const [query, setQuery] = useState("");

  const { data, isLoading, isFetching, refetch, error, dataUpdatedAt } = useQuery({
    queryKey: ["corporate-actions"],
    queryFn: () => getCorporateActions(),
    staleTime: 2 * 60 * 60 * 1000,        // 2 hours
    refetchInterval: 2 * 60 * 60 * 1000,  // auto refresh every 2 hours
    refetchOnWindowFocus: false,
  });

  const allActions: CorpAction[] = (data?.actions ?? []) as CorpAction[];

  const byAsset = useMemo(() => {
    const m: Record<AssetClass, CorpAction[]> = { Equity: [], Debt: [], REIT: [], InvIT: [] };
    for (const a of allActions) m[a.assetClass].push(a);
    return m;
  }, [allActions]);

  const visible = useMemo(() => {
    let list = byAsset[assetClass];
    if (exchange !== "All") list = list.filter((a) => a.exchange === exchange);
    if (product !== "All") list = list.filter((a) => classifyProduct(a) === product);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.symbol.toLowerCase().includes(q) ||
          a.company.toLowerCase().includes(q) ||
          a.purpose.toLowerCase().includes(q),
      );
    }
    return list;
  }, [byAsset, assetClass, exchange, product, query]);

  // group by product within current asset class
  const grouped = useMemo(() => {
    const groups: Record<string, CorpAction[]> = {};
    for (const a of visible) {
      const p = classifyProduct(a);
      (groups[p] ||= []).push(a);
    }
    return groups;
  }, [visible]);

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="px-6 py-3 flex items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={kfintechLogo.url} alt="KFintech" className="h-8 w-auto object-contain" />
            <div className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold leading-tight tracking-tight">mPower Wealth</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground leading-tight">
                Alerts · Corporate Actions
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1 text-xs ml-2">
            <Link to="/" className="px-3 py-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60">
              <ArrowLeft className="w-3 h-3 inline mr-1" /> Back to Screener
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isFetching ? "bg-warning animate-pulse" : "bg-positive"}`} />
              {data?.source === "sample" ? "Sample data" : "Live · NSE+BSE"}
            </span>
            {dataUpdatedAt > 0 && (
              <span>Updated {new Date(dataUpdatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            )}
            <span>· Auto-refresh every 2h</span>
            <button
              onClick={() => refetch()}
              className="ml-2 px-2 py-1 border border-border rounded-sm hover:bg-secondary/60 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Asset class tabs */}
        <div className="px-6 flex items-end gap-1 border-t border-border/60">
          {ASSET_CLASSES.map((c) => {
            const count = byAsset[c]?.length ?? 0;
            const active = c === assetClass;
            return (
              <button
                key={c}
                onClick={() => { setAssetClass(c); setProduct("All"); }}
                className={`px-4 py-2.5 text-xs font-medium tracking-wide border-b-2 -mb-px transition-colors flex items-center gap-2 ${
                  active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className="w-3 h-3" />
                {c.toUpperCase()}
                <span className="text-[10px] opacity-60 mono-num">[{count}]</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-6 py-5 space-y-5">
        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search symbol, company or purpose…"
              className="w-full pl-8 pr-8 py-1.5 text-xs bg-surface border border-border rounded-sm focus:outline-none focus:border-foreground/40"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Showing last 45 days + upcoming · {visible.length} action{visible.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground uppercase tracking-wider text-[10px]">Exchange</span>
          {(["All", ...EXCHANGES] as const).map((e) => (
            <button
              key={e}
              onClick={() => setExchange(e)}
              className={`px-2.5 py-1 rounded-sm border ${exchange === e ? "bg-secondary border-foreground/40" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {e}
            </button>
          ))}
          <span className="text-muted-foreground uppercase tracking-wider text-[10px] ml-3">Product</span>
          {(["All", ...PRODUCTS[assetClass]] as const).map((p) => (
            <button
              key={p}
              onClick={() => setProduct(p)}
              className={`px-2.5 py-1 rounded-sm border ${product === p ? "bg-secondary border-foreground/40" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>


        {error && (
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 rounded-sm">
            <AlertCircle className="w-4 h-4" /> Failed to load corporate actions.
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-12 text-center">Loading corporate actions…</div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center border border-dashed border-border rounded-sm">
            No upcoming corporate actions for these filters.
          </div>
        ) : (
          Object.entries(grouped).map(([prod, items]) => (
            <section key={prod} className="border border-border rounded-sm bg-surface/40">
              <header className="px-4 py-2 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] border rounded-sm ${ASSET_TONE[assetClass]}`}>{assetClass}</span>
                  <h2 className="text-xs font-semibold uppercase tracking-wider">{prod}</h2>
                </div>
                <span className="text-[10px] text-muted-foreground mono-num">{items.length}</span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40 text-muted-foreground uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Exchange</th>
                      <th className="text-left px-3 py-2 font-medium">Symbol</th>
                      <th className="text-left px-3 py-2 font-medium">Company</th>
                      <th className="text-left px-3 py-2 font-medium">Purpose</th>
                      <th className="text-left px-3 py-2 font-medium">Ex-Date</th>
                      <th className="text-left px-3 py-2 font-medium">Record Date</th>
                      <th className="text-right px-3 py-2 font-medium">Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a, i) => {
                      const days = daysFromNow(a.exDate);
                      return (
                        <tr key={`${a.exchange}-${a.symbol}-${a.exDate}-${i}`} className="border-t border-border/60 hover:bg-secondary/30">
                          <td className="px-3 py-2">
                            <span className={`px-1.5 py-0.5 text-[10px] border rounded-sm ${EX_TONE[a.exchange]}`}>{a.exchange}</span>
                          </td>
                          <td className="px-3 py-2 font-medium mono-num">{a.symbol}</td>
                          <td className="px-3 py-2 text-muted-foreground">{a.company}</td>
                          <td className="px-3 py-2">{a.purpose}{a.details ? <span className="text-muted-foreground"> · {a.details}</span> : null}</td>
                          <td className="px-3 py-2 mono-num flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 opacity-60" />{fmtDate(a.exDate)}
                          </td>
                          <td className="px-3 py-2 mono-num text-muted-foreground">{a.recordDate ? fmtDate(a.recordDate) : "—"}</td>
                          <td className="px-3 py-2 text-right mono-num">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${days < 0 ? "bg-muted/40 text-muted-foreground" : days <= 2 ? "bg-destructive/15 text-destructive" : days <= 7 ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground"}`}>
                              {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? "Today" : `T+${days}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
