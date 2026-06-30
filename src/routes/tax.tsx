import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Calculator, ArrowLeft, ChevronRight, Info, Users, User, Download, Printer, Wand2, TrendingDown, Clock, Layers, CheckCircle2, RotateCcw } from "lucide-react";
import type { Holding } from "@/lib/ecas-parser";
import {
  SAMPLE_FAMILIES,
  SAMPLE_PORTFOLIOS,
  seedSamplePortfolios,
  storageKeyForRegion,
  type SavedPortfolio,
} from "@/lib/sample-portfolios";
import { useRegion, fmtMoney, fmtMoneyFull } from "@/lib/region";

export const Route = createFileRoute("/tax")({
  head: () => ({
    meta: [
      { title: "Tax Liability · mPower Wealth" },
      {
        name: "description",
        content:
          "Per-transaction capital-gains tax for client and family portfolios — India FY 2025-26 engine; UAE region shows 0% personal-tax notice.",
      },
    ],
  }),
  component: TaxPage,
});

// ---------------- Helpers ----------------
function loadSaved(region: import("@/lib/region").Region): SavedPortfolio[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(storageKeyForRegion(region)) || "[]");
  } catch {
    return [];
  }
}

const fmtINR = fmtMoney;
const fmtINRFull = fmtMoneyFull;

function seedNum(seed: string, min: number, max: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const r = ((h >>> 0) % 100000) / 100000;
  return min + r * (max - min);
}

// ---------------- Tax Engine (India, FY 2025-26) ----------------
// Reference rules implemented:
//   • Listed Equity / Equity MF (>65% eq) / Equity ETF (STT paid):
//       STCG (≤12m) u/s 111A — 20% (post 23-Jul-2024)
//       LTCG (>12m) u/s 112A — 12.5% on gains exceeding ₹1,25,000 (FY25-26 limit)
//       Grandfathering: shares/units acquired before 01-Feb-2018 →
//         Deemed cost = max(actualCost, min(FMV on 31-Jan-2018, saleConsideration))
//   • Listed Bonds / NCD / G-Sec: STCG (≤12m) at slab; LTCG (>12m) @ 12.5%
//   • Mutual Fund – Debt:
//       Acquired on/after 01-Apr-2023 → always STCG (slab), no indexation (Finance Act 2023)
//       Acquired before 01-Apr-2023 → LTCG (>24m post 23-Jul-2024) @ 12.5% w/o indexation; else slab
//   • REIT / InvIT units (listed): >12m LTCG u/s 112A @12.5% (1.25L exempt); ≤12m STCG @ 20%
//   • PMS → look-through equity rules
//   • AIF Cat I/II → unlisted equity rules: LTCG >24m @ 12.5%; else slab
//   • AIF Cat III → fund-level taxation, modelled here as equity
//   • Private Equity (unlisted) → >24m LTCG @ 12.5%; else slab
//   • Real Estate → >24m LTCG @ 12.5% w/o indexation (post 23-Jul-2024).
//        For property acquired before 23-Jul-2024, resident assessees may choose
//        20% with indexation if lower. Engine picks the lower of the two.
//   • Hybrid MF → treated as equity-oriented (assumes >65% equity) for simplicity.

const FY = "FY 2025-26";
const ASSESSMENT_DATE = new Date("2026-06-23"); // current date in app
const NEW_REGIME_CUTOFF = new Date("2024-07-23"); // Finance (No.2) Act 2024
const DEBT_MF_CUTOFF = new Date("2023-04-01"); // Finance Act 2023
const GRANDFATHER_CUTOFF = new Date("2018-02-01");
const LTCG_112A_EXEMPTION = 125000;

type TaxRegime = {
  slabRate: number; // marginal rate %, applied to slab-taxed STCG/debt gains
  surcharge: number; // % surcharge on tax (post LTCG cap rules — 15% max on 111A/112A)
  cessRate: number; // health & education cess (4%)
};

type TaxBucket =
  | "EQUITY_STCG_111A" // 20%
  | "EQUITY_LTCG_112A" // 12.5% over 1.25L
  | "DEBT_LTCG_125" // 12.5% (listed bonds, old debt MF LTCG, RE LTCG, unlisted LTCG)
  | "SLAB" // taxed at marginal slab rate
  | "RE_LTCG_20_INDEX"; // 20% with indexation alternative

type Txn = {
  holding: Holding;
  acquiredOn: Date;
  costBasis: number;
  deemedCost: number; // after grandfathering if applicable
  saleValue: number; // current value (assumed disposal today)
  gain: number;
  holdingDays: number;
  bucket: TaxBucket;
  rate: number; // marginal % for display (before cess/surcharge)
  taxable: number;
  taxBeforeCess: number;
  note: string;
  category: string;
  grandfathered: boolean;
};

function categoryOf(h: Holding): string {
  if (h.productCategory) return h.productCategory;
  if (h.type === "Mutual Fund") return "Mutual Fund - Equity";
  if (h.type === "Bond") return "Direct Debt";
  if (h.type === "ETF") return "ETF";
  if (h.type === "Equity") return "Direct Equity";
  return "Other";
}

// Synthesise deterministic acquisition date & cost basis for each holding
function synthAcquisition(h: Holding): { acquiredOn: Date; costBasis: number } {
  const cat = categoryOf(h);
  // Months back depending on category profile
  let minM = 6, maxM = 96;
  if (cat === "Direct Equity") { minM = 12; maxM = 130; }
  else if (cat === "Mutual Fund - Equity") { minM = 8; maxM = 96; }
  else if (cat === "Mutual Fund - Hybrid") { minM = 10; maxM = 60; }
  else if (cat === "Mutual Fund - Debt") { minM = 6; maxM = 84; }
  else if (cat === "Direct Debt") { minM = 12; maxM = 84; }
  else if (cat === "ETF") { minM = 6; maxM = 60; }
  else if (cat === "PMS") { minM = 18; maxM = 96; }
  else if (cat === "AIF") { minM = 24; maxM = 96; }
  else if (cat === "REIT" || cat === "InvIT") { minM = 8; maxM = 60; }
  else if (cat === "Private Equity") { minM = 30; maxM = 96; }
  else if (cat === "Real Estate") { minM = 36; maxM = 180; }

  const monthsBack = Math.round(seedNum(h.isin + "m", minM, maxM));
  const acquiredOn = new Date(ASSESSMENT_DATE);
  acquiredOn.setMonth(acquiredOn.getMonth() - monthsBack);
  acquiredOn.setDate(1 + Math.round(seedNum(h.isin + "d", 0, 27)));

  // Cost basis as a fraction of current value (depends on holding period — longer = more appreciation)
  // Older holdings have lower cost (bigger gain). Some intentionally loss-making.
  const lossy = seedNum(h.isin + "L", 0, 1) < 0.18;
  const yearsBack = monthsBack / 12;
  const baseCAGR = cat.includes("Equity") || cat === "PMS" || cat === "Private Equity"
    ? seedNum(h.isin + "c", 0.06, 0.18)
    : cat === "Real Estate"
    ? seedNum(h.isin + "c", 0.04, 0.11)
    : cat === "REIT" || cat === "InvIT" || cat === "AIF"
    ? seedNum(h.isin + "c", 0.05, 0.13)
    : seedNum(h.isin + "c", 0.03, 0.08); // debt
  let ratio = 1 / Math.pow(1 + baseCAGR, yearsBack);
  if (lossy) ratio = ratio * seedNum(h.isin + "x", 1.05, 1.35); // cost > value → loss
  ratio = Math.min(1.6, Math.max(0.15, ratio));
  const costBasis = Math.round(h.value * ratio);
  return { acquiredOn, costBasis };
}

function diffDays(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

function isListedEquityCat(cat: string) {
  return (
    cat === "Direct Equity" ||
    cat === "Mutual Fund - Equity" ||
    cat === "Mutual Fund - Hybrid" ||
    cat === "ETF" ||
    cat === "PMS"
  );
}

function computeTxn(h: Holding, slabRate: number): Txn {
  const cat = categoryOf(h);
  const { acquiredOn, costBasis } = synthAcquisition(h);
  const sale = h.value;
  const days = diffDays(ASSESSMENT_DATE, acquiredOn);
  const months = days / 30.4375;

  let deemedCost = costBasis;
  let grandfathered = false;
  let bucket: TaxBucket = "SLAB";
  let rate = slabRate;
  let taxable = 0;
  let note = "";

  // ---- Listed equity / equity MF / hybrid / ETF / PMS ----
  if (isListedEquityCat(cat)) {
    // Grandfathering for shares/units acquired before 1-Feb-2018
    if (acquiredOn < GRANDFATHER_CUTOFF) {
      // Simulated FMV on 31-Jan-2018 as a fraction of current sale value
      const fmv2018 = sale * seedNum(h.isin + "fmv", 0.35, 0.75);
      const deemed = Math.max(costBasis, Math.min(fmv2018, sale));
      if (deemed > costBasis) {
        deemedCost = Math.round(deemed);
        grandfathered = true;
      }
    }
    const gain = sale - deemedCost;
    if (months > 12) {
      bucket = "EQUITY_LTCG_112A";
      rate = 12.5;
      taxable = gain; // 1.25L exemption applied at aggregate level
      note = grandfathered
        ? "LTCG u/s 112A @ 12.5% over ₹1.25L aggregate. Cost stepped-up under grandfathering (FMV 31-Jan-2018)."
        : "LTCG u/s 112A @ 12.5% over ₹1.25L aggregate exemption.";
    } else {
      bucket = "EQUITY_STCG_111A";
      rate = 20;
      taxable = Math.max(0, gain);
      note = "STCG u/s 111A @ 20% (post 23-Jul-2024).";
    }
    return finalise(h, cat, acquiredOn, costBasis, deemedCost, sale, gain, days, bucket, rate, taxable, note, grandfathered);
  }

  // ---- REIT / InvIT (listed units, STT analog) ----
  if (cat === "REIT" || cat === "InvIT") {
    const gain = sale - costBasis;
    if (months > 12) {
      bucket = "EQUITY_LTCG_112A";
      rate = 12.5;
      taxable = gain;
      note = "Units of Business Trust: LTCG u/s 112A @ 12.5% over ₹1.25L aggregate.";
    } else {
      bucket = "EQUITY_STCG_111A";
      rate = 20;
      taxable = Math.max(0, gain);
      note = "Units of Business Trust: STCG u/s 111A @ 20%.";
    }
    return finalise(h, cat, acquiredOn, costBasis, costBasis, sale, gain, days, bucket, rate, taxable, note, false);
  }

  // ---- Mutual Fund - Debt ----
  if (cat === "Mutual Fund - Debt") {
    const gain = sale - costBasis;
    if (acquiredOn >= DEBT_MF_CUTOFF) {
      bucket = "SLAB";
      rate = slabRate;
      taxable = Math.max(0, gain);
      note = "Specified Mutual Fund acquired on/after 01-Apr-2023 — entire gain taxed at slab rates u/s 50AA (no LTCG / no indexation).";
    } else if (months > 24) {
      bucket = "DEBT_LTCG_125";
      rate = 12.5;
      taxable = gain;
      note = "Pre 01-Apr-2023 debt MF held > 24 months: LTCG @ 12.5% without indexation (post 23-Jul-2024).";
    } else {
      bucket = "SLAB";
      rate = slabRate;
      taxable = Math.max(0, gain);
      note = "Pre 01-Apr-2023 debt MF held ≤ 24 months: STCG at slab rate.";
    }
    return finalise(h, cat, acquiredOn, costBasis, costBasis, sale, gain, days, bucket, rate, taxable, note, false);
  }

  // ---- Direct Debt (listed bonds / NCD / G-Sec) ----
  if (cat === "Direct Debt") {
    const gain = sale - costBasis;
    if (months > 12) {
      bucket = "DEBT_LTCG_125";
      rate = 12.5;
      taxable = gain;
      note = "Listed bond / NCD / G-Sec held > 12 months: LTCG @ 12.5% without indexation.";
    } else {
      bucket = "SLAB";
      rate = slabRate;
      taxable = Math.max(0, gain);
      note = "Listed debt security held ≤ 12 months: STCG at slab rate.";
    }
    return finalise(h, cat, acquiredOn, costBasis, costBasis, sale, gain, days, bucket, rate, taxable, note, false);
  }

  // ---- AIF / Private Equity (unlisted) ----
  if (cat === "AIF" || cat === "Private Equity") {
    const gain = sale - costBasis;
    if (months > 24) {
      bucket = "DEBT_LTCG_125";
      rate = 12.5;
      taxable = gain;
      note =
        cat === "AIF"
          ? "AIF (Cat I/II look-through) — unlisted security > 24 months: LTCG @ 12.5%."
          : "Unlisted PE units > 24 months: LTCG @ 12.5%.";
    } else {
      bucket = "SLAB";
      rate = slabRate;
      taxable = Math.max(0, gain);
      note = "Unlisted security ≤ 24 months: STCG at slab rate.";
    }
    return finalise(h, cat, acquiredOn, costBasis, costBasis, sale, gain, days, bucket, rate, taxable, note, false);
  }

  // ---- Real Estate ----
  if (cat === "Real Estate") {
    const gain = sale - costBasis;
    if (months > 24) {
      // Post 23-Jul-2024: 12.5% without indexation. Pre cutoff acquired property: option of 20% with indexation if lower.
      const tax125 = Math.max(0, gain) * 0.125;
      if (acquiredOn < NEW_REGIME_CUTOFF) {
        // Synthesised CII-based indexed cost
        const yearsHeld = (ASSESSMENT_DATE.getTime() - acquiredOn.getTime()) / (365.25 * 86400000);
        const cii = Math.pow(1.05, yearsHeld); // ~5% p.a. CII inflator
        const indexedCost = costBasis * cii;
        const indexedGain = Math.max(0, sale - indexedCost);
        const tax20 = indexedGain * 0.20;
        if (tax20 < tax125) {
          bucket = "RE_LTCG_20_INDEX";
          rate = 20;
          taxable = indexedGain;
          note =
            "Immovable property acquired before 23-Jul-2024 & held > 24 months — 20% with indexation chosen (lower than 12.5% without indexation, as permitted by Finance (No.2) Act 2024 proviso).";
          return finalise(h, cat, acquiredOn, costBasis, Math.round(indexedCost), sale, indexedGain, days, bucket, rate, taxable, note, false);
        }
      }
      bucket = "DEBT_LTCG_125";
      rate = 12.5;
      taxable = gain;
      note = "Immovable property > 24 months: LTCG @ 12.5% without indexation (post 23-Jul-2024).";
    } else {
      bucket = "SLAB";
      rate = slabRate;
      taxable = Math.max(0, gain);
      note = "Immovable property held ≤ 24 months: STCG at slab rate.";
    }
    return finalise(h, cat, acquiredOn, costBasis, costBasis, sale, gain, days, bucket, rate, taxable, note, false);
  }

  // ---- Fallback (Other) ----
  const gain = sale - costBasis;
  if (months > 24) {
    bucket = "DEBT_LTCG_125"; rate = 12.5; taxable = gain;
    note = "Other capital asset > 24 months: LTCG @ 12.5%.";
  } else {
    bucket = "SLAB"; rate = slabRate; taxable = Math.max(0, gain);
    note = "Other capital asset ≤ 24 months: STCG at slab rate.";
  }
  return finalise(h, cat, acquiredOn, costBasis, costBasis, sale, gain, days, bucket, rate, taxable, note, false);
}

function finalise(
  h: Holding, category: string, acquiredOn: Date, costBasis: number, deemedCost: number,
  sale: number, gain: number, days: number, bucket: TaxBucket, rate: number, taxable: number,
  note: string, grandfathered: boolean,
): Txn {
  // tax before cess/surcharge — note that 112A's 1.25L exemption is applied aggregate (handled in summary)
  const taxBeforeCess = Math.max(0, taxable) * (rate / 100);
  return {
    holding: h, acquiredOn, costBasis, deemedCost, saleValue: sale,
    gain, holdingDays: days, bucket, rate, taxable, taxBeforeCess, note, category, grandfathered,
  };
}

type Summary = {
  txns: Txn[];
  // raw
  totalSale: number;
  totalCost: number;
  totalGain: number;
  // by bucket
  equityStcgGain: number;
  equityLtcgGain: number;
  debtLtcgGain: number; // 12.5% bucket
  slabGain: number;
  reIndexedGain: number;
  // tax
  tax_111A: number;
  tax_112A: number; // after 1.25L exemption
  tax_125_debt: number;
  tax_slab: number;
  tax_RE_indexed: number;
  taxBeforeSurcharge: number;
  surcharge: number;
  cess: number;
  totalTax: number;
  shortTermTax: number;
  longTermTax: number;
};

function summarise(txns: Txn[], regime: TaxRegime): Summary {
  let totalSale = 0, totalCost = 0, totalGain = 0;
  let equityStcgGain = 0, equityLtcgGain = 0, debtLtcgGain = 0, slabGain = 0, reIndexedGain = 0;

  for (const t of txns) {
    totalSale += t.saleValue;
    totalCost += t.costBasis;
    totalGain += t.gain;
    if (t.bucket === "EQUITY_STCG_111A") equityStcgGain += t.taxable;
    else if (t.bucket === "EQUITY_LTCG_112A") equityLtcgGain += t.taxable; // net of losses
    else if (t.bucket === "DEBT_LTCG_125") debtLtcgGain += t.taxable;
    else if (t.bucket === "SLAB") slabGain += t.taxable;
    else if (t.bucket === "RE_LTCG_20_INDEX") reIndexedGain += t.taxable;
  }

  const tax_111A = Math.max(0, equityStcgGain) * 0.20;
  const ltcg112ATaxable = Math.max(0, equityLtcgGain - LTCG_112A_EXEMPTION);
  const tax_112A = ltcg112ATaxable * 0.125;
  const tax_125_debt = Math.max(0, debtLtcgGain) * 0.125;
  const tax_slab = Math.max(0, slabGain) * (regime.slabRate / 100);
  const tax_RE_indexed = Math.max(0, reIndexedGain) * 0.20;

  const taxBeforeSurcharge = tax_111A + tax_112A + tax_125_debt + tax_slab + tax_RE_indexed;
  // Surcharge on 111A/112A capped at 15%; on slab follows the user-set surcharge bracket; we apply a single % proxy.
  const surcharge = taxBeforeSurcharge * (regime.surcharge / 100);
  const cess = (taxBeforeSurcharge + surcharge) * (regime.cessRate / 100);
  const totalTax = taxBeforeSurcharge + surcharge + cess;

  const shortTermTax = tax_111A + tax_slab; // slab gains are short-term in nature here
  const longTermTax = tax_112A + tax_125_debt + tax_RE_indexed;

  return {
    txns, totalSale, totalCost, totalGain,
    equityStcgGain, equityLtcgGain, debtLtcgGain, slabGain, reIndexedGain,
    tax_111A, tax_112A, tax_125_debt, tax_slab, tax_RE_indexed,
    taxBeforeSurcharge, surcharge, cess, totalTax,
    shortTermTax, longTermTax,
  };
}

// ---------------- Optimiser ----------------
// Plays the role of a "tax-aware portfolio engineer". Given the synthesised
// transaction set, it produces an optimised plan + the rationale for each
// move. Actions modelled:
//   A. Defer-to-LTCG  — postpone sales that are just shy of the long-term
//      threshold (12m for listed equity / 24m for unlisted / RE / old-debt-MF).
//   B. Tax-loss harvesting — recognise losses to offset gains under the
//      set-off rules of Sec 70/71/74 (STCL → any CG; LTCL → only LTCG).
//   C. Use ₹1,25,000 LTCG exemption u/s 112A in full.
//   D. Real-estate indexation alternative — pick the cheaper of 12.5% w/o
//      indexation vs 20% with indexation (already done in computeTxn, but
//      surfaced as a step when it triggered).
//   E. Stagger specified-debt-MF gains via SWP/STP across FYs to stay in a
//      lower slab.

type OptStep = {
  kind: "DEFER" | "HARVEST" | "EXEMPTION" | "INDEX" | "STAGGER" | "INFO";
  title: string;
  detail: string;
  savings: number;
};

function nearLTThresholdMonths(t: Txn): number | null {
  // Returns months to wait if deferral would convert STCG → LTCG, else null.
  const months = t.holdingDays / 30.4375;
  if (t.bucket === "EQUITY_STCG_111A" && months >= 9 && months < 12) return Math.ceil(12 - months);
  if (t.bucket === "SLAB" && t.gain > 0) {
    const cat = t.category;
    // For unlisted / RE / old debt MF — 24m threshold
    if (cat === "AIF" || cat === "Private Equity" || cat === "Real Estate") {
      if (months >= 18 && months < 24) return Math.ceil(24 - months);
    }
    if (cat === "Direct Debt") {
      if (months >= 9 && months < 12) return Math.ceil(12 - months);
    }
    if (cat === "Mutual Fund - Debt") {
      // Only pre-Apr-2023 acquisitions get LT treatment; post-Apr-23 always slab.
      if (t.acquiredOn < DEBT_MF_CUTOFF && months >= 18 && months < 24) return Math.ceil(24 - months);
    }
  }
  return null;
}

function summariseOptimised(txns: Txn[], regime: TaxRegime, ltcgExemptionRemaining = LTCG_112A_EXEMPTION): Summary {
  // Signed sums (allow negatives within each bucket so losses net first)
  let g_111A = 0, g_slab = 0, g_112A = 0, g_125 = 0, g_RE = 0;
  let totalSale = 0, totalCost = 0, totalGain = 0;
  for (const t of txns) {
    totalSale += t.saleValue; totalCost += t.costBasis; totalGain += t.gain;
    if (t.bucket === "EQUITY_STCG_111A") g_111A += t.gain;
    else if (t.bucket === "SLAB") g_slab += t.gain;
    else if (t.bucket === "EQUITY_LTCG_112A") g_112A += t.gain;
    else if (t.bucket === "DEBT_LTCG_125") g_125 += t.gain;
    else if (t.bucket === "RE_LTCG_20_INDEX") g_RE += t.gain;
  }
  // Pool losses within type (Sec 70 intra-head set-off)
  let stcl = Math.max(0, -(Math.min(0, g_111A) + Math.min(0, g_slab)));
  let ltcl = Math.max(0, -(Math.min(0, g_112A) + Math.min(0, g_125) + Math.min(0, g_RE)));
  let p_111A = Math.max(0, g_111A);
  let p_slab = Math.max(0, g_slab);
  let p_112A = Math.max(0, g_112A);
  let p_125  = Math.max(0, g_125);
  let p_RE   = Math.max(0, g_RE);

  // STCL → STCG first (proportionally), then LTCG
  const stcgPos = p_111A + p_slab;
  const useSTCL_st = Math.min(stcl, stcgPos);
  if (stcgPos > 0) {
    p_111A -= useSTCL_st * (p_111A / stcgPos);
    p_slab -= useSTCL_st * (p_slab / stcgPos);
  }
  stcl -= useSTCL_st;
  // Remaining STCL + all LTCL → LTCG positives proportionally
  const ltcgPos = p_112A + p_125 + p_RE;
  const lossToLT = Math.min(stcl + ltcl, ltcgPos);
  if (ltcgPos > 0) {
    p_112A -= lossToLT * (p_112A / ltcgPos);
    p_125  -= lossToLT * (p_125  / ltcgPos);
    p_RE   -= lossToLT * (p_RE   / ltcgPos);
  }
  // 1.25L exemption u/s 112A
  const exemptUsed = Math.min(ltcgExemptionRemaining, p_112A);
  const taxable_112A = p_112A - exemptUsed;

  const tax_111A = p_111A * 0.20;
  const tax_112A = taxable_112A * 0.125;
  const tax_125_debt = p_125 * 0.125;
  const tax_slab = p_slab * (regime.slabRate / 100);
  const tax_RE_indexed = p_RE * 0.20;
  const taxBeforeSurcharge = tax_111A + tax_112A + tax_125_debt + tax_slab + tax_RE_indexed;
  const surcharge = taxBeforeSurcharge * (regime.surcharge / 100);
  const cess = (taxBeforeSurcharge + surcharge) * (regime.cessRate / 100);
  const totalTax = taxBeforeSurcharge + surcharge + cess;

  return {
    txns, totalSale, totalCost, totalGain,
    equityStcgGain: p_111A, equityLtcgGain: p_112A, debtLtcgGain: p_125, slabGain: p_slab, reIndexedGain: p_RE,
    tax_111A, tax_112A, tax_125_debt, tax_slab, tax_RE_indexed,
    taxBeforeSurcharge, surcharge, cess, totalTax,
    shortTermTax: tax_111A + tax_slab,
    longTermTax: tax_112A + tax_125_debt + tax_RE_indexed,
  };
}

function optimise(originalTxns: Txn[], regime: TaxRegime): { steps: OptStep[]; optSummary: Summary; baseline: Summary; kept: Txn[]; deferred: Txn[]; harvested: Txn[]; } {
  const baseline = summarise(originalTxns, regime);
  const steps: OptStep[] = [];
  const deferred: Txn[] = [];
  const harvested: Txn[] = [];
  const kept: Txn[] = [];

  // A. Defer near-threshold STCG holdings
  for (const t of originalTxns) {
    const wait = nearLTThresholdMonths(t);
    if (wait !== null && t.gain > 0) {
      deferred.push(t);
      // Approx saving = (STCG tax rate − equivalent LT rate) × gain
      const stRate = t.bucket === "EQUITY_STCG_111A" ? 0.20 : regime.slabRate / 100;
      const ltRate = t.category === "Real Estate" ? 0.125 : (t.bucket === "EQUITY_STCG_111A" ? 0.125 : 0.125);
      const saving = t.gain * Math.max(0, stRate - ltRate);
      steps.push({
        kind: "DEFER",
        title: `Defer sale of ${t.holding.name}`,
        detail: `Hold for another ~${wait} month${wait > 1 ? "s" : ""} to cross the ${t.category === "Real Estate" || t.category === "AIF" || t.category === "Private Equity" ? "24-month" : "12-month"} long-term threshold. Converts STCG @ ${(stRate * 100).toFixed(0)}% to LTCG @ 12.5%.`,
        savings: saving,
      });
    } else {
      kept.push(t);
    }
  }

  // B. Tax-loss harvesting — the loss-making txns inside `kept` are already
  // counted by summariseOptimised (which nets within bucket + applies STCL/LTCL
  // set-off). Surface them as an explicit step so the user sees the rationale.
  const lossTxns = kept.filter((t) => t.gain < 0);
  if (lossTxns.length) {
    const totalLoss = lossTxns.reduce((s, t) => s + Math.abs(t.gain), 0);
    for (const t of lossTxns) harvested.push(t);
    steps.push({
      kind: "HARVEST",
      title: `Harvest losses on ${lossTxns.length} position${lossTxns.length > 1 ? "s" : ""}`,
      detail: `Book ${fmtINR(totalLoss)} of capital loss across ${lossTxns.slice(0, 3).map(t => t.holding.name.split(" ").slice(0, 3).join(" ")).join(", ")}${lossTxns.length > 3 ? "…" : ""}. STCL sets off against STCG and LTCG (Sec 70/71); unused LTCL carries forward 8 years (Sec 74). Buy back after 30+ days to avoid the wash-sale gray-zone.`,
      savings: 0, // captured in baseline-vs-opt delta
    });
  }

  // Compute optimised summary on `kept` set (deferred sales removed from this FY).
  const optSummary = summariseOptimised(kept, regime);

  // C. 112A exemption usage
  if (optSummary.equityLtcgGain > 0) {
    const used = Math.min(LTCG_112A_EXEMPTION, optSummary.equityLtcgGain);
    steps.push({
      kind: "EXEMPTION",
      title: "Utilise ₹1,25,000 LTCG exemption (112A)",
      detail: `${fmtINRFull(used)} of equity-LTCG is absorbed by the annual exemption. If LTCG is short of ₹1.25L, consider booking additional gains up to the cap to reset cost basis tax-free.`,
      savings: used * 0.125,
    });
  }

  // D. RE indexation triggered?
  const indexedRE = originalTxns.filter((t) => t.bucket === "RE_LTCG_20_INDEX");
  if (indexedRE.length) {
    steps.push({
      kind: "INDEX",
      title: `Use 20%-with-indexation for ${indexedRE.length} immovable-property holding${indexedRE.length > 1 ? "s" : ""}`,
      detail: `Property acquired before 23-Jul-2024 retains the option of 20% with indexation. Engine picked the lower of (12.5% w/o indexation) vs (20% on indexed gain) per Finance (No.2) Act 2024 proviso.`,
      savings: 0,
    });
  }

  // E. Stagger specified debt MF (post-Apr-2023)
  const debtMfNew = originalTxns.filter((t) =>
    t.category === "Mutual Fund - Debt" && t.acquiredOn >= DEBT_MF_CUTOFF && t.gain > 0
  );
  if (debtMfNew.length) {
    const totalGain = debtMfNew.reduce((s, t) => s + t.gain, 0);
    // Assume staggering across 3 FYs trims effective slab by ~5pp
    const saving = totalGain * 0.05;
    steps.push({
      kind: "STAGGER",
      title: `Stagger redemption of ${debtMfNew.length} specified debt MF${debtMfNew.length > 1 ? "s" : ""} via SWP`,
      detail: `Post-01-Apr-2023 debt MF gains are taxed at slab u/s 50AA — no LTCG, no indexation. Spread redemption across 2–3 FYs (SWP) to keep marginal slab lower and avoid surcharge cliffs (₹50L / ₹1 Cr / ₹2 Cr).`,
      savings: saving,
    });
  }

  // Adjust optSummary.totalTax for staggering / exemption "savings" already
  // baked into bucketing — keep `steps[].savings` informational only. The
  // headline saving the UI shows = baseline.totalTax − optSummary.totalTax.

  return { steps, optSummary, baseline, kept, deferred, harvested };
}

// ---------------- Component ----------------
function TaxPage() {
  const { region } = useRegion();
  const [saved, setSaved] = useState<SavedPortfolio[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [slabRate, setSlabRate] = useState<number>(30);
  const [surcharge, setSurcharge] = useState<number>(10);
  const [filter, setFilter] = useState<"ALL" | "STCG" | "LTCG" | "LOSS">("ALL");
  const [showOpt, setShowOpt] = useState(false);

  // Reset optimisation panel when switching portfolio / regime
  useEffect(() => { setShowOpt(false); }, [activeId, slabRate, surcharge]);

  useEffect(() => {
    let s = loadSaved(region);
    if (!s.length) s = seedSamplePortfolios();
    setSaved(s);
    setActiveId(s.length ? s[0].id : null);
  }, [region]);

  // UAE: personal income tax does not apply (CT only kicks in for businesses).
  if (region === "AE") {
    return (
      <div className="min-h-screen text-foreground">
        <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
          <div className="pl-12 pr-6 py-3 flex items-center gap-4">
            <div>
              <h1 className="text-sm font-semibold leading-tight">Tax Liability</h1>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">UAE Residency</p>
            </div>
          </div>
        </header>
        <main className="px-6 py-12 max-w-3xl mx-auto">
          <div className="border border-border rounded-lg bg-surface/60 p-8">
            <div className="flex items-center gap-2 text-positive font-semibold mb-3">
              <CheckCircle2 className="w-5 h-5" /> No personal income tax in the UAE
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              UAE residents are not subject to personal income tax on salary, dividends, capital gains or interest income.
              Corporate Tax of 9% applies only to businesses with annual taxable profit above AED 375,000 (Federal Decree-Law No. 47 of 2022),
              and a separate 15% Domestic Minimum Top-up Tax applies to qualifying multinationals from 1-Jan-2025.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              For an Indian-resident client's capital-gains liability, switch the region toggle (top-right) back to
              <strong className="text-foreground"> India</strong>.
            </p>
            <div className="mt-6 text-[11px] text-muted-foreground border-t border-border pt-4">
              Sources: UAE Federal Tax Authority (FTA), Federal Decree-Law No. 47/2022 on the Taxation of Corporations and Businesses.
            </div>
          </div>
        </main>
      </div>
    );
  }


  const regime: TaxRegime = { slabRate, surcharge, cessRate: 4 };
  const active = useMemo(() => saved.find((s) => s.id === activeId) || null, [saved, activeId]);

  const summary = useMemo(() => {
    if (!active) return null;
    const txns = active.data.holdings.map((h) => computeTxn(h, slabRate));
    return summarise(txns, regime);
  }, [active, slabRate, surcharge]);

  const optimisation = useMemo(() => {
    if (!summary || !active) return null;
    return optimise(summary.txns, regime);
  }, [summary, active, slabRate, surcharge]);

  const filteredTxns = useMemo(() => {
    if (!summary) return [];
    if (filter === "ALL") return summary.txns;
    return summary.txns.filter((t) => {
      const isLT = t.bucket === "EQUITY_LTCG_112A" || t.bucket === "DEBT_LTCG_125" || t.bucket === "RE_LTCG_20_INDEX";
      if (filter === "LTCG") return isLT;
      if (filter === "STCG") return t.bucket === "EQUITY_STCG_111A" || t.bucket === "SLAB";
      if (filter === "LOSS") return t.gain < 0;
      return true;
    });
  }, [summary, filter]);

  // Group portfolios by family for sidebar listing
  const grouped = useMemo(() => {
    const families: Record<string, SavedPortfolio[]> = {};
    const solo: SavedPortfolio[] = [];
    for (const s of saved) {
      if (s.family) {
        (families[s.family] ||= []).push(s);
      } else solo.push(s);
    }
    return { families, solo };
  }, [saved]);

  return (
    <div className="min-h-screen text-foreground">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30 print:hidden">
        <div className="pl-12 pr-6 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-sm font-semibold leading-tight">Tax Liability</h1>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Capital Gains · Indian Income Tax · {FY}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px]">
            <button onClick={() => window.print()} className="px-2.5 py-1 border border-border rounded-sm hover:bg-secondary inline-flex items-center gap-1.5">
              <Printer className="w-3 h-3" /> Print
            </button>
            <Link to="/reports" className="px-2.5 py-1 border border-border rounded-sm hover:bg-secondary inline-flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3" /> Open Reports
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-0">
        {/* LEFT: portfolio picker */}
        <aside className="col-span-12 lg:col-span-3 border-r border-border min-h-[calc(100vh-49px)] bg-surface/40">
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Select Portfolio</div>
            <div className="text-xs text-muted-foreground mt-1">
              {saved.length} portfolios across {Object.keys(grouped.families).length} families
            </div>
          </div>

          <div className="py-2">
            {Object.entries(grouped.families).map(([fam, list]) => (
              <div key={fam} className="px-2 mb-2">
                <div className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> {fam}
                </div>
                {list.map((p) => (
                  <PickerRow key={p.id} p={p} active={activeId === p.id} onClick={() => setActiveId(p.id)} />
                ))}
              </div>
            ))}
            {grouped.solo.length > 0 && (
              <div className="px-2 mb-2">
                <div className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Individual
                </div>
                {grouped.solo.map((p) => (
                  <PickerRow key={p.id} p={p} active={activeId === p.id} onClick={() => setActiveId(p.id)} />
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT: tax report */}
        <main className="col-span-12 lg:col-span-9 px-6 py-5">
          {!active || !summary ? (
            <div className="text-sm text-muted-foreground">Select a portfolio to compute capital-gains tax liability.</div>
          ) : (
            <>
              {/* Header / regime controls */}
              <div className="flex flex-wrap items-end gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">{active.data.investor || active.name}</h2>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    PAN {active.data.pan || "—"} · {active.data.holdings.length} holdings · Market value {fmtINR(active.data.totalValue)}
                  </div>
                </div>
                <div className="ml-auto flex items-end gap-3 text-[11px]">
                  <label className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Marginal Slab %</span>
                    <select value={slabRate} onChange={(e) => setSlabRate(Number(e.target.value))}
                      className="mt-0.5 px-2 py-1 bg-background border border-border rounded-sm">
                      <option value={5}>5%</option>
                      <option value={10}>10%</option>
                      <option value={15}>15%</option>
                      <option value={20}>20%</option>
                      <option value={25}>25%</option>
                      <option value={30}>30%</option>
                    </select>
                  </label>
                  <label className="flex flex-col">
                    <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Surcharge %</span>
                    <select value={surcharge} onChange={(e) => setSurcharge(Number(e.target.value))}
                      className="mt-0.5 px-2 py-1 bg-background border border-border rounded-sm">
                      <option value={0}>0%</option>
                      <option value={10}>10%</option>
                      <option value={15}>15%</option>
                      <option value={25}>25% (slab only)</option>
                      <option value={37}>37% (slab only)</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <KPI label="Total Gain (unrealised)" value={fmtINR(summary.totalGain)} tone={summary.totalGain >= 0 ? "pos" : "neg"} />
                <KPI label="Short-Term Tax" value={fmtINR(summary.shortTermTax)} />
                <KPI label="Long-Term Tax" value={fmtINR(summary.longTermTax)} />
                <KPI label={`Total Tax (incl. ${regime.cessRate}% cess)`} value={fmtINR(summary.totalTax)} highlight />
              </div>

              {/* Tax Optimisation */}
              {optimisation && (
                <div className="mb-5">
                  {!showOpt ? (
                    <button
                      onClick={() => setShowOpt(true)}
                      className="w-full px-4 py-3 rounded-md border border-dashed border-foreground/40 bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-amber-500/10 hover:from-indigo-500/15 hover:via-emerald-500/15 hover:to-amber-500/15 flex items-center gap-3 text-left group">
                      <div className="w-9 h-9 rounded-md bg-foreground text-background flex items-center justify-center shrink-0">
                        <Wand2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">Run Tax Optimisation</div>
                        <div className="text-[11px] text-muted-foreground">
                          Apply deferral, loss-harvesting, exemption utilisation, indexation choice and SWP staggering to lower this portfolio's capital-gains tax.
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  ) : (
                    <OptimisationPanel
                      base={optimisation.baseline}
                      opt={optimisation.optSummary}
                      steps={optimisation.steps}
                      deferred={optimisation.deferred}
                      harvested={optimisation.harvested}
                      onClose={() => setShowOpt(false)}
                    />
                  )}
                </div>
              )}



              {/* Bucket breakdown */}
              <div className="border border-border rounded-md bg-surface mb-5">
                <div className="px-4 py-2.5 border-b border-border text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Computation by Tax Bucket
                </div>
                <table className="w-full text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40">
                    <tr>
                      <th className="text-left px-4 py-2">Bucket</th>
                      <th className="text-right px-3 py-2">Net Gain</th>
                      <th className="text-right px-3 py-2">Exemption</th>
                      <th className="text-right px-3 py-2">Taxable</th>
                      <th className="text-right px-3 py-2">Rate</th>
                      <th className="text-right px-4 py-2">Tax</th>
                    </tr>
                  </thead>
                  <tbody className="mono-num">
                    <BucketRow label="Equity STCG u/s 111A" gain={summary.equityStcgGain} exempt={0}
                      taxable={Math.max(0, summary.equityStcgGain)} rate="20%" tax={summary.tax_111A} />
                    <BucketRow label="Equity LTCG u/s 112A" gain={summary.equityLtcgGain} exempt={Math.min(LTCG_112A_EXEMPTION, Math.max(0, summary.equityLtcgGain))}
                      taxable={Math.max(0, summary.equityLtcgGain - LTCG_112A_EXEMPTION)} rate="12.5%" tax={summary.tax_112A} />
                    <BucketRow label="LTCG @ 12.5% (Bonds / Debt MF pre-Apr-23 / Unlisted / RE)"
                      gain={summary.debtLtcgGain} exempt={0} taxable={Math.max(0, summary.debtLtcgGain)} rate="12.5%" tax={summary.tax_125_debt} />
                    <BucketRow label="Real Estate LTCG (20% with indexation option)"
                      gain={summary.reIndexedGain} exempt={0} taxable={Math.max(0, summary.reIndexedGain)} rate="20%" tax={summary.tax_RE_indexed} />
                    <BucketRow label="Slab-taxed gains (Debt MF post-Apr-23, STCG on bonds / unlisted, etc.)"
                      gain={summary.slabGain} exempt={0} taxable={Math.max(0, summary.slabGain)} rate={`${slabRate}%`} tax={summary.tax_slab} />
                    <tr className="border-t border-border bg-secondary/30 font-semibold">
                      <td className="px-4 py-2">Tax before surcharge & cess</td>
                      <td colSpan={4}></td>
                      <td className="text-right px-4 py-2">{fmtINRFull(summary.taxBeforeSurcharge)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-1.5 text-muted-foreground">+ Surcharge ({surcharge}%)</td>
                      <td colSpan={4}></td>
                      <td className="text-right px-4 py-1.5">{fmtINRFull(summary.surcharge)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-1.5 text-muted-foreground">+ Health & Education Cess (4%)</td>
                      <td colSpan={4}></td>
                      <td className="text-right px-4 py-1.5">{fmtINRFull(summary.cess)}</td>
                    </tr>
                    <tr className="border-t border-border bg-foreground text-background font-semibold">
                      <td className="px-4 py-2">Total Tax Liability</td>
                      <td colSpan={4}></td>
                      <td className="text-right px-4 py-2">{fmtINRFull(summary.totalTax)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Transaction-level */}
              <div className="border border-border rounded-md bg-surface">
                <div className="px-4 py-2.5 border-b border-border flex items-center gap-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Transaction-Level Capital Gains ({filteredTxns.length})
                  </div>
                  <div className="ml-auto inline-flex border border-border rounded-sm p-0.5 bg-background">
                    {(["ALL", "STCG", "LTCG", "LOSS"] as const).map((f) => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`px-2.5 py-0.5 text-[10px] rounded-sm ${filter === f ? "bg-foreground text-background" : "text-muted-foreground"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/40">
                      <tr>
                        <th className="text-left px-3 py-2">Holding</th>
                        <th className="text-left px-2 py-2">Category</th>
                        <th className="text-left px-2 py-2">Acquired</th>
                        <th className="text-right px-2 py-2">Period</th>
                        <th className="text-right px-2 py-2">Cost</th>
                        <th className="text-right px-2 py-2">Deemed Cost</th>
                        <th className="text-right px-2 py-2">Sale Value</th>
                        <th className="text-right px-2 py-2">Gain / Loss</th>
                        <th className="text-left px-2 py-2">Treatment</th>
                        <th className="text-right px-2 py-2">Rate</th>
                        <th className="text-right px-3 py-2">Tax</th>
                      </tr>
                    </thead>
                    <tbody className="mono-num">
                      {filteredTxns.map((t, i) => {
                        const months = (t.holdingDays / 30.4375).toFixed(1);
                        const isLT = t.bucket === "EQUITY_LTCG_112A" || t.bucket === "DEBT_LTCG_125" || t.bucket === "RE_LTCG_20_INDEX";
                        return (
                          <tr key={i} className="border-t border-border/50 hover:bg-secondary/30 align-top">
                            <td className="px-3 py-2 max-w-[220px]">
                              <div className="font-medium text-foreground truncate" title={t.holding.name}>{t.holding.name}</div>
                              <div className="text-[9px] text-muted-foreground">{t.holding.isin}</div>
                            </td>
                            <td className="px-2 py-2 text-muted-foreground">{t.category}</td>
                            <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{t.acquiredOn.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                            <td className="px-2 py-2 text-right whitespace-nowrap">
                              {months}m
                              <div className={`text-[9px] uppercase tracking-wider ${isLT ? "text-positive" : "text-muted-foreground"}`}>{isLT ? "Long-Term" : "Short-Term"}</div>
                            </td>
                            <td className="px-2 py-2 text-right">{fmtINR(t.costBasis)}</td>
                            <td className="px-2 py-2 text-right">
                              {fmtINR(t.deemedCost)}
                              {t.grandfathered && <div className="text-[9px] text-amber-500">grandfathered</div>}
                            </td>
                            <td className="px-2 py-2 text-right">{fmtINR(t.saleValue)}</td>
                            <td className={`px-2 py-2 text-right ${t.gain >= 0 ? "text-positive" : "text-negative"}`}>{fmtINR(t.gain)}</td>
                            <td className="px-2 py-2 text-muted-foreground max-w-[260px]">
                              <div className="flex items-start gap-1">
                                <Info className="w-3 h-3 mt-0.5 shrink-0 opacity-60" />
                                <span className="text-[10px] leading-snug">{t.note}</span>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right whitespace-nowrap">{t.rate}%</td>
                            <td className="px-3 py-2 text-right font-semibold">{fmtINR(t.taxBeforeCess)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footnote */}
              <div className="mt-4 text-[10px] text-muted-foreground leading-relaxed border border-dashed border-border rounded-sm p-3">
                <div className="font-medium text-foreground mb-1 inline-flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Tax basis ({FY}) — indicative only
                </div>
                Computations follow the Income-tax Act, 1961 as amended by the Finance (No.2) Act 2024 and the Finance Act 2025.
                Listed-equity / equity-MF / REIT-InvIT short-term gains: <span className="text-foreground">20% u/s 111A</span> (post 23-Jul-2024).
                Long-term gains: <span className="text-foreground">12.5% u/s 112A</span> on aggregate gains exceeding <span className="text-foreground">₹1,25,000</span>.
                Grandfathering u/s 112A applies to equity acquired before 01-Feb-2018 (deemed cost = max of actual cost and the lower of FMV on 31-Jan-2018 / sale value).
                Specified Mutual Funds (more than 65% in debt) acquired on or after 01-Apr-2023 are taxed at slab rates u/s 50AA irrespective of holding period.
                Listed bonds / NCDs / G-Sec held over 12 months and unlisted securities held over 24 months attract LTCG at 12.5% without indexation.
                Immovable property held over 24 months attracts 12.5% without indexation, with an option of 20% with indexation if acquired before 23-Jul-2024 (engine selects the lower).
                Cost basis and acquisition dates shown are synthesised for demonstration; actual tax computation should use audited contract notes.
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function PickerRow({ p, active, onClick }: { p: SavedPortfolio; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded-sm text-xs flex items-center gap-2 hover:bg-secondary/60 ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
      <span className={`w-1 h-4 rounded-sm ${active ? "bg-foreground" : "bg-transparent"}`} />
      <span className="flex-1 truncate">{p.name}</span>
      <span className="text-[9px] mono-num">{fmtINR(p.data.totalValue)}</span>
    </button>
  );
}

function KPI({ label, value, tone, highlight }: { label: string; value: string; tone?: "pos" | "neg"; highlight?: boolean }) {
  return (
    <div className={`border rounded-md p-3 ${highlight ? "border-foreground bg-foreground text-background" : "border-border bg-surface"}`}>
      <div className={`text-[9px] uppercase tracking-[0.18em] ${highlight ? "opacity-70" : "text-muted-foreground"}`}>{label}</div>
      <div className={`mt-1 text-lg font-semibold mono-num ${tone === "pos" ? "text-positive" : tone === "neg" ? "text-negative" : ""}`}>{value}</div>
    </div>
  );
}

function BucketRow({ label, gain, exempt, taxable, rate, tax }: {
  label: string; gain: number; exempt: number; taxable: number; rate: string; tax: number;
}) {
  return (
    <tr className="border-t border-border/50">
      <td className="px-4 py-2 text-foreground">{label}</td>
      <td className={`text-right px-3 py-2 ${gain >= 0 ? "" : "text-negative"}`}>{fmtINRFull(gain)}</td>
      <td className="text-right px-3 py-2 text-muted-foreground">{exempt ? fmtINRFull(exempt) : "—"}</td>
      <td className="text-right px-3 py-2">{fmtINRFull(taxable)}</td>
      <td className="text-right px-3 py-2 text-muted-foreground">{rate}</td>
      <td className="text-right px-4 py-2 font-semibold">{fmtINRFull(tax)}</td>
    </tr>
  );
}

function OptimisationPanel({ base, opt, steps, deferred, harvested, onClose }: {
  base: Summary; opt: Summary; steps: OptStep[]; deferred: Txn[]; harvested: Txn[]; onClose: () => void;
}) {
  const saving = Math.max(0, base.totalTax - opt.totalTax);
  const pct = base.totalTax > 0 ? (saving / base.totalTax) * 100 : 0;
  const iconFor: Record<OptStep["kind"], ReactNode> = {
    DEFER: <Clock className="w-3.5 h-3.5" />,
    HARVEST: <TrendingDown className="w-3.5 h-3.5" />,
    EXEMPTION: <CheckCircle2 className="w-3.5 h-3.5" />,
    INDEX: <Layers className="w-3.5 h-3.5" />,
    STAGGER: <RotateCcw className="w-3.5 h-3.5" />,
    INFO: <Info className="w-3.5 h-3.5" />,
  };
  return (
    <div className="border border-foreground/30 rounded-md bg-gradient-to-br from-indigo-500/5 via-emerald-500/5 to-amber-500/5">
      <div className="px-4 py-3 border-b border-border/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-foreground text-background flex items-center justify-center">
          <Wand2 className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">Tax-Optimised Plan</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Income-tax Act, Sec 70 / 71 / 74 set-off · 111A · 112A · 50AA · indexation proviso
          </div>
        </div>
        <button onClick={onClose} className="text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-sm px-2 py-1">
          Hide
        </button>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60">
        <div className="px-4 py-3">
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Baseline Tax</div>
          <div className="text-base font-semibold mono-num">{fmtINRFull(base.totalTax)}</div>
        </div>
        <div className="px-4 py-3">
          <div className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Optimised Tax</div>
          <div className="text-base font-semibold mono-num text-positive">{fmtINRFull(opt.totalTax)}</div>
        </div>
        <div className="px-4 py-3 bg-foreground text-background">
          <div className="text-[9px] uppercase tracking-[0.18em] opacity-70">You Save</div>
          <div className="text-base font-semibold mono-num">
            {fmtINRFull(saving)} <span className="text-[10px] opacity-80">({pct.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <ol className="divide-y divide-border/40">
        {steps.length === 0 && (
          <li className="px-4 py-4 text-xs text-muted-foreground">
            Portfolio already tax-efficient — no profitable moves identified.
          </li>
        )}
        {steps.map((s, i) => (
          <li key={i} className="px-4 py-3 flex gap-3 items-start">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-foreground shrink-0">
              {iconFor[s.kind]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Step {i + 1}</span>
                <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground">{s.kind}</span>
                <span className="text-sm font-medium">{s.title}</span>
                {s.savings > 0 && (
                  <span className="ml-auto text-[11px] mono-num text-positive">−{fmtINR(s.savings)}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{s.detail}</div>
            </div>
          </li>
        ))}
      </ol>

      {/* Affected holdings */}
      {(deferred.length > 0 || harvested.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-border/60">
          {deferred.length > 0 && (
            <div className="p-4 border-r border-border/60">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Deferred to next FY ({deferred.length})
              </div>
              <ul className="space-y-1 text-[11px]">
                {deferred.slice(0, 8).map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex-1 truncate" title={t.holding.name}>{t.holding.name}</span>
                    <span className="mono-num text-muted-foreground">{fmtINR(t.gain)}</span>
                  </li>
                ))}
                {deferred.length > 8 && <li className="text-muted-foreground text-[10px]">+{deferred.length - 8} more</li>}
              </ul>
            </div>
          )}
          {harvested.length > 0 && (
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-2 inline-flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3" /> Loss-harvested ({harvested.length})
              </div>
              <ul className="space-y-1 text-[11px]">
                {harvested.slice(0, 8).map((t, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="flex-1 truncate" title={t.holding.name}>{t.holding.name}</span>
                    <span className="mono-num text-negative">{fmtINR(t.gain)}</span>
                  </li>
                ))}
                {harvested.length > 8 && <li className="text-muted-foreground text-[10px]">+{harvested.length - 8} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
