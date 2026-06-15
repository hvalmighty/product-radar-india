import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseECasPdf, type Holding, type PortfolioParseResult } from "@/lib/ecas-parser";
import { Upload, FileText, Lock, X, ArrowLeft, PieChart, TrendingUp, AlertCircle, Loader2, Download, Search, Save, FolderOpen, Trash2 } from "lucide-react";
import kfintechLogo from "@/assets/kfintech.png.asset.json";

const STORAGE_KEY = "mpower.savedPortfolios.v1";
type SavedPortfolio = { id: string; name: string; savedAt: number; data: PortfolioParseResult };

function loadSaved(): SavedPortfolio[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function writeSaved(list: SavedPortfolio[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Portfolio Importer — eCAS (NSDL/CDSL) · mPower Wealth" },
      { name: "description", content: "Upload NSDL or CDSL consolidated account statements (eCAS) and review client portfolios with allocation analytics." },
    ],
  }),
  component: PortfolioImporter,
});

function fmtINR(n: number) {
  if (!n) return "₹0";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

const TYPE_COLORS: Record<string, string> = {
  Equity: "bg-mf",
  "Mutual Fund": "bg-fd",
  ETF: "bg-ins",
  Bond: "bg-positive",
  Other: "bg-muted-foreground",
};

function PortfolioImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [needsPwd, setNeedsPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<PortfolioParseResult | null>(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sortKey, setSortKey] = useState<keyof Holding>("value");
  const inputRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState<SavedPortfolio[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [savedToast, setSavedToast] = useState<string | null>(null);

  useEffect(() => { setSaved(loadSaved()); }, []);

  function saveCurrent() {
    if (!result) return;
    const name = (saveName.trim() || result.investor || file?.name?.replace(/\.pdf$/i, "") || "Portfolio").slice(0, 80);
    const entry: SavedPortfolio = { id: `${Date.now()}`, name, savedAt: Date.now(), data: result };
    const next = [entry, ...saved].slice(0, 50);
    setSaved(next); writeSaved(next); setSaveName("");
    setSavedToast(`Saved "${name}"`);
    setTimeout(() => setSavedToast(null), 2200);
  }
  function loadSavedItem(s: SavedPortfolio) {
    setResult(s.data); setFile(null); setErr(null); setNeedsPwd(false); setShowSaved(false);
  }
  function deleteSavedItem(id: string) {
    const next = saved.filter(s => s.id !== id);
    setSaved(next); writeSaved(next);
  }

  async function handleParse(f: File, pwd?: string) {
    setLoading(true);
    setErr(null);
    try {
      const res = await parseECasPdf(f, pwd);
      setResult(res);
      setNeedsPwd(false);
      if (res.holdings.length === 0) {
        setErr("Parsed the PDF but couldn't recognise any holdings. This looks like a transaction statement or an unusual layout — try a holdings/CAS PDF.");
      }
    } catch (e: any) {
      console.error("[portfolio] parse error", e);
      const msg = String(e?.message || e);
      const name = String(e?.name || "");
      if (name === "PasswordException" || /password/i.test(msg)) {
        setNeedsPwd(true);
        if (pwd) {
          setErr("Incorrect password. NSDL eCAS = PAN (uppercase) + DOB DDMMYYYY. CDSL CAS = PAN (uppercase). KFintech/CAMS = the password emailed with the statement.");
        }
      } else {
        setErr(`Failed to parse PDF: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  }

  function onFile(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setResult(null);
    setPassword("");
    setNeedsPwd(false);
    handleParse(f);
  }

  function reset() {
    setFile(null); setResult(null); setPassword(""); setNeedsPwd(false); setErr(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const filtered = useMemo(() => {
    if (!result) return [];
    let h = result.holdings;
    if (typeFilter !== "All") h = h.filter(x => x.type === typeFilter);
    if (query) {
      const q = query.toLowerCase();
      h = h.filter(x => x.name.toLowerCase().includes(q) || x.isin.toLowerCase().includes(q));
    }
    return [...h].sort((a, b) => {
      const av = a[sortKey] as any, bv = b[sortKey] as any;
      if (typeof av === "number") return bv - av;
      return String(av).localeCompare(String(bv));
    });
  }, [result, query, typeFilter, sortKey]);

  const allocation = useMemo(() => {
    if (!result) return [];
    const m = new Map<string, number>();
    for (const h of result.holdings) m.set(h.type, (m.get(h.type) || 0) + h.value);
    const total = result.totalValue || 1;
    return [...m.entries()].map(([type, v]) => ({ type, value: v, pct: (v / total) * 100 }))
      .sort((a, b) => b.value - a.value);
  }, [result]);

  const topHoldings = useMemo(() => {
    if (!result) return [];
    return [...result.holdings].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [result]);

  function exportCsv() {
    if (!result) return;
    const rows = [["ISIN", "Name", "Type", "Quantity", "Price", "Value", "Source"]];
    for (const h of result.holdings) {
      rows.push([h.isin, `"${h.name.replace(/"/g, "'")}"`, h.type, String(h.quantity), String(h.price), String(h.value), h.source]);
    }
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `portfolio-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
        <div className="px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-3">
            <img src={kfintechLogo.url} alt="KFintech" className="h-8 w-auto object-contain" />
            <div className="h-8 w-px bg-border" />
            <div>
              <h1 className="text-sm font-semibold leading-tight">mPower Wealth · Portfolio</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">eCAS Importer · NSDL / CDSL</p>
            </div>
          </div>
          <button onClick={() => setShowSaved(s => !s)} className="ml-auto text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 px-2 py-1 border border-border rounded-sm">
            <FolderOpen className="w-3.5 h-3.5" /> Saved ({saved.length})
          </button>
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Research
          </Link>
        </div>
      </header>

      <main className="px-6 py-6 max-w-[1400px] mx-auto">
        {!result && (
          <section className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold tracking-tight">Import client portfolio</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a Consolidated Account Statement (eCAS) PDF from NSDL or CDSL. Parsing happens entirely in your browser — nothing is uploaded.
              </p>
            </div>

            <label
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
              className="block border-2 border-dashed border-border rounded-md p-10 text-center cursor-pointer hover:border-foreground/40 hover:bg-secondary/40 transition-colors"
            >
              <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
              <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">Drop eCAS PDF here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">Supports NSDL CAS · CDSL CAS · password-protected files</p>
            </label>

            {file && (
              <div className="mt-4 flex items-center gap-3 p-3 border border-border rounded-md bg-surface">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 text-xs">
                  <div className="font-medium truncate">{file.name}</div>
                  <div className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                <button onClick={reset} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
            )}

            {needsPwd && (
              <form
                onSubmit={e => { e.preventDefault(); if (file) handleParse(file, password); }}
                className="mt-4 p-5 border-2 border-amber-500/60 rounded-md bg-amber-500/10"
              >
                <div className="flex items-center gap-2 text-sm font-semibold mb-1"><Lock className="w-4 h-4" /> This PDF is password-protected</div>
                <p className="text-xs text-muted-foreground mb-3">
                  Enter the statement password to unlock and parse. NSDL eCAS uses <span className="mono-num">PAN + DDMMYYYY</span>. CDSL CAS uses <span className="mono-num">PAN</span> (uppercase). KFintech / CAMS statements use the password emailed with the file.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter PDF password"
                    className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-sm focus:outline-none focus:border-foreground/50 mono-num"
                  />
                  <button type="submit" disabled={!password || loading} className="px-4 py-2 text-xs font-semibold bg-foreground text-background rounded-sm disabled:opacity-50">
                    {loading ? "Unlocking…" : "Unlock & parse"}
                  </button>
                </div>
              </form>
            )}

            {err && (
              <div className="mt-4 p-3 border border-destructive/40 bg-destructive/10 rounded-md text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
                <span>{err}</span>
              </div>
            )}

            <div className="mt-8 text-[11px] text-muted-foreground space-y-1">
              <p><strong>Tip:</strong> NSDL eCAS password is usually your PAN (uppercase) + DOB (DDMMYYYY) with no spaces. CDSL CAS password is typically PAN (uppercase).</p>
              <p>All parsing happens locally in this browser session. No data is sent to any server.</p>
            </div>
          </section>
        )}

        {result && (
          <section className="space-y-6">
            {/* Summary header */}
            <div className="flex flex-wrap items-end gap-6 pb-4 border-b border-border">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Investor</div>
                <div className="text-lg font-semibold">{result.investor || "—"}</div>
                <div className="text-xs text-muted-foreground mono-num mt-0.5">
                  {result.pan || "PAN —"} · {result.source} · {result.asOf ? `as of ${result.asOf}` : "—"}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6 ml-auto">
                <Stat label="Total Value" value={fmtINR(result.totalValue)} />
                <Stat label="Holdings" value={String(result.holdings.length)} />
                <Stat label="Asset Classes" value={String(allocation.length)} />
              </div>
              <div className="flex gap-2 items-center">
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder={result.investor || "Portfolio name"}
                  className="px-2 py-1.5 text-xs border border-border rounded-sm bg-background w-40 focus:outline-none focus:border-foreground/50"
                />
                <button onClick={saveCurrent} className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-secondary inline-flex items-center gap-1.5 bg-foreground text-background">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={exportCsv} className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-secondary inline-flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <button onClick={reset} className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-secondary">New Import</button>
              </div>
            </div>
            {savedToast && (
              <div className="text-xs px-3 py-2 border border-positive/40 bg-positive/10 rounded-sm inline-block">{savedToast}</div>
            )}

            {/* Allocation + Top */}
            <div className="grid lg:grid-cols-2 gap-6">
              <Card title="Asset Allocation" icon={<PieChart className="w-3.5 h-3.5" />}>
                <div className="space-y-3">
                  <div className="flex h-2 rounded-sm overflow-hidden">
                    {allocation.map(a => (
                      <div key={a.type} className={TYPE_COLORS[a.type] || "bg-muted-foreground"} style={{ width: `${a.pct}%` }} title={`${a.type} ${a.pct.toFixed(1)}%`} />
                    ))}
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {allocation.map(a => (
                        <tr key={a.type} className="border-t border-border/50">
                          <td className="py-2"><span className={`inline-block w-2 h-2 rounded-full mr-2 ${TYPE_COLORS[a.type] || "bg-muted-foreground"}`} />{a.type}</td>
                          <td className="py-2 text-right mono-num">{fmtINR(a.value)}</td>
                          <td className="py-2 text-right mono-num w-16">{a.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Top 5 Holdings" icon={<TrendingUp className="w-3.5 h-3.5" />}>
                <table className="w-full text-xs">
                  <tbody>
                    {topHoldings.map(h => {
                      const pct = (h.value / (result.totalValue || 1)) * 100;
                      return (
                        <tr key={h.isin} className="border-t border-border/50">
                          <td className="py-2">
                            <div className="font-medium truncate max-w-[260px]">{h.name}</div>
                            <div className="text-[10px] text-muted-foreground mono-num">{h.isin} · {h.type}</div>
                          </td>
                          <td className="py-2 text-right mono-num">{fmtINR(h.value)}</td>
                          <td className="py-2 text-right mono-num w-16">{pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </div>

            {/* Holdings table */}
            <Card title={`Holdings (${filtered.length})`}>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5 px-2 py-1 border border-border rounded-sm bg-background w-64">
                  <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name or ISIN" className="bg-transparent text-xs flex-1 focus:outline-none" />
                </div>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="text-xs px-2 py-1 border border-border rounded-sm bg-background">
                  {["All", ...Object.keys(TYPE_COLORS)].map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={sortKey} onChange={e => setSortKey(e.target.value as any)} className="text-xs px-2 py-1 border border-border rounded-sm bg-background ml-auto">
                  <option value="value">Sort: Value</option>
                  <option value="quantity">Sort: Quantity</option>
                  <option value="price">Sort: Price</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
              <div className="overflow-auto border border-border rounded-sm">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2">Security</th>
                      <th className="text-left px-3 py-2">ISIN</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-right px-3 py-2">Quantity</th>
                      <th className="text-right px-3 py-2">Price</th>
                      <th className="text-right px-3 py-2">Value</th>
                      <th className="text-right px-3 py-2">% PF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(h => {
                      const pct = (h.value / (result.totalValue || 1)) * 100;
                      return (
                        <tr key={h.isin + h.name} className="border-t border-border/50 hover:bg-secondary/30">
                          <td className="px-3 py-2 font-medium max-w-[320px] truncate">{h.name}</td>
                          <td className="px-3 py-2 mono-num text-muted-foreground">{h.isin}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${TYPE_COLORS[h.type] || "bg-muted-foreground"}`} />{h.type}
                          </td>
                          <td className="px-3 py-2 text-right mono-num">{h.quantity ? h.quantity.toLocaleString("en-IN", { maximumFractionDigits: 3 }) : "—"}</td>
                          <td className="px-3 py-2 text-right mono-num">{h.price ? h.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</td>
                          <td className="px-3 py-2 text-right mono-num font-medium">{fmtINR(h.value)}</td>
                          <td className="px-3 py-2 text-right mono-num text-muted-foreground">{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="text-center text-muted-foreground py-8">No holdings match filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {err && (
              <div className="p-3 border border-amber-500/40 bg-amber-500/10 rounded-md text-xs flex gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /><span>{err}</span>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mono-num">{value}</div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md bg-surface">
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}{title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
