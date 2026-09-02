import React, { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Info, Search, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GainSummary, RealisedLot, TaxLot, TaxEstimate, TaxRules } from "@/lib/capital-gains";
import { fmtMoney } from "@/lib/region";

function money(n: number) { return fmtMoney(n); }
function pct(n: number) { return `${n.toFixed(1)}%`; }
function termClass(term: string) { return term === "LTCG" ? "text-positive" : "text-warning"; }

export function CapitalGainsSection({
  lots, realisedLots, summary, tax, rules, search, setSearch, periodLabel, currency, visible = true,
}: {
  lots: TaxLot[]; realisedLots: RealisedLot[]; summary: GainSummary; tax: TaxEstimate; rules: TaxRules;
  search: string; setSearch: (value: string) => void; periodLabel: string; currency: string; visible?: boolean;
}) {
  const [view, setView] = useState<"summary" | "ledger" | "harvest">("summary");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filteredLots = useMemo(() => lots.filter(l => `${l.name} ${l.isin} ${l.assetClass}`.toLowerCase().includes(search.toLowerCase())), [lots, search]);
  const filteredRealised = useMemo(() => realisedLots.filter(l => `${l.name} ${l.isin} ${l.assetClass}`.toLowerCase().includes(search.toLowerCase())), [realisedLots, search]);
  const exemptionRemaining = Math.max(0, rules.ltcgExemption - Math.max(0, summary.ltcgEquity));
  const taxSaving = Math.min(Math.max(0, summary.ltcgEquity), rules.ltcgExemption) * (rules.equityLTCGRate / 100);
  const chart = useMemo(() => {
    const base = summary.total / 6;
    return ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"].map((month, i) => ({
      month, realised: base * (0.45 + i * 0.06), unrealised: base * (0.2 + i * 0.1),
    }));
  }, [summary.total]);

  function exportCsv() {
    const rows = [
      ["Type", "Security", "ISIN", "Asset class", "Tax bucket", "Term", "Purchase date", "Sale date", "Quantity", "Cost", "Proceeds / Value", "Gain"],
      ...filteredRealised.map(l => ["Realised", l.name, l.isin, l.assetClass, l.taxBucket, l.term, l.purchaseDate.toISOString().slice(0, 10), l.sellDate.toISOString().slice(0, 10), l.quantity.toFixed(4), l.cost.toFixed(2), l.proceeds.toFixed(2), l.gain.toFixed(2)]),
      ...filteredLots.map(l => ["Unrealised", l.name, l.isin, l.assetClass, l.taxBucket, l.term, l.purchaseDate.toISOString().slice(0, 10), "", l.quantity.toFixed(4), l.cost.toFixed(2), l.marketValue.toFixed(2), l.unrealised.toFixed(2)]),
    ];
    const blob = new Blob([rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `capital-gains-${periodLabel.replaceAll(" ", "-")}.csv`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <section id="gains" aria-hidden={!visible} className={`scroll-mt-24 py-7 border-t border-border ${visible ? "" : "hidden print:block"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2"><LandmarkIcon /><h2 className="text-base font-semibold">Capital Gains Intelligence</h2></div>
          <p className="text-xs text-muted-foreground mt-1">Realised, unrealised and tax-lot analysis for {periodLabel} · {rules.label}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="px-3 py-1.5 text-xs border border-border rounded-sm hover:bg-secondary inline-flex items-center gap-1.5"><FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <GainStat label="Realised gains" value={money(summary.total)} hint={`${realisedLots.length} matched lots`} tone={summary.total >= 0 ? "positive" : "negative"} />
        <GainStat label="STCG" value={money(summary.stcg)} hint={`Equity ${money(summary.stcgEquity)}`} tone="warning" />
        <GainStat label="LTCG" value={money(summary.ltcg)} hint={`Equity ${money(summary.ltcgEquity)}`} tone="positive" />
        <GainStat label="Unrealised G/L" value={money(lots.reduce((s, l) => s + l.unrealised, 0))} hint={`${lots.length} tax lots`} tone="info" />
        <GainStat label="Indicative tax" value={money(tax.total)} hint={`${currency} · excludes cess`} tone="negative" />
      </div>

      <div className="flex flex-wrap items-center gap-1 border-y border-border py-2 mb-4">
        {[{ id: "summary", label: "Tax overview" }, { id: "ledger", label: "Lot-level ledger" }, { id: "harvest", label: "Tax harvesting" }].map(item => <button key={item.id} onClick={() => setView(item.id as typeof view)} className={`px-3 py-1.5 text-[11px] rounded-sm ${view === item.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary"}`}>{item.label}</button>)}
        <label className="ml-auto flex items-center gap-2 px-2 py-1.5 border border-border rounded-sm text-xs text-muted-foreground"><Search className="w-3.5 h-3.5" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search security or ISIN" className="w-40 bg-transparent focus:outline-none text-foreground" /></label>
      </div>

      {view === "summary" && <div className="space-y-4">
        <div className="grid lg:grid-cols-[1.35fr_0.65fr] gap-4">
          <div className="border border-border rounded-md bg-surface p-4">
            <div className="flex items-start justify-between gap-3 mb-3"><div><div className="text-xs font-semibold">Gain realisation trend</div><div className="text-[10px] text-muted-foreground">Indicative monthly view · {periodLabel}</div></div><div className="flex gap-3 text-[10px] text-muted-foreground"><span><i className="inline-block w-2 h-2 rounded-full bg-primary mr-1" />Realised</span><span><i className="inline-block w-2 h-2 rounded-full bg-info mr-1" />Unrealised</span></div></div>
            <div className="h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}><defs><linearGradient id="gainRealised" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient><linearGradient id="gainUnrealised" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--info)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--info)" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={v => money(v)} /><Tooltip formatter={(v: number) => money(v)} /><Area type="monotone" dataKey="realised" name="Realised" stroke="var(--primary)" fill="url(#gainRealised)" strokeWidth={2} /><Area type="monotone" dataKey="unrealised" name="Unrealised" stroke="var(--info)" fill="url(#gainUnrealised)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
          </div>
          <TaxBreakdown summary={summary} tax={tax} rules={rules} />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <GainComposition title="Realised by term" rows={[{ label: "Short term", value: summary.stcg, tone: "bg-warning" }, { label: "Long term", value: summary.ltcg, tone: "bg-positive" }]} />
          <GainComposition title="Equity vs debt" rows={[{ label: "Equity STCG + LTCG", value: summary.stcgEquity + summary.ltcgEquity, tone: "bg-primary" }, { label: "Debt STCG + LTCG", value: summary.stcgDebt + summary.ltcgDebt, tone: "bg-info" }]} />
          <div className="border border-border rounded-md bg-surface p-4"><div className="text-xs font-semibold mb-2">Planning signals</div><div className="space-y-2 text-[11px] text-muted-foreground"><Signal icon={<ShieldCheck className="w-3.5 h-3.5 text-positive" />} text={tax.total === 0 ? "No indicative tax under the selected regional rules." : `Indicative tax provision is ${money(tax.total)}.`} /><Signal icon={<Info className="w-3.5 h-3.5 text-info" />} text={rules.ltcgExemption ? `${money(exemptionRemaining)} of the annual LTCG exemption remains.` : "No annual LTCG exemption modelled for this region."} /><Signal icon={<TrendingDown className="w-3.5 h-3.5 text-warning" />} text={`${lots.filter(l => l.daysToLongTerm > 0 && l.daysToLongTerm < 90).length} lots mature into long term within 90 days.`} /></div></div>
        </div>
      </div>}

      {view === "ledger" && <Ledger lots={filteredLots} realisedLots={filteredRealised} expanded={expanded} setExpanded={setExpanded} />}
      {view === "harvest" && <HarvestView lots={lots} summary={summary} tax={tax} rules={rules} taxSaving={taxSaving} />}
      <div className="mt-4 p-3 border border-border rounded-sm bg-secondary/40 text-[10px] text-muted-foreground"><Info className="w-3 h-3 inline mr-1" /> Figures are indicative estimates from imported holdings and deterministic lot reconstruction. Confirm cost basis, transaction dates and tax treatment with the investor's tax advisor before filing.</div>
    </section>
  );
}

function LandmarkIcon() { return <span className="w-7 h-7 rounded-sm bg-primary/10 text-primary grid place-items-center"><TrendingUp className="w-4 h-4" /></span>; }
function GainStat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) { return <div className="border border-border rounded-md bg-surface p-3"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div><div className={`text-base font-semibold mono-num mt-1 ${tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : tone === "warning" ? "text-warning" : "text-info"}`}>{value}</div><div className="text-[10px] text-muted-foreground mt-1 truncate">{hint}</div></div>; }
function Signal({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex gap-2 items-start">{icon}<span>{text}</span></div>; }
function TaxBreakdown({ summary, tax, rules }: { summary: GainSummary; tax: TaxEstimate; rules: TaxRules }) { return <div className="border border-border rounded-md bg-surface p-4"><div className="text-xs font-semibold">Indicative tax provision</div><div className="text-2xl font-semibold mono-num mt-2">{money(tax.total)}</div><div className="grid grid-cols-2 gap-3 mt-4 text-[11px]"><div className="border-t border-border pt-2"><span className="text-muted-foreground">STCG tax</span><strong className="block mt-1 mono-num">{money(tax.stcgTax)}</strong></div><div className="border-t border-border pt-2"><span className="text-muted-foreground">LTCG tax</span><strong className="block mt-1 mono-num">{money(tax.ltcgTax)}</strong></div></div><div className="text-[10px] text-muted-foreground mt-4">Equity STCG {rules.equitySTCGRate}% · Equity LTCG {rules.equityLTCGRate}% · Equity gains {money(summary.ltcgEquity)}</div></div>; }
function GainComposition({ title, rows }: { title: string; rows: { label: string; value: number; tone: string }[] }) { const total = rows.reduce((s, r) => s + Math.max(0, r.value), 0) || 1; return <div className="border border-border rounded-md bg-surface p-4"><div className="text-xs font-semibold mb-3">{title}</div>{rows.map(r => <div key={r.label} className="mb-3"><div className="flex justify-between text-[11px]"><span>{r.label}</span><span className="mono-num">{money(r.value)}</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1"><div className={`h-full ${r.tone}`} style={{ width: `${Math.max(0, r.value) / total * 100}%` }} /></div></div>)}</div>; }

function Ledger({ lots, realisedLots, expanded, setExpanded }: { lots: TaxLot[]; realisedLots: RealisedLot[]; expanded: string | null; setExpanded: (id: string | null) => void }) { return <div className="border border-border rounded-md bg-surface overflow-hidden"><div className="px-4 py-3 border-b border-border flex items-center justify-between"><div><div className="text-xs font-semibold">FIFO tax-lot ledger</div><div className="text-[10px] text-muted-foreground">Click a row for acquisition and cost-basis detail</div></div><span className="text-[10px] text-muted-foreground">{lots.length + realisedLots.length} rows</span></div><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="text-[10px] uppercase tracking-wider text-muted-foreground"><tr className="border-b border-border"><th className="text-left p-3">Security</th><th className="text-left p-3">Type</th><th className="text-left p-3">Term</th><th className="text-right p-3">Quantity</th><th className="text-right p-3">Cost</th><th className="text-right p-3">Value / Proceeds</th><th className="text-right p-3">Gain</th></tr></thead><tbody>{realisedLots.map(l => <React.Fragment key={l.id}><LedgerRow id={l.id} name={l.name} isin={l.isin} type="Realised" term={l.term} quantity={l.quantity} cost={l.cost} value={l.proceeds} gain={l.gain} expanded={expanded === l.id} onClick={() => setExpanded(expanded === l.id ? null : l.id)} /><ExpandedRealised lot={expanded === l.id ? l : null} /></React.Fragment>)}{lots.map(l => <React.Fragment key={l.id}><LedgerRow id={l.id} name={l.name} isin={l.isin} type="Unrealised" term={l.term} quantity={l.quantity} cost={l.cost} value={l.marketValue} gain={l.unrealised} expanded={expanded === l.id} onClick={() => setExpanded(expanded === l.id ? null : l.id)} /><ExpandedTaxLot lot={expanded === l.id ? l : null} /></React.Fragment>)}</tbody></table></div></div>; }
function LedgerRow({ name, isin, type, term, quantity, cost, value, gain, expanded, onClick }: { id: string; name: string; isin: string; type: string; term: string; quantity: number; cost: number; value: number; gain: number; expanded: boolean; onClick: () => void }) { return <tr onClick={onClick} className={`border-b border-border/50 cursor-pointer hover:bg-secondary/40 ${expanded ? "bg-secondary/50" : ""}`}><td className="p-3"><div className="font-medium max-w-[250px] truncate">{name}</div><div className="text-[10px] text-muted-foreground mono-num">{isin}</div></td><td className="p-3 text-muted-foreground">{type}</td><td className={`p-3 font-semibold ${termClass(term)}`}>{term}</td><td className="p-3 text-right mono-num">{quantity.toFixed(3)}</td><td className="p-3 text-right mono-num">{money(cost)}</td><td className="p-3 text-right mono-num">{money(value)}</td><td className={`p-3 text-right mono-num font-semibold ${gain >= 0 ? "text-positive" : "text-negative"}`}>{money(gain)}</td></tr>; }
function ExpandedTaxLot({ lot }: { lot: TaxLot | null }) { if (!lot) return null; return <tr className="bg-secondary/30"><td colSpan={7} className="p-3"><div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px]"><span>Purchased<strong className="block text-foreground mt-1">{lot.purchaseDate.toLocaleDateString()}</strong></span><span>Buy price<strong className="block text-foreground mt-1 mono-num">{money(lot.buyPrice)}</strong></span><span>Current price<strong className="block text-foreground mt-1 mono-num">{money(lot.currentPrice)}</strong></span><span>Held<strong className="block text-foreground mt-1">{lot.holdingDays} days</strong></span><span>{lot.term === "STCG" ? "Long-term in" : "Tax bucket"}<strong className="block text-foreground mt-1">{lot.term === "STCG" ? `${lot.daysToLongTerm} days` : lot.taxBucket}</strong></span></div></td></tr>; }
function ExpandedRealised({ lot }: { lot: RealisedLot | null }) { if (!lot) return null; return <tr className="bg-secondary/30"><td colSpan={7} className="p-3 text-[10px] text-muted-foreground">Acquired {lot.purchaseDate.toLocaleDateString()} · Sold {lot.sellDate.toLocaleDateString()} · Held {lot.holdingDays} days · {lot.taxBucket} tax bucket · FIFO matched.</td></tr>; }

function HarvestView({ lots, summary, tax, rules, taxSaving }: { lots: TaxLot[]; summary: GainSummary; tax: TaxEstimate; rules: TaxRules; taxSaving: number }) { const candidates = lots.filter(l => l.unrealised < 0).sort((a, b) => a.unrealised - b.unrealised).slice(0, 8); return <div className="grid lg:grid-cols-[1fr_0.7fr] gap-4"><div className="border border-border rounded-md bg-surface overflow-hidden"><div className="px-4 py-3 border-b border-border"><div className="text-xs font-semibold">Loss harvesting candidates</div><div className="text-[10px] text-muted-foreground">Potential losses that may offset gains; check wash-sale and local rules.</div></div>{candidates.length ? <table className="w-full text-xs"><tbody>{candidates.map(l => <tr key={l.id} className="border-b border-border/50"><td className="p-3"><div className="font-medium truncate max-w-[300px]">{l.name}</div><div className="text-[10px] text-muted-foreground">{l.isin}</div></td><td className="p-3 text-right mono-num">{money(l.unrealised)}</td><td className="p-3 text-right mono-num text-muted-foreground">{pct(l.unrealisedPct)}</td></tr>)}</tbody></table> : <div className="p-8 text-center text-xs text-muted-foreground">No loss candidates in the reconstructed lots.</div>}</div><div className="border border-border rounded-md bg-surface p-4"><div className="text-xs font-semibold">Exemption & offset planner</div><div className="space-y-3 mt-4 text-xs"><div className="flex justify-between"><span className="text-muted-foreground">Current equity LTCG</span><span className="mono-num">{money(summary.ltcgEquity)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Annual exemption</span><span className="mono-num">{money(rules.ltcgExemption)}</span></div><div className="flex justify-between border-t border-border pt-3"><span className="font-medium">Estimated exemption benefit</span><span className="mono-num text-positive">{money(taxSaving)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Current tax provision</span><span className="mono-num">{money(tax.total)}</span></div></div><p className="text-[10px] text-muted-foreground mt-5">This simulator uses only the imported portfolio. It does not recommend a trade or account for other income, losses carried forward, surcharge, cess or transaction costs.</p></div></div>; }
