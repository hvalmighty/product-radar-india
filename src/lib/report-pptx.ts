import PptxGenJS from "pptxgenjs";
import { fmtMoney, REGION_META, getCurrentRegion } from "@/lib/region";

export interface ReportPptData {
  title: string;
  mode: "customer" | "family";
  portfolioCount: number;
  holdingsCount: number;
  totalValue: number;
  contribution: number;
  distribution: number;
  realizedGL: number;
  unrealizedGL: number;
  byAssetClass: { name: string; value: number; pct: number; ret: number; bench: { name: string; ret: number } }[];
  topIssuers: { name: string; value: number; pct: number }[];
  bySector: { name: string; pct: number }[];
  byMarketCap: { name: string; pct: number }[];
  byRating: { name: string; pct: number }[];
  liquidity: { name: string; value: number; pct: number }[];
  mfAMC: { name: string; value: number; count: number; ret: number }[];
  riskProfile: string;
  targetVsCurrent: { name: string; target: number; current: number }[];
}

const ACCENT = "4F46E5";
const DARK = "0F172A";
const MUTED = "64748B";
const LIGHT_BG = "F8FAFC";

function pctStr(n: number, d = 1) { return `${n.toFixed(d)}%`; }

export function exportReportToPptx(data: ReportPptData) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5
  pptx.title = `${data.title} – Portfolio Analytics`;
  const region = REGION_META[getCurrentRegion()];

  // ---- Slide 1: Title ----
  const s1 = pptx.addSlide();
  s1.background = { color: DARK };
  s1.addText(data.mode === "family" ? "FAMILY PORTFOLIO REPORT" : "CUSTOMER PORTFOLIO REPORT", {
    x: 0.6, y: 2.4, w: 12, h: 0.4,
    fontSize: 14, color: "94A3B8", bold: true, charSpacing: 4,
  });
  s1.addText(data.title, {
    x: 0.6, y: 2.9, w: 12, h: 1.4,
    fontSize: 48, color: "FFFFFF", bold: true, fontFace: "Calibri",
  });
  s1.addText(`${data.portfolioCount} portfolio${data.portfolioCount > 1 ? "s" : ""}  ·  ${data.holdingsCount} holdings  ·  ${region.label}`, {
    x: 0.6, y: 4.4, w: 12, h: 0.4, fontSize: 16, color: "CBD5E1",
  });
  s1.addText(`Generated ${new Date().toLocaleString()}`, {
    x: 0.6, y: 6.8, w: 12, h: 0.3, fontSize: 11, color: "64748B",
  });

  // ---- Slide 2: Executive Summary ----
  const s2 = pptx.addSlide();
  addHeader(s2, "Executive Summary", data.title);
  const cards = [
    { label: "Total Portfolio Value", value: fmtMoney(data.totalValue), color: ACCENT },
    { label: "Net Contribution", value: fmtMoney(data.contribution), color: "0891B2" },
    { label: "Realized G/L", value: fmtMoney(data.realizedGL), color: data.realizedGL >= 0 ? "059669" : "DC2626" },
    { label: "Unrealized G/L", value: fmtMoney(data.unrealizedGL), color: data.unrealizedGL >= 0 ? "059669" : "DC2626" },
  ];
  const cardW = 2.9, cardH = 1.5, gap = 0.2;
  const startX = (13.333 - (cards.length * cardW + (cards.length - 1) * gap)) / 2;
  cards.forEach((c, i) => {
    const x = startX + i * (cardW + gap);
    s2.addShape(pptx.ShapeType.roundRect, { x, y: 1.6, w: cardW, h: cardH, fill: { color: LIGHT_BG }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1 });
    s2.addText(c.label, { x: x + 0.2, y: 1.75, w: cardW - 0.4, h: 0.35, fontSize: 11, color: MUTED, bold: true });
    s2.addText(c.value, { x: x + 0.2, y: 2.15, w: cardW - 0.4, h: 0.8, fontSize: 24, color: c.color, bold: true });
  });

  // Asset class snapshot table
  s2.addText("Asset Class Allocation", { x: 0.6, y: 3.4, w: 12, h: 0.3, fontSize: 14, bold: true, color: DARK });
  const acRows: any[][] = [
    [
      { text: "Asset Class", options: { bold: true, fill: DARK, color: "FFFFFF" } },
      { text: "Value", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
      { text: "% Mix", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
      { text: "Return", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
      { text: "Benchmark", options: { bold: true, fill: DARK, color: "FFFFFF" } },
      { text: "BM Return", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
    ],
    ...data.byAssetClass.slice(0, 8).map(a => [
      { text: a.name, options: { color: DARK } },
      { text: fmtMoney(a.value), options: { align: "right" } },
      { text: pctStr(a.pct), options: { align: "right" } },
      { text: pctStr(a.ret), options: { align: "right", color: a.ret >= 0 ? "059669" : "DC2626", bold: true } },
      { text: a.bench.name, options: { color: MUTED } },
      { text: pctStr(a.bench.ret), options: { align: "right", color: MUTED } },
    ]),
  ];
  s2.addTable(acRows, { x: 0.6, y: 3.75, w: 12.1, fontSize: 10, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [2.6, 2, 1.4, 1.4, 3.3, 1.4] });
  addFooter(s2, 2);

  // ---- Slide 3: Allocation chart ----
  const s3 = pptx.addSlide();
  addHeader(s3, "Allocation Mix", data.title);
  s3.addChart(pptx.ChartType.doughnut, [{
    name: "Asset Class",
    labels: data.byAssetClass.map(a => a.name),
    values: data.byAssetClass.map(a => Number(a.pct.toFixed(2))),
  }], {
    x: 0.5, y: 1.3, w: 6.5, h: 5.6, showLegend: true, legendPos: "b",
    chartColors: ["4F46E5", "10B981", "F59E0B", "EF4444", "8B5CF6", "06B6D4", "EC4899", "84CC16", "F97316", "64748B"],
    dataLabelFormatCode: "0.0\"%\"", showPercent: false, showValue: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 9,
  });
  // Sector bar on right
  if (data.bySector.length) {
    s3.addText("Equity Sector Mix", { x: 7.3, y: 1.3, w: 5.5, h: 0.35, fontSize: 13, bold: true, color: DARK });
    s3.addChart(pptx.ChartType.bar, [{
      name: "Sector %",
      labels: data.bySector.slice(0, 8).map(s => s.name),
      values: data.bySector.slice(0, 8).map(s => Number(s.pct.toFixed(2))),
    }], {
      x: 7.3, y: 1.7, w: 5.5, h: 5.2, barDir: "bar", chartColors: [ACCENT],
      showValue: true, dataLabelFormatCode: "0.0\"%\"", catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      showLegend: false,
    });
  }
  addFooter(s3, 3);

  // ---- Slide 4: Top Issuers & Concentration ----
  const s4 = pptx.addSlide();
  addHeader(s4, "Top Issuers & Concentration", data.title);
  const issuerRows: any[][] = [
    [
      { text: "#", options: { bold: true, fill: DARK, color: "FFFFFF" } },
      { text: "Issuer", options: { bold: true, fill: DARK, color: "FFFFFF" } },
      { text: "Value", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
      { text: "% of Portfolio", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
    ],
    ...data.topIssuers.slice(0, 10).map((iss, i) => [
      { text: String(i + 1), options: { color: MUTED } },
      { text: iss.name },
      { text: fmtMoney(iss.value), options: { align: "right" } },
      { text: pctStr(iss.pct), options: { align: "right", bold: true, color: ACCENT } },
    ]),
  ];
  s4.addTable(issuerRows, { x: 0.6, y: 1.3, w: 6.5, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [0.5, 3.2, 1.6, 1.2] });

  if (data.byMarketCap.length) {
    s4.addText("Market Cap Mix", { x: 7.5, y: 1.3, w: 5.3, h: 0.35, fontSize: 13, bold: true, color: DARK });
    s4.addChart(pptx.ChartType.pie, [{
      name: "Market Cap",
      labels: data.byMarketCap.map(m => m.name),
      values: data.byMarketCap.map(m => Number(m.pct.toFixed(2))),
    }], { x: 7.5, y: 1.7, w: 5.3, h: 2.6, showLegend: true, legendPos: "r", chartColors: ["4F46E5", "10B981", "F59E0B", "EF4444"], showPercent: true });
  }

  if (data.byRating.length) {
    s4.addText("Credit Rating Mix", { x: 7.5, y: 4.4, w: 5.3, h: 0.35, fontSize: 13, bold: true, color: DARK });
    s4.addChart(pptx.ChartType.pie, [{
      name: "Rating",
      labels: data.byRating.map(r => r.name),
      values: data.byRating.map(r => Number(r.pct.toFixed(2))),
    }], { x: 7.5, y: 4.75, w: 5.3, h: 2.4, showLegend: true, legendPos: "r", chartColors: ["059669", "10B981", "F59E0B", "F97316", "EF4444"], showPercent: true });
  }
  addFooter(s4, 4);

  // ---- Slide 5: Liquidity & Risk vs Target ----
  const s5 = pptx.addSlide();
  addHeader(s5, "Liquidity & Risk Profile", data.title);
  s5.addText("Liquidity Buckets", { x: 0.5, y: 1.3, w: 6, h: 0.35, fontSize: 13, bold: true, color: DARK });
  s5.addChart(pptx.ChartType.bar, [{
    name: "Liquidity %",
    labels: data.liquidity.map(l => l.name),
    values: data.liquidity.map(l => Number(l.pct.toFixed(2))),
  }], {
    x: 0.5, y: 1.7, w: 6.2, h: 5.2, barDir: "bar", chartColors: ["0891B2"],
    showValue: true, dataLabelFormatCode: "0.0\"%\"", showLegend: false,
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
  });

  s5.addText(`Target vs Current (${data.riskProfile})`, { x: 7, y: 1.3, w: 6, h: 0.35, fontSize: 13, bold: true, color: DARK });
  s5.addChart(pptx.ChartType.bar, [
    { name: "Current %", labels: data.targetVsCurrent.map(t => t.name), values: data.targetVsCurrent.map(t => Number(t.current.toFixed(2))) },
    { name: "Target %", labels: data.targetVsCurrent.map(t => t.name), values: data.targetVsCurrent.map(t => Number(t.target.toFixed(2))) },
  ], {
    x: 7, y: 1.7, w: 5.8, h: 5.2, barDir: "bar", chartColors: [ACCENT, "94A3B8"],
    showValue: false, showLegend: true, legendPos: "b",
    catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
  });
  addFooter(s5, 5);

  // ---- Slide 6: MF AMC ----
  if (data.mfAMC.length > 0) {
    const s6 = pptx.addSlide();
    addHeader(s6, "Mutual Fund AMC Drilldown", data.title);
    const mfRows: any[][] = [
      [
        { text: "AMC", options: { bold: true, fill: DARK, color: "FFFFFF" } },
        { text: "Schemes", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
        { text: "Value", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
        { text: "Return", options: { bold: true, fill: DARK, color: "FFFFFF", align: "right" } },
      ],
      ...data.mfAMC.slice(0, 12).map(a => [
        { text: a.name },
        { text: String(a.count), options: { align: "right", color: MUTED } },
        { text: fmtMoney(a.value), options: { align: "right" } },
        { text: pctStr(a.ret), options: { align: "right", bold: true, color: a.ret >= 0 ? "059669" : "DC2626" } },
      ]),
    ];
    s6.addTable(mfRows, { x: 0.6, y: 1.3, w: 12.1, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [5.5, 1.6, 2.5, 2.5] });
    addFooter(s6, 6);
  }

  // ---- Final slide: Disclaimer ----
  const sEnd = pptx.addSlide();
  sEnd.background = { color: DARK };
  sEnd.addText("Disclaimer", { x: 0.6, y: 0.8, w: 12, h: 0.5, fontSize: 22, bold: true, color: "FFFFFF" });
  sEnd.addText(
    "This report is generated for informational purposes only based on the data provided by the customer. " +
    "Values, returns and benchmarks are indicative. Past performance is not indicative of future returns. " +
    "Please consult your relationship manager before acting on any of the analytics presented.",
    { x: 0.6, y: 1.6, w: 12, h: 3, fontSize: 14, color: "CBD5E1" }
  );
  sEnd.addText("mPower Wealth · Portfolio Analytics", { x: 0.6, y: 6.8, w: 12, h: 0.3, fontSize: 11, color: "64748B" });

  const safe = data.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 48);
  pptx.writeFile({ fileName: `${safe}_Portfolio_Report.pptx` });
}

function addHeader(slide: PptxGenJS.Slide, title: string, sub: string) {
  slide.addShape("rect" as any, { x: 0, y: 0, w: 13.333, h: 0.8, fill: { color: DARK }, line: { color: DARK } });
  slide.addText(title, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 18, bold: true, color: "FFFFFF" });
  slide.addText(sub, { x: 9.5, y: 0.2, w: 3.6, h: 0.4, fontSize: 11, color: "94A3B8", align: "right" });
}

function addFooter(slide: PptxGenJS.Slide, pageNum: number) {
  slide.addText(`mPower Wealth  ·  Portfolio Analytics  ·  Page ${pageNum}`, {
    x: 0.5, y: 7.15, w: 12.3, h: 0.3, fontSize: 9, color: MUTED, align: "right",
  });
}
