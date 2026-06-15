// Lightweight NSDL / CDSL eCAS PDF parser.
// Uses pdfjs-dist to extract text, then regex-mines ISIN-anchored holding rows.
// Heuristic — works on most eCAS layouts but not guaranteed for every variant.

import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export type HoldingType = "Equity" | "Mutual Fund" | "Bond" | "ETF" | "Other";

export interface Holding {
  isin: string;
  name: string;
  type: HoldingType;
  quantity: number;
  price: number;
  value: number;
  source: "NSDL" | "CDSL";
}

export interface PortfolioParseResult {
  source: "NSDL" | "CDSL" | "Unknown";
  asOf?: string;
  investor?: string;
  pan?: string;
  holdings: Holding[];
  totalValue: number;
  rawTextLength: number;
}

function classify(name: string, isin: string): HoldingType {
  const n = name.toUpperCase();
  if (isin.startsWith("INF")) return "Mutual Fund";
  if (/\bETF\b|EXCHANGE TRADED/.test(n)) return "ETF";
  if (/BOND|NCD|DEBENTURE|G-SEC|GOI|SDL/.test(n)) return "Bond";
  if (/MUTUAL|MF\b|FUND/.test(n)) return "Mutual Fund";
  return "Equity";
}

function toNum(s: string): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(/,/g, "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? 0 : n;
}

export async function parseECasPdf(file: File, password?: string): Promise<PortfolioParseResult> {
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buf, password: password || undefined });
  const pdf = await loadingTask.promise;

  let fullText = "";
  const lineMap: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Group items by Y coordinate -> visual lines
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const it of content.items as any[]) {
      const y = Math.round(it.transform[5]);
      const x = it.transform[4];
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x, str: it.str });
    }
    const ys = [...rows.keys()].sort((a, b) => b - a);
    for (const y of ys) {
      const line = rows.get(y)!.sort((a, b) => a.x - b.x).map(p => p.str).join(" ").replace(/\s+/g, " ").trim();
      if (line) {
        lineMap.push(line);
        fullText += line + "\n";
      }
    }
  }

  const source: "NSDL" | "CDSL" | "Unknown" =
    /NSDL|National Securities Depository/i.test(fullText) ? "NSDL" :
    /CDSL|Central Depository/i.test(fullText) ? "CDSL" :
    /Consolidated Account Statement|CAS/i.test(fullText) ? "NSDL" : "Unknown";

  const panMatch = fullText.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  const asOfMatch = fullText.match(/as on ([0-9]{1,2}[- /][A-Za-z0-9]{3,9}[- /][0-9]{2,4})/i) ||
                    fullText.match(/Statement.*?([0-9]{1,2}[- /][A-Za-z]{3,9}[- /][0-9]{2,4})/i);
  const investorMatch = fullText.match(/(?:Name of (?:the )?(?:Investor|Holder|First Holder)|Investor Name)[:\s]+([A-Z][A-Z .]+?)(?:\s{2,}|\n|PAN)/i);

  // Mine holdings: anchor on ISINs.
  const isinRe = /\b(IN[EFA0-9][0-9A-Z]{9}[0-9])\b/g;
  const holdings: Holding[] = [];
  const seen = new Set<string>();

  for (const line of lineMap) {
    const matches = [...line.matchAll(isinRe)];
    if (matches.length === 0) continue;
    for (const m of matches) {
      const isin = m[1];
      const idx = m.index ?? 0;
      const before = line.slice(0, idx).trim();
      const after = line.slice(idx + isin.length).trim();
      // Extract trailing numbers from `after`
      const nums = after.match(/[\d,]+\.\d{2,4}|[\d,]{2,}/g) || [];
      const cleaned = nums.map(toNum).filter(v => v > 0);

      // Heuristic: name = `before`; pick qty, price, value from last numeric tokens.
      // Typical CAS row: <name> <ISIN> <Qty> <NAV/Price> <Value> [<%>]
      let qty = 0, price = 0, value = 0;
      if (cleaned.length >= 3) {
        // Drop possible trailing percentage value
        const last3 = cleaned.slice(-4);
        // Pick the largest as value
        value = Math.max(...last3);
        const rest = last3.filter(v => v !== value);
        // price ~ usually middle small number, qty ~ remaining
        if (rest.length >= 2) {
          rest.sort((a, b) => a - b);
          price = rest[0];
          qty = rest[1];
        } else if (rest.length === 1) {
          qty = rest[0];
          price = qty > 0 ? value / qty : 0;
        }
      } else if (cleaned.length === 2) {
        qty = cleaned[0];
        value = cleaned[1];
        price = qty > 0 ? value / qty : 0;
      } else if (cleaned.length === 1) {
        value = cleaned[0];
      }

      const name = (before || after.replace(/[\d,.%]/g, "").trim()).replace(/\s+/g, " ").slice(0, 80) || isin;
      const key = isin + "|" + name;
      if (seen.has(key)) continue;
      seen.add(key);

      if (value <= 0 && qty <= 0) continue;
      holdings.push({
        isin,
        name,
        type: classify(name, isin),
        quantity: qty,
        price,
        value,
        source: source === "Unknown" ? "NSDL" : source,
      });
    }
  }

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  return {
    source,
    asOf: asOfMatch?.[1],
    investor: investorMatch?.[1]?.trim(),
    pan: panMatch?.[1],
    holdings,
    totalValue,
    rawTextLength: fullText.length,
  };
}
