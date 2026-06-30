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
  portfolioPE: number;
  portfolioPB: number;
  portfolioYTM: number;
  portfolioDuration: number;
  byAssetClass: { name: string; value: number; pct: number; ret: number; count: number; bench: { name: string; ret: number } }[];
  topIssuers: { name: string; value: number; pct: number }[];
  bySector: { name: string; pct: number }[];
  byMarketCap: { name: string; pct: number }[];
  byRating: { name: string; pct: number }[];
  liquidity: { name: string; value: number; pct: number }[];
  upcomingCF: { bucket: string; coupon: number; maturity: number }[];
  mfAMC: { name: string; value: number; count: number; ret: number }[];
  riskProfile: string;
  targetVsCurrent: { name: string; target: number; current: number }[];
  productHoldings: { assetClass: string; total: number; pct: number; rows: { name: string; isin: string; value: number; pct: number; ret: number }[] }[];
  mfOverlap: { names: string[]; matrix: number[][] };
  fixedIncomeMF: { name: string; value: number; ytm: number; duration: number; maturity: number; credit: string }[];
  bondHoldings: { isin: string; name: string; rating: string; quantity: number; value: number }[];
  benchmarks: { assetClass: string; benchmark: string; ret: number }[];
  commentary: {
    blendedReturn: number;
    blendedBench: number;
    alpha: number;
    riskBand: string;
    riskScore: number;
    top5Concentration: number;
    advisorSummary: string;
    performance: { kind: "good" | "warn" | "info"; text: string }[];
    concentration: { kind: "good" | "warn" | "info"; text: string }[];
    risk: { kind: "good" | "warn" | "info"; text: string }[];
    comparative: { kind: "good" | "warn" | "info"; text: string }[];
  };
}

const ACCENT = "4F46E5";
const DARK = "0F172A";
const MUTED = "64748B";
const LIGHT_BG = "F8FAFC";
const POS = "059669";
const NEG = "DC2626";
const WARN = "D97706";
const PALETTE = ["4F46E5", "10B981", "F59E0B", "EF4444", "8B5CF6", "06B6D4", "EC4899", "84CC16", "F97316", "64748B"];

function pctStr(n: number, d = 1) { return `${n.toFixed(d)}%`; }
function headerCell(text: string, align: "left" | "right" = "left"): any {
  return { text, options: { bold: true, fill: DARK, color: "FFFFFF", align, valign: "middle" } };
}

let _pageNum = 0;
function nextPage() { return ++_pageNum; }

export function exportReportToPptx(data: ReportPptData) {
  _pageNum = 0;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = `${data.title} – Portfolio Analytics`;
  const region = REGION_META[getCurrentRegion()];

  // ---- Title Slide ----
  const s1 = pptx.addSlide();
  s1.background = { color: DARK };
  s1.addShape(pptx.ShapeType.rect, { x: 0, y: 6.5, w: 13.333, h: 1, fill: { color: ACCENT }, line: { color: ACCENT } });
  s1.addText(data.mode === "family" ? "FAMILY PORTFOLIO REPORT" : "CUSTOMER PORTFOLIO REPORT", {
    x: 0.6, y: 2.2, w: 12, h: 0.4, fontSize: 14, color: "94A3B8", bold: true, charSpacing: 4,
  });
  s1.addText(data.title, {
    x: 0.6, y: 2.7, w: 12, h: 1.4, fontSize: 48, color: "FFFFFF", bold: true,
  });
  s1.addText(`${data.portfolioCount} portfolio${data.portfolioCount > 1 ? "s" : ""}  ·  ${data.holdingsCount} holdings  ·  ${region.label}`, {
    x: 0.6, y: 4.2, w: 12, h: 0.4, fontSize: 16, color: "CBD5E1",
  });
  s1.addText(`Total Portfolio Value: ${fmtMoney(data.totalValue)}`, {
    x: 0.6, y: 4.8, w: 12, h: 0.5, fontSize: 22, color: ACCENT, bold: true,
  });
  s1.addText(`Generated ${new Date().toLocaleString()}`, {
    x: 0.6, y: 5.6, w: 12, h: 0.3, fontSize: 12, color: "94A3B8",
  });
  s1.addText("mPower Wealth · Portfolio Analytics", { x: 0.6, y: 6.85, w: 12, h: 0.3, fontSize: 12, color: "FFFFFF", bold: true });

  // ---- Table of Contents ----
  const sToc = pptx.addSlide();
  addHeader(sToc, "Report Contents", data.title);
  const toc = [
    "1. Executive Summary — KPIs, cashflow, target vs current, asset performance vs benchmark",
    "2. Portfolio Commentary — Performance, Concentration, Risk, Comparative Analysis",
    "3. Asset Class Performance — Holdings, returns, benchmarks, alpha",
    "4. Liquidity & Cashflows — Liquidity buckets, upcoming coupons & maturities",
    "5. Product Holdings — Security-wise breakdown per asset class",
    "6. Portfolio Drilldown — Top issuers, sector, market cap, credit rating",
    "7. Mutual Fund Drilldown — AMC summary, overlap matrix, fixed-income analytics",
    "8. Annexures — Benchmark mapping, bond ISIN list",
  ];
  toc.forEach((t, i) => {
    sToc.addText(t, { x: 0.8, y: 1.3 + i * 0.55, w: 11.5, h: 0.5, fontSize: 14, color: DARK });
  });
  addFooter(sToc, nextPage());

  // ============================================================
  // SECTION 1: EXECUTIVE SUMMARY
  // ============================================================
  const s2 = pptx.addSlide();
  addHeader(s2, "1. Executive Summary", data.title);
  const kpis = [
    { label: "Portfolio Value", value: fmtMoney(data.totalValue), color: ACCENT },
    { label: "Portfolio P/E", value: data.portfolioPE.toFixed(1), color: "0891B2" },
    { label: "Portfolio P/B", value: data.portfolioPB.toFixed(2), color: "0891B2" },
    { label: "Portfolio YTM", value: pctStr(data.portfolioYTM, 2), color: "0891B2" },
  ];
  drawKpiCards(s2, kpis, 1.1);

  // Cashflow cards
  const cf = [
    { label: "Contribution", value: fmtMoney(data.contribution), color: DARK },
    { label: "Distribution", value: fmtMoney(data.distribution), color: DARK },
    { label: "Realized G/L", value: fmtMoney(data.realizedGL), color: data.realizedGL >= 0 ? POS : NEG },
    { label: "Unrealized G/L", value: fmtMoney(data.unrealizedGL), color: data.unrealizedGL >= 0 ? POS : NEG },
    { label: "Closing Value", value: fmtMoney(data.totalValue), color: ACCENT },
  ];
  s2.addText("Portfolio Cashflow Summary", { x: 0.5, y: 3.1, w: 12.3, h: 0.3, fontSize: 14, bold: true, color: DARK });
  const cw = (13.333 - 1 - 0.15 * 4) / 5;
  cf.forEach((c, i) => {
    const x = 0.5 + i * (cw + 0.15);
    s2.addShape(pptx.ShapeType.roundRect, { x, y: 3.45, w: cw, h: 1.15, fill: { color: LIGHT_BG }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.08 });
    s2.addText(c.label, { x: x + 0.15, y: 3.55, w: cw - 0.3, h: 0.3, fontSize: 10, color: MUTED, bold: true });
    s2.addText(c.value, { x: x + 0.15, y: 3.85, w: cw - 0.3, h: 0.65, fontSize: 18, color: c.color, bold: true });
  });

  // Cashflow bar chart
  s2.addChart(pptx.ChartType.bar, [{
    name: "Amount",
    labels: ["Contribution", "Distribution", "Realized G/L", "Unrealized G/L", "Closing"],
    values: [data.contribution, data.distribution, data.realizedGL, data.unrealizedGL, data.totalValue].map(v => Number(v.toFixed(0))),
  }], {
    x: 0.5, y: 4.85, w: 12.3, h: 2.2, barDir: "col", chartColors: [ACCENT],
    showValue: false, showLegend: false, catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
  });
  addFooter(s2, nextPage());

  // Slide: Target vs Current + Asset vs Benchmark
  const s3 = pptx.addSlide();
  addHeader(s3, `1. Target vs Current (${data.riskProfile}) & Asset Performance`, data.title);
  s3.addText(`Risk Profile: ${data.riskProfile} — Target vs Current Allocation`, { x: 0.5, y: 1.0, w: 6, h: 0.35, fontSize: 12, bold: true, color: DARK });
  s3.addChart(pptx.ChartType.bar, [
    { name: "Target %", labels: data.targetVsCurrent.map(t => t.name), values: data.targetVsCurrent.map(t => Number(t.target.toFixed(2))) },
    { name: "Current %", labels: data.targetVsCurrent.map(t => t.name), values: data.targetVsCurrent.map(t => Number(t.current.toFixed(2))) },
  ], {
    x: 0.5, y: 1.4, w: 6.1, h: 5.6, barDir: "bar", chartColors: ["94A3B8", ACCENT],
    showLegend: true, legendPos: "b", catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
  });

  s3.addText("Asset Class Performance vs Benchmark", { x: 6.85, y: 1.0, w: 6, h: 0.35, fontSize: 12, bold: true, color: DARK });
  s3.addChart(pptx.ChartType.bar, [
    { name: "Portfolio", labels: data.byAssetClass.map(a => a.name.replace("Mutual Fund - ", "MF ")), values: data.byAssetClass.map(a => Number(a.ret.toFixed(2))) },
    { name: "Benchmark", labels: data.byAssetClass.map(a => a.name.replace("Mutual Fund - ", "MF ")), values: data.byAssetClass.map(a => Number(a.bench.ret.toFixed(2))) },
  ], {
    x: 6.85, y: 1.4, w: 6.0, h: 5.6, barDir: "col", chartColors: [POS, "94A3B8"],
    showLegend: true, legendPos: "b", catAxisLabelFontSize: 8, valAxisLabelFontSize: 9,
    catAxisLabelRotate: -25,
  });
  addFooter(s3, nextPage());

  // Allocation mix slide
  const sAlloc = pptx.addSlide();
  addHeader(sAlloc, "1. Allocation Mix — Asset Class & Equity Sector", data.title);
  sAlloc.addChart(pptx.ChartType.doughnut, [{
    name: "Asset Class",
    labels: data.byAssetClass.map(a => a.name),
    values: data.byAssetClass.map(a => Number(a.pct.toFixed(2))),
  }], {
    x: 0.4, y: 1.1, w: 6.5, h: 5.9, showLegend: true, legendPos: "b", chartColors: PALETTE,
    dataLabelFormatCode: "0.0\"%\"", showValue: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 9,
  });
  if (data.bySector.length) {
    sAlloc.addText("Equity Sector Mix", { x: 7.1, y: 1.0, w: 5.8, h: 0.35, fontSize: 13, bold: true, color: DARK });
    sAlloc.addChart(pptx.ChartType.bar, [{
      name: "Sector %",
      labels: data.bySector.slice(0, 10).map(s => s.name),
      values: data.bySector.slice(0, 10).map(s => Number(s.pct.toFixed(2))),
    }], {
      x: 7.1, y: 1.4, w: 5.8, h: 5.5, barDir: "bar", chartColors: [ACCENT],
      showValue: true, dataLabelFormatCode: "0.0\"%\"", catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
      showLegend: false,
    });
  }
  addFooter(sAlloc, nextPage());

  // ============================================================
  // SECTION 2: COMMENTARY
  // ============================================================
  const sCom = pptx.addSlide();
  addHeader(sCom, "2. Portfolio Commentary — KPIs", data.title);
  drawKpiCards(sCom, [
    { label: "Blended Return", value: pctStr(data.commentary.blendedReturn), color: data.commentary.blendedReturn >= 0 ? POS : NEG },
    { label: "Portfolio Alpha", value: `${data.commentary.alpha >= 0 ? "+" : ""}${data.commentary.alpha.toFixed(1)}%`, color: data.commentary.alpha >= 0 ? POS : NEG },
    { label: "Risk Band", value: `${data.commentary.riskBand} (${data.commentary.riskScore}/10)`, color: ACCENT },
    { label: "Top-5 Concentration", value: pctStr(data.commentary.top5Concentration), color: data.commentary.top5Concentration > 50 ? WARN : DARK },
  ], 1.1);
  sCom.addText("Advisor Summary", { x: 0.5, y: 3.0, w: 12.3, h: 0.35, fontSize: 14, bold: true, color: DARK });
  sCom.addShape(pptx.ShapeType.roundRect, { x: 0.5, y: 3.4, w: 12.3, h: 3.6, fill: { color: LIGHT_BG }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1 });
  sCom.addText(data.commentary.advisorSummary, { x: 0.7, y: 3.55, w: 12.0, h: 3.4, fontSize: 13, color: DARK, valign: "top" });
  addFooter(sCom, nextPage());

  // Commentary detail slides (2 per slide for readability)
  const commentaryGroups: { title: string; items: { kind: "good" | "warn" | "info"; text: string }[] }[] = [
    { title: "Performance", items: data.commentary.performance },
    { title: "Concentration", items: data.commentary.concentration },
    { title: "Risk", items: data.commentary.risk },
    { title: "Comparative Analysis", items: data.commentary.comparative },
  ];
  for (let i = 0; i < commentaryGroups.length; i += 2) {
    const slide = pptx.addSlide();
    addHeader(slide, `2. Commentary — ${commentaryGroups[i].title}${commentaryGroups[i + 1] ? " & " + commentaryGroups[i + 1].title : ""}`, data.title);
    drawCommentaryBlock(slide, commentaryGroups[i], 0.5, 1.1, 6.1);
    if (commentaryGroups[i + 1]) drawCommentaryBlock(slide, commentaryGroups[i + 1], 6.8, 1.1, 6.0);
    addFooter(slide, nextPage());
  }

  // ============================================================
  // SECTION 3: ASSET CLASS PERFORMANCE TABLE
  // ============================================================
  const sAC = pptx.addSlide();
  addHeader(sAC, "3. Asset Class Performance", data.title);
  const acRows: any[][] = [
    [
      headerCell("Asset Class"),
      headerCell("Holdings", "right"),
      headerCell("Value", "right"),
      headerCell("% Alloc", "right"),
      headerCell("Return (SI)", "right"),
      headerCell("Benchmark"),
      headerCell("BM Ret", "right"),
      headerCell("Alpha", "right"),
    ],
    ...data.byAssetClass.map(a => {
      const alpha = a.ret - a.bench.ret;
      return [
        { text: a.name, options: { color: DARK, bold: true } },
        { text: String(a.count), options: { align: "right" } },
        { text: fmtMoney(a.value), options: { align: "right" } },
        { text: pctStr(a.pct), options: { align: "right" } },
        { text: pctStr(a.ret), options: { align: "right", color: a.ret >= 0 ? POS : NEG, bold: true } },
        { text: a.bench.name, options: { color: MUTED, fontSize: 9 } },
        { text: pctStr(a.bench.ret), options: { align: "right", color: MUTED } },
        { text: `${alpha >= 0 ? "+" : ""}${alpha.toFixed(1)}%`, options: { align: "right", bold: true, color: alpha >= 0 ? POS : NEG } },
      ];
    }),
  ];
  sAC.addTable(acRows, { x: 0.4, y: 1.1, w: 12.5, fontSize: 10, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [2.2, 0.9, 1.5, 1.0, 1.2, 3.4, 1.0, 1.3] });
  addFooter(sAC, nextPage());

  // ============================================================
  // SECTION 4: LIQUIDITY & CASHFLOWS
  // ============================================================
  const sLiq = pptx.addSlide();
  addHeader(sLiq, "4. Liquidity Profile & Upcoming Cashflows", data.title);
  sLiq.addText("Liquidity Profile", { x: 0.5, y: 1.0, w: 6, h: 0.35, fontSize: 12, bold: true, color: DARK });
  sLiq.addChart(pptx.ChartType.doughnut, [{
    name: "Liquidity",
    labels: data.liquidity.map(l => l.name),
    values: data.liquidity.map(l => Number(l.pct.toFixed(2))),
  }], {
    x: 0.4, y: 1.4, w: 6.2, h: 5.6, showLegend: true, legendPos: "b", chartColors: PALETTE,
    dataLabelFormatCode: "0.0\"%\"", showValue: true, dataLabelColor: "FFFFFF", dataLabelFontSize: 9,
  });

  sLiq.addText("Upcoming Cashflows — Next 180 Days", { x: 6.85, y: 1.0, w: 6, h: 0.35, fontSize: 12, bold: true, color: DARK });
  sLiq.addChart(pptx.ChartType.bar, [
    { name: "Coupon", labels: data.upcomingCF.map(c => c.bucket), values: data.upcomingCF.map(c => Number(c.coupon.toFixed(0))) },
    { name: "Maturity", labels: data.upcomingCF.map(c => c.bucket), values: data.upcomingCF.map(c => Number(c.maturity.toFixed(0))) },
  ], {
    x: 6.85, y: 1.4, w: 6.0, h: 5.6, barDir: "col", barGrouping: "stacked", chartColors: [POS, ACCENT],
    showLegend: true, legendPos: "b", catAxisLabelFontSize: 9, valAxisLabelFontSize: 9,
  });
  addFooter(sLiq, nextPage());

  // ============================================================
  // SECTION 5: PRODUCT HOLDINGS (multi-slide)
  // ============================================================
  for (const ph of data.productHoldings) {
    if (!ph.rows.length) continue;
    const slide = pptx.addSlide();
    addHeader(slide, `5. ${ph.assetClass} — ${fmtMoney(ph.total)} (${pctStr(ph.pct)})`, data.title);
    const rows: any[][] = [
      [headerCell("Scheme / Security"), headerCell("ISIN"), headerCell("Value", "right"), headerCell("% Sleeve", "right"), headerCell("Return", "right")],
      ...ph.rows.slice(0, 14).map(r => [
        { text: r.name, options: { fontSize: 9 } },
        { text: r.isin, options: { color: MUTED, fontSize: 9 } },
        { text: fmtMoney(r.value), options: { align: "right" } },
        { text: pctStr(r.pct), options: { align: "right" } },
        { text: pctStr(r.ret), options: { align: "right", bold: true, color: r.ret >= 0 ? POS : NEG } },
      ]),
    ];
    slide.addTable(rows, { x: 0.4, y: 1.1, w: 12.5, fontSize: 10, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [5.0, 2.0, 2.0, 1.5, 2.0] });
    if (ph.rows.length > 14) {
      slide.addText(`+ ${ph.rows.length - 14} more holdings`, { x: 0.4, y: 6.9, w: 12, h: 0.25, fontSize: 9, color: MUTED, italic: true });
    }
    addFooter(slide, nextPage());
  }

  // AMC summary
  if (data.mfAMC.length > 0) {
    const sAmc = pptx.addSlide();
    addHeader(sAmc, "5. AMC-wise Performance Summary", data.title);
    const totalMF = data.mfAMC.reduce((s, x) => s + x.value, 0) || 1;
    const mfRows: any[][] = [
      [headerCell("AMC"), headerCell("Schemes", "right"), headerCell("Value", "right"), headerCell("% of MF", "right"), headerCell("Weighted Return", "right")],
      ...data.mfAMC.map(a => [
        { text: a.name, options: { bold: true } },
        { text: String(a.count), options: { align: "right", color: MUTED } },
        { text: fmtMoney(a.value), options: { align: "right" } },
        { text: pctStr((a.value / totalMF) * 100), options: { align: "right" } },
        { text: pctStr(a.ret), options: { align: "right", bold: true, color: a.ret >= 0 ? POS : NEG } },
      ]),
    ];
    sAmc.addTable(mfRows, { x: 0.5, y: 1.1, w: 12.3, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [4.5, 1.6, 2.4, 1.8, 2.0] });
    addFooter(sAmc, nextPage());
  }

  // ============================================================
  // SECTION 6: PORTFOLIO DRILLDOWN
  // ============================================================
  const sIss = pptx.addSlide();
  addHeader(sIss, "6. Top Issuers & Sector Concentration", data.title);
  const issuerRows: any[][] = [
    [headerCell("#"), headerCell("Issuer"), headerCell("Value", "right"), headerCell("% of Portfolio", "right")],
    ...data.topIssuers.slice(0, 10).map((iss, i) => [
      { text: String(i + 1), options: { color: MUTED } },
      { text: iss.name, options: { bold: true } },
      { text: fmtMoney(iss.value), options: { align: "right" } },
      { text: pctStr(iss.pct), options: { align: "right", bold: true, color: ACCENT } },
    ]),
  ];
  sIss.addTable(issuerRows, { x: 0.5, y: 1.1, w: 6.3, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [0.5, 3.2, 1.4, 1.2] });

  if (data.bySector.length) {
    sIss.addText("Sector Concentration (Equity)", { x: 7.1, y: 1.0, w: 5.8, h: 0.3, fontSize: 12, bold: true, color: DARK });
    sIss.addChart(pptx.ChartType.pie, [{
      name: "Sector",
      labels: data.bySector.map(s => s.name),
      values: data.bySector.map(s => Number(s.pct.toFixed(2))),
    }], { x: 7.1, y: 1.4, w: 5.8, h: 5.6, showLegend: true, legendPos: "r", chartColors: PALETTE, showPercent: true });
  }
  addFooter(sIss, nextPage());

  // Market cap + rating
  const sMc = pptx.addSlide();
  addHeader(sMc, "6. Market Cap & Credit Rating Mix", data.title);
  if (data.byMarketCap.length) {
    sMc.addText("Market Cap Mix (Equity)", { x: 0.5, y: 1.0, w: 6, h: 0.3, fontSize: 12, bold: true, color: DARK });
    sMc.addChart(pptx.ChartType.pie, [{
      name: "Market Cap",
      labels: data.byMarketCap.map(m => m.name),
      values: data.byMarketCap.map(m => Number(m.pct.toFixed(2))),
    }], { x: 0.4, y: 1.4, w: 6.2, h: 5.6, showLegend: true, legendPos: "b", chartColors: ["4F46E5", "10B981", "F59E0B", "EF4444"], showPercent: true });
  }
  if (data.byRating.length) {
    sMc.addText("Credit Rating Profile (Debt)", { x: 6.85, y: 1.0, w: 6, h: 0.3, fontSize: 12, bold: true, color: DARK });
    sMc.addChart(pptx.ChartType.bar, [{
      name: "Rating %",
      labels: data.byRating.map(r => r.name),
      values: data.byRating.map(r => Number(r.pct.toFixed(2))),
    }], {
      x: 6.85, y: 1.4, w: 6.0, h: 5.6, barDir: "col", chartColors: [POS],
      showValue: true, dataLabelFormatCode: "0.0\"%\"", showLegend: false,
      catAxisLabelFontSize: 10, valAxisLabelFontSize: 9,
    });
  }
  addFooter(sMc, nextPage());

  // ============================================================
  // SECTION 7: MF DRILLDOWN — OVERLAP
  // ============================================================
  if (data.mfOverlap.names.length > 0) {
    const sOv = pptx.addSlide();
    addHeader(sOv, `7. Equity MF Overlap (${data.mfOverlap.names.length} funds)`, data.title);
    const labels = data.mfOverlap.names.map(n => n.split(/\s+/).slice(0, 3).join(" "));
    const headerRow = [headerCell("Fund"), ...labels.map(l => headerCell(l, "right"))];
    const matrixRows: any[][] = [
      headerRow,
      ...data.mfOverlap.matrix.map((row, i) => [
        { text: labels[i], options: { bold: true, fontSize: 9 } },
        ...row.map((v, j) => {
          const isDiag = i === j;
          const intensity = Math.min(1, v / 100);
          const r = Math.round(255 - intensity * 156);
          const g = Math.round(255 - intensity * 153);
          const b = Math.round(255 - intensity * 50);
          const bg = isDiag ? "374151" : rgbToHex(r, g, b);
          return { text: String(v), options: { align: "center", fill: bg, color: isDiag || intensity > 0.55 ? "FFFFFF" : DARK, fontSize: 9, bold: true } };
        }),
      ]),
    ];
    sOv.addTable(matrixRows, { x: 0.4, y: 1.1, w: 12.5, fontSize: 9, border: { type: "solid", color: "E2E8F0", pt: 0.5 } });
    sOv.addText("Values represent % of common holdings (by weight) between fund pairs. Higher % = more overlap.", { x: 0.4, y: 6.9, w: 12.5, h: 0.3, fontSize: 9, color: MUTED, italic: true });
    addFooter(sOv, nextPage());
  }

  // Fixed Income MF
  if (data.fixedIncomeMF.length > 0) {
    const chunks = chunk(data.fixedIncomeMF, 14);
    chunks.forEach((rows, idx) => {
      const slide = pptx.addSlide();
      addHeader(slide, `7. Fixed Income MF Analysis${chunks.length > 1 ? ` (${idx + 1}/${chunks.length})` : ""}`, data.title);
      const tableRows: any[][] = [
        [headerCell("Scheme"), headerCell("Value", "right"), headerCell("YTM", "right"), headerCell("Mod Dur", "right"), headerCell("Avg Mat", "right"), headerCell("Credit Quality")],
        ...rows.map(r => [
          { text: r.name, options: { fontSize: 9 } },
          { text: fmtMoney(r.value), options: { align: "right" } },
          { text: pctStr(r.ytm, 2), options: { align: "right" } },
          { text: `${r.duration.toFixed(1)}y`, options: { align: "right" } },
          { text: `${r.maturity.toFixed(1)}y`, options: { align: "right" } },
          { text: r.credit, options: { color: MUTED } },
        ]),
      ];
      slide.addTable(tableRows, { x: 0.4, y: 1.1, w: 12.5, fontSize: 10, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [5.0, 1.8, 1.2, 1.3, 1.3, 1.9] });
      addFooter(slide, nextPage());
    });
  }

  // ============================================================
  // SECTION 8: ANNEXURES
  // ============================================================
  const sAnnA = pptx.addSlide();
  addHeader(sAnnA, "8. Annexure A — Benchmark Mapping", data.title);
  const bmRows: any[][] = [
    [headerCell("Asset Class"), headerCell("Benchmark Index"), headerCell("1Y Return", "right")],
    ...data.benchmarks.map(b => [
      { text: b.assetClass, options: { bold: true } },
      { text: b.benchmark, options: { color: MUTED } },
      { text: pctStr(b.ret), options: { align: "right" } },
    ]),
  ];
  sAnnA.addTable(bmRows, { x: 0.5, y: 1.1, w: 12.3, fontSize: 11, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [4, 6.3, 2] });
  addFooter(sAnnA, nextPage());

  // Annexure B — Bond holdings (paginated)
  if (data.bondHoldings.length > 0) {
    const bondChunks = chunk(data.bondHoldings, 18);
    bondChunks.forEach((rows, idx) => {
      const slide = pptx.addSlide();
      addHeader(slide, `8. Annexure B — Bond Holdings (${idx + 1}/${bondChunks.length}, ${data.bondHoldings.length} securities)`, data.title);
      const bRows: any[][] = [
        [headerCell("ISIN"), headerCell("Security"), headerCell("Rating"), headerCell("Quantity", "right"), headerCell("Value", "right")],
        ...rows.map(h => [
          { text: h.isin, options: { fontSize: 9, color: MUTED } },
          { text: h.name, options: { fontSize: 9 } },
          { text: h.rating, options: { fontSize: 9 } },
          { text: h.quantity.toFixed(2), options: { align: "right", fontSize: 9 } },
          { text: fmtMoney(h.value), options: { align: "right" } },
        ]),
      ];
      slide.addTable(bRows, { x: 0.4, y: 1.1, w: 12.5, fontSize: 9, border: { type: "solid", color: "E2E8F0", pt: 0.5 }, colW: [1.8, 5.5, 1.4, 1.8, 2.0] });
      addFooter(slide, nextPage());
    });
  }

  // ---- Disclaimer ----
  const sEnd = pptx.addSlide();
  sEnd.background = { color: DARK };
  sEnd.addText("Disclaimer", { x: 0.6, y: 0.8, w: 12, h: 0.5, fontSize: 22, bold: true, color: "FFFFFF" });
  sEnd.addText(
    "This report is generated for informational purposes only based on the data provided by the customer. " +
    "Values, returns and benchmarks are indicative model estimates. Past performance is not indicative of future returns. " +
    "Please consult your relationship manager before acting on any of the analytics presented.",
    { x: 0.6, y: 1.6, w: 12, h: 3, fontSize: 14, color: "CBD5E1" }
  );
  sEnd.addText("mPower Wealth · Portfolio Analytics", { x: 0.6, y: 6.8, w: 12, h: 0.3, fontSize: 11, color: "64748B" });

  const safe = data.title.replace(/[^a-z0-9]+/gi, "_").slice(0, 48);
  pptx.writeFile({ fileName: `${safe}_Portfolio_Report.pptx` });
}

// ----- helpers -----
function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function rgbToHex(r: number, g: number, b: number) {
  return [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function drawKpiCards(slide: PptxGenJS.Slide, cards: { label: string; value: string; color: string }[], y: number) {
  const w = (13.333 - 1 - 0.2 * (cards.length - 1)) / cards.length;
  cards.forEach((c, i) => {
    const x = 0.5 + i * (w + 0.2);
    slide.addShape("roundRect" as any, { x, y, w, h: 1.6, fill: { color: LIGHT_BG }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1 });
    slide.addText(c.label, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.35, fontSize: 11, color: MUTED, bold: true });
    slide.addText(c.value, { x: x + 0.2, y: y + 0.55, w: w - 0.4, h: 0.95, fontSize: 24, color: c.color, bold: true });
  });
}

function drawCommentaryBlock(slide: PptxGenJS.Slide, group: { title: string; items: { kind: "good" | "warn" | "info"; text: string }[] }, x: number, y: number, w: number) {
  slide.addShape("roundRect" as any, { x, y, w, h: 5.9, fill: { color: LIGHT_BG }, line: { color: "E2E8F0", width: 1 }, rectRadius: 0.1 });
  slide.addText(group.title, { x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.4, fontSize: 14, bold: true, color: DARK });
  const items = group.items.slice(0, 6);
  const rowH = (5.9 - 0.6) / Math.max(items.length, 1);
  items.forEach((it, i) => {
    const top = y + 0.6 + i * rowH;
    const dot = it.kind === "good" ? POS : it.kind === "warn" ? WARN : MUTED;
    slide.addShape("ellipse" as any, { x: x + 0.25, y: top + 0.12, w: 0.18, h: 0.18, fill: { color: dot }, line: { color: dot } });
    slide.addText(it.text, { x: x + 0.55, y: top, w: w - 0.75, h: rowH, fontSize: 11, color: DARK, valign: "top" });
  });
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
