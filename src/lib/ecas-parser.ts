// Lightweight NSDL / CDSL eCAS PDF parser.
// Uses pdfjs-dist to extract text, then mines CDSL/NSDL holding tables and MF/RTA rows.
// Heuristic — works on common CAS/eCAS layouts but not guaranteed for every variant.

let _pdfjs: any = null;
async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  _pdfjs = pdfjsLib;
  return pdfjsLib;
}

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

const ISIN_RE = /\b(IN[A-Z0-9]{10})\b/g;

function normalizeLine(line: string): string {
  return line.replace(/\u00ad/g, "").replace(/\s+/g, " ").trim();
}

function extractNumberTokens(text: string): number[] {
  return text
    .split(/\s+/)
    .filter(token => /^-?[\d,]+(?:\.\d+)?$/.test(token))
    .map(toNum)
    .filter(v => Number.isFinite(v));
}

function extractLooseNumbers(text: string): number[] {
  return (text.match(/-?[\d,]+(?:\.\d+)?/g) || []).map(toNum).filter(v => Number.isFinite(v));
}

function knownIsins(fullText: string): string[] {
  return [...new Set([...fullText.matchAll(ISIN_RE)].map(m => m[1]))];
}

function findIsin(line: string, known: string[]): { isin: string; index: number; length: number } | null {
  ISIN_RE.lastIndex = 0;
  const full = ISIN_RE.exec(line);
  if (full?.index !== undefined) return { isin: full[1], index: full.index, length: full[1].length };

  // Some CDSL PDFs visually split an ISIN across lines (example: INF174KA1P + W4).
  const partial = line.match(/\b(IN[A-Z0-9]{7,10})\b/);
  if (!partial || partial.index === undefined) return null;
  const matches = known.filter(isin => isin.startsWith(partial[1]));
  if (matches.length !== 1) return null;
  return { isin: matches[0], index: partial.index, length: partial[1].length };
}

function isNoiseLine(line: string): boolean {
  return !line ||
    /^(Page \d+|Central Depository|A Wing,|Lower Parel|CONSOLIDATED ACCOUNT|Summary of|Investments|Account Details|MF Details|Notes|About CDSL)$/i.test(line) ||
    /^(ISIN|Security|Current|Frozen|Pledge|Market|Price|Face|Value|Statement of Transactions|Holding Statement|Portfolio Value|Grand Total|Load Structures)/i.test(line) ||
    /^HARSHVARDHAN NANDLAL VISHWAKARMA$/i.test(line);
}

function cleanNameLine(line: string, known: string[]): string {
  let cleaned = normalizeLine(line);
  if (isNoiseLine(cleaned)) return "";
  const found = findIsin(cleaned, known);
  if (found) {
    cleaned = `${cleaned.slice(0, found.index)} ${cleaned.slice(found.index + found.length)}`;
  }
  cleaned = cleaned
    .replace(/[*!@$#]+/g, " ")
    .replace(/^\w{3,6}\s+-\s+/, "")
    .replace(/\s+\d[\d,]*\.\d{3}\b.*$/, "")
    .replace(/\s+\d{5,}(?:\/\d+)?\s+.*$/, "")
    .replace(/\b[A-Z][0-9]\b$/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!/[A-Z]/i.test(cleaned)) return "";
  const letters = (cleaned.match(/[A-Z]/gi) || []).length;
  if (letters / Math.max(cleaned.length, 1) < 0.35) return "";
  return cleaned;
}

function looksLikeNewSecurityStart(line: string): boolean {
  if (/^(SHARES?|EQUITY|FACE|VALUE|AFTER|SUB|DIVISION|CONSOLIDATION|LIMITED\b|NEW\b|SCHEME|PURSUANT|REGULAR|DIRECT)/i.test(line)) return false;
  return /\b(LTD|LIMITED|BANK|ENERGY|MOTORS|POLYMER|VENTURES|POWER|CHEMICAL|DISTRIPARKS)\b/i.test(line);
}

function nameAround(lines: string[], index: number, found: { isin: string; index: number; length: number }, known: string[]): string {
  const parts: string[] = [];
  const previous: string[] = [];

  for (let j = index - 1; j >= Math.max(0, index - 3); j--) {
    const cleaned = cleanNameLine(lines[j], known);
    if (!cleaned) break;
    if (previous.length > 0 && looksLikeNewSecurityStart(previous[0])) break;
    previous.unshift(cleaned);
  }

  const current = lines[index];
  const before = cleanNameLine(current.slice(0, found.index), known);
  const afterRaw = current.slice(found.index + found.length).replace(/^[*!@$#\s]+/, "");
  const firstQty = afterRaw.search(/\d[\d,]*\.\d{3}\b/);
  const currentName = cleanNameLine(firstQty >= 0 ? afterRaw.slice(0, firstQty) : afterRaw, known);
  parts.push(...previous, before, currentName);

  for (let j = index + 1; j <= Math.min(lines.length - 1, index + 2); j++) {
    if (findIsin(lines[j], known) || /^Portfolio Value|^DP Name|^Grand Total/i.test(lines[j])) break;
    const cleaned = cleanNameLine(lines[j], known);
    if (!cleaned) break;
    if (looksLikeNewSecurityStart(cleaned)) break;
    parts.push(cleaned);
  }

  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").slice(0, 120) || found.isin;
}

function aggregateHoldings(holdings: Holding[]): Holding[] {
  const byIsin = new Map<string, Holding>();
  for (const h of holdings) {
    const existing = byIsin.get(h.isin);
    if (!existing) {
      byIsin.set(h.isin, { ...h });
      continue;
    }
    existing.quantity += h.quantity;
    existing.value += h.value;
    existing.price = existing.quantity > 0 ? existing.value / existing.quantity : h.price;
    if (h.name.length > existing.name.length && h.name.length <= 120) existing.name = h.name;
    if (existing.type !== "Mutual Fund" && h.type === "Mutual Fund") existing.type = h.type;
  }
  return [...byIsin.values()].sort((a, b) => b.value - a.value);
}

export async function parseECasPdf(file: File, password?: string): Promise<PortfolioParseResult> {
  const pdfjsLib = await getPdfjs();
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
      const line = normalizeLine(rows.get(y)!.sort((a, b) => a.x - b.x).map(p => p.str).join(" "));
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

  const allKnownIsins = knownIsins(fullText);
  const mined: Holding[] = [];
  let inDematHolding = false;
  let inMfHolding = false;

  for (let i = 0; i < lineMap.length; i++) {
    const line = lineMap[i];

    if (/MUTUAL FUND UNITS HELD AS ON/i.test(line)) {
      inMfHolding = true;
      inDematHolding = false;
      continue;
    }
    if (/HOLDING STATEMENT AS ON/i.test(line)) {
      inDematHolding = true;
      inMfHolding = false;
      continue;
    }
    if (/^(Portfolio Value|DP Name|STATEMENT OF TRANSACTIONS|Nil Holding)/i.test(line)) inDematHolding = false;
    if (/^(Grand Total|Load Structures)/i.test(line)) inMfHolding = false;

    if (inDematHolding) {
      const found = findIsin(line, allKnownIsins);
      if (!found) continue;
      const nums = extractLooseNumbers(line.slice(found.index + found.length)).filter(v => v >= 0);
      if (nums.length < 3) continue;
      const [quantity, price, value] = nums.slice(-3);
      if (value <= 0 && quantity <= 0) continue;
      const name = nameAround(lineMap, i, found, allKnownIsins);
      mined.push({
        isin: found.isin,
        name,
        type: classify(name, found.isin),
        quantity,
        price,
        value,
        source: source === "Unknown" ? "CDSL" : source,
      });
      continue;
    }

    if (inMfHolding) {
      const rowText = normalizeLine([line, lineMap[i + 1] || "", lineMap[i + 2] || ""].join(" "));
      const found = findIsin(rowText, allKnownIsins);
      if (!found) continue;
      let nums = extractNumberTokens(rowText.slice(found.index + found.length));
      if (nums.length >= 6 && Number.isInteger(nums[0]) && nums[0] > 100000) nums = nums.slice(1);
      if (nums.length < 4) continue;
      const quantity = nums[0];
      const price = nums[1];
      const value = nums[3];
      if (value <= 0 && quantity <= 0) continue;
      const name = nameAround(lineMap, i, found, allKnownIsins);
      mined.push({
        isin: found.isin,
        name,
        type: "Mutual Fund",
        quantity,
        price,
        value,
        source: source === "Unknown" ? "CDSL" : source,
      });
    }
  }

  const holdings = aggregateHoldings(mined);

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
