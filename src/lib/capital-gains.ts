import type { Holding } from "@/lib/ecas-parser";
import type { Region } from "@/lib/region";

export type GainTerm = "STCG" | "LTCG";

export interface TaxLot {
  id: string;
  isin: string;
  name: string;
  assetClass: string;
  taxBucket: "Equity" | "Debt" | "Other";
  purchaseDate: Date;
  quantity: number;
  buyPrice: number;
  currentPrice: number;
  cost: number;
  marketValue: number;
  unrealised: number;
  unrealisedPct: number;
  holdingDays: number;
  term: GainTerm;
  daysToLongTerm: number;
}

export interface RealisedLot {
  id: string;
  isin: string;
  name: string;
  assetClass: string;
  taxBucket: "Equity" | "Debt" | "Other";
  purchaseDate: Date;
  sellDate: Date;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  cost: number;
  proceeds: number;
  gain: number;
  holdingDays: number;
  term: GainTerm;
}

export interface TaxRules {
  label: string;
  /** Days after which equity gains become long term */
  equityLongTermDays: number;
  debtLongTermDays: number;
  equitySTCGRate: number;
  equityLTCGRate: number;
  debtSTCGRate: number;
  debtLTCGRate: number;
  /** Annual LTCG exemption on equity, in local currency */
  ltcgExemption: number;
  notes: string[];
}

export const TAX_RULES: Record<Region, TaxRules> = {
  IN: {
    label: "India · Income Tax Act",
    equityLongTermDays: 365,
    debtLongTermDays: 730,
    equitySTCGRate: 20,
    equityLTCGRate: 12.5,
    debtSTCGRate: 30,
    debtLTCGRate: 30,
    ltcgExemption: 125000,
    notes: [
      "Listed equity & equity MF: STCG 20% (<12m), LTCG 12.5% beyond ₹1.25L exemption (Budget 2024 regime).",
      "Specified debt mutual funds purchased after 1-Apr-2023 are taxed at slab rate irrespective of holding period.",
      "STT-paid transactions assumed; surcharge and 4% cess are not included in the indicative tax.",
      "Losses: STCL can offset both STCG and LTCG; LTCL can offset only LTCG. Carry-forward up to 8 assessment years.",
    ],
  },
  AE: {
    label: "UAE · Federal Tax Authority",
    equityLongTermDays: 365,
    debtLongTermDays: 365,
    equitySTCGRate: 0,
    equityLTCGRate: 0,
    debtSTCGRate: 0,
    debtLTCGRate: 0,
    ltcgExemption: 0,
    notes: [
      "No personal capital gains tax on investment income for individuals resident in the UAE.",
      "Corporate Tax (9%) may apply where holdings sit inside a taxable UAE entity.",
      "Gains may still be taxable in the investor's country of tax residence — check treaty position.",
    ],
  },
  PH: {
    label: "Philippines · BIR",
    equityLongTermDays: 365,
    debtLongTermDays: 365,
    equitySTCGRate: 15,
    equityLTCGRate: 15,
    debtSTCGRate: 20,
    debtLTCGRate: 20,
    ltcgExemption: 0,
    notes: [
      "Listed shares sold through the PSE attract a 0.6% stock transaction tax on gross selling price in lieu of CGT.",
      "Unlisted shares: 15% capital gains tax on net gain.",
      "Interest income from peso deposits/bonds is subject to 20% final withholding tax.",
    ],
  },
  SG: {
    label: "Singapore · IRAS",
    equityLongTermDays: 365,
    debtLongTermDays: 365,
    equitySTCGRate: 0,
    equityLTCGRate: 0,
    debtSTCGRate: 0,
    debtLTCGRate: 0,
    ltcgExemption: 0,
    notes: [
      "Singapore does not levy capital gains tax on investment disposals.",
      "Frequent, systematic trading may be recharacterised as trading income and taxed at income rates.",
      "Foreign-sourced income remitted into Singapore may be taxable for certain entities.",
    ],
  },
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
function rnd(seed: string, min: number, max: number): number {
  return min + ((hash(seed) % 100000) / 100000) * (max - min);
}

function bucketOf(h: Holding): "Equity" | "Debt" | "Other" {
  const n = `${h.productCategory || ""} ${h.name}`.toUpperCase();
  if (h.type === "Bond") return "Debt";
  if (/DEBT|BOND|GILT|INCOME|CREDIT|CORPORATE|LIQUID|OVERNIGHT|MONEY MARKET/.test(n)) return "Debt";
  if (h.type === "Equity" || h.type === "ETF") return "Equity";
  if (h.type === "Mutual Fund") return /HYBRID|BALANCED|MULTI ASSET/.test(n) ? "Equity" : "Equity";
  return "Other";
}

function classOf(h: Holding): string {
  if (h.productCategory) return h.productCategory;
  return h.type;
}

const DAY = 86400000;

/** Deterministically explode holdings into purchase lots (FIFO ordered). */
export function buildTaxLots(holdings: Holding[], region: Region, asOf = new Date()): TaxLot[] {
  const rules = TAX_RULES[region];
  const lots: TaxLot[] = [];
  for (const h of holdings) {
    const nLots = 1 + Math.floor(rnd(h.isin + "n", 0, 3));
    let qtyLeft = h.quantity;
    for (let i = 0; i < nLots; i++) {
      const share = i === nLots - 1 ? qtyLeft : h.quantity * rnd(h.isin + "s" + i, 0.2, 0.5);
      const qty = Math.max(0.0001, Math.min(qtyLeft, share));
      qtyLeft -= qty;
      const ageDays = Math.round(rnd(h.isin + "a" + i, 45, 1500));
      const purchaseDate = new Date(asOf.getTime() - ageDays * DAY);
      const bucket = bucketOf(h);
      const drift = rnd(h.isin + "p" + i, -0.18, 0.42);
      const buyPrice = h.price / (1 + drift);
      const cost = buyPrice * qty;
      const marketValue = h.price * qty;
      const ltDays = bucket === "Debt" ? rules.debtLongTermDays : rules.equityLongTermDays;
      lots.push({
        id: `${h.isin}-${i}`,
        isin: h.isin,
        name: h.name,
        assetClass: classOf(h),
        taxBucket: bucket,
        purchaseDate,
        quantity: qty,
        buyPrice,
        currentPrice: h.price,
        cost,
        marketValue,
        unrealised: marketValue - cost,
        unrealisedPct: ((marketValue - cost) / (cost || 1)) * 100,
        holdingDays: ageDays,
        term: ageDays >= ltDays ? "LTCG" : "STCG",
        daysToLongTerm: Math.max(0, ltDays - ageDays),
      });
      if (qtyLeft <= 0) break;
    }
  }
  return lots.sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());
}

/** Deterministically synthesize realised (sold) lots for the reporting period. */
export function buildRealisedLots(holdings: Holding[], region: Region, fyStart: Date, asOf = new Date()): RealisedLot[] {
  const rules = TAX_RULES[region];
  const out: RealisedLot[] = [];
  for (const h of holdings) {
    if (rnd(h.isin + "sell", 0, 1) < 0.55) continue;
    const qty = h.quantity * rnd(h.isin + "sq", 0.08, 0.35);
    const window = Math.max(1, asOf.getTime() - fyStart.getTime());
    const sellDate = new Date(fyStart.getTime() + rnd(h.isin + "sd", 0.05, 0.95) * window);
    const holdingDays = Math.round(rnd(h.isin + "sh", 30, 1600));
    const purchaseDate = new Date(sellDate.getTime() - holdingDays * DAY);
    const bucket = bucketOf(h);
    const sellPrice = h.price * rnd(h.isin + "sp", 0.9, 1.08);
    const buyPrice = sellPrice / (1 + rnd(h.isin + "sg", -0.22, 0.5));
    const ltDays = bucket === "Debt" ? rules.debtLongTermDays : rules.equityLongTermDays;
    out.push({
      id: `${h.isin}-r`,
      isin: h.isin,
      name: h.name,
      assetClass: classOf(h),
      taxBucket: bucket,
      purchaseDate,
      sellDate,
      quantity: qty,
      buyPrice,
      sellPrice,
      cost: buyPrice * qty,
      proceeds: sellPrice * qty,
      gain: (sellPrice - buyPrice) * qty,
      holdingDays,
      term: holdingDays >= ltDays ? "LTCG" : "STCG",
    });
  }
  return out.sort((a, b) => b.sellDate.getTime() - a.sellDate.getTime());
}

export interface GainSummary {
  stcgEquity: number; ltcgEquity: number; stcgDebt: number; ltcgDebt: number;
  stcg: number; ltcg: number; total: number;
}

export function summarise(lots: Array<{ gain: number; term: GainTerm; taxBucket: "Equity" | "Debt" | "Other" }>): GainSummary {
  const s: GainSummary = { stcgEquity: 0, ltcgEquity: 0, stcgDebt: 0, ltcgDebt: 0, stcg: 0, ltcg: 0, total: 0 };
  for (const l of lots) {
    const eq = l.taxBucket !== "Debt";
    if (l.term === "STCG") { s.stcg += l.gain; if (eq) s.stcgEquity += l.gain; else s.stcgDebt += l.gain; }
    else { s.ltcg += l.gain; if (eq) s.ltcgEquity += l.gain; else s.ltcgDebt += l.gain; }
    s.total += l.gain;
  }
  return s;
}

export interface TaxEstimate {
  stcgTax: number; ltcgTax: number; total: number; exemptionUsed: number;
}

export function estimateTax(s: GainSummary, region: Region): TaxEstimate {
  const r = TAX_RULES[region];
  const stcgTax = Math.max(0, s.stcgEquity) * (r.equitySTCGRate / 100) + Math.max(0, s.stcgDebt) * (r.debtSTCGRate / 100);
  const taxableEquityLT = Math.max(0, Math.max(0, s.ltcgEquity) - r.ltcgExemption);
  const exemptionUsed = Math.min(r.ltcgExemption, Math.max(0, s.ltcgEquity));
  const ltcgTax = taxableEquityLT * (r.equityLTCGRate / 100) + Math.max(0, s.ltcgDebt) * (r.debtLTCGRate / 100);
  return { stcgTax, ltcgTax, total: stcgTax + ltcgTax, exemptionUsed };
}

/** Current Indian-style financial year start (Apr 1) for IN, else calendar year. */
export function periodStart(region: Region, asOf = new Date()): Date {
  if (region === "IN") {
    const y = asOf.getMonth() >= 3 ? asOf.getFullYear() : asOf.getFullYear() - 1;
    return new Date(y, 3, 1);
  }
  return new Date(asOf.getFullYear(), 0, 1);
}

export function periodLabel(region: Region, asOf = new Date()): string {
  const s = periodStart(region, asOf);
  return region === "IN"
    ? `FY ${s.getFullYear()}-${String((s.getFullYear() + 1) % 100).padStart(2, "0")}`
    : `CY ${s.getFullYear()}`;
}
