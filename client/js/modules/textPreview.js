// textPreview.js - Text budget preview generation

import { getNum, getStr, fmtMoney } from './utils.js';

export function updateTextPreview(data = {}) {
  const preview = document.getElementById("textPreview");
  if (!preview) return;

  const sectionTotal = (rows) =>
    (rows || []).reduce((sum, r) => sum + (r && typeof r.value === "number" ? (+r.value || 0) : 0), 0);

  const MIN_LABEL_COL = 32;
  const MONEY_COL = 12;

  let labelWidth = MIN_LABEL_COL;
  const consider = (s) => { labelWidth = Math.max(labelWidth, String(s || "").length); };

  const showTitle = (getStr("showTitle") || "UNTITLED EVENT").toUpperCase();
  const showDateText = getStr("showDate");

  const sections = [];

  // HEADLINERS
  const headlinerRows = [];
  const nHead = +document.getElementById("numHeadliners")?.value || 0;
  for (let i = 1; i <= nHead; i++) {
    const name = getStr(`headliner_name_${i}`) || `Headliner ${i}`;
    headlinerRows.push({ label: `${name} Fee:`, value: getNum(`headliner_fee_${i}`) });
    headlinerRows.push({ label: `${name} Hotel:`, value: getNum(`headliner_hotel_${i}`) });
    headlinerRows.push({ label: `${name} Rider:`, value: getNum(`headliner_rider_${i}`) });
  }
  if (headlinerRows.length) sections.push({ title: "Headliners", rows: headlinerRows });

  // SUPPORT
  const supportRows = [{ label: "Direct Support:", value: getNum("directSupport") }];
  const nLocal = +document.getElementById("numLocalDJs")?.value || 0;
  for (let i = 1; i <= nLocal; i++) {
    const name = getStr(`localDJ_name_${i}`) || `Local DJ ${i}`;
    supportRows.push({ label: `${name} Fee:`, value: getNum(`localDJ_fee_${i}`) });
  }
  sections.push({ title: "Support", rows: supportRows });

  // PRODUCTION
  const productionRows = [
    { label: "VJ Fee:", value: getNum("vjFee") },
    { label: "Venue:", value: getNum("venue") },
    { label: "LED Wall:", value: getNum("ledWall") },
    { label: "Lights:", value: getNum("lights") },
    { label: "Lasers:", value: getNum("lasers") }
  ];
  sections.push({ title: "Production", rows: productionRows });

  // GEAR RENTALS
  const gearRows = [];
  const nCDJ = +document.getElementById("numCDJs")?.value || 0;
  for (let i = 1; i <= nCDJ; i++) gearRows.push({ label: `CDJ ${i}:`, value: getNum(`cdj_fee_${i}`) });
  gearRows.push({ label: "Mixer:", value: getNum("mixer") });
  gearRows.push({ label: "Sound:", value: getNum("sound") });
  gearRows.push({ label: "Table:", value: getNum("table") });
  sections.push({ title: "Gear Rentals", rows: gearRows });

  // MARKETING
  const hasFbSplit = !!document.getElementById("facebookAdsXodia") || !!document.getElementById("facebookAdsSpaceCampHQ");
  const hasIgSplit = !!document.getElementById("instagramAdsXodia") || !!document.getElementById("instagramAdsSpaceCampHQ");

  const fbX = hasFbSplit ? getNum("facebookAdsXodia") : getNum("facebookAds");
  const fbS = hasFbSplit ? getNum("facebookAdsSpaceCampHQ") : 0;
  const igX = hasIgSplit ? getNum("instagramAdsXodia") : getNum("instagramAds");
  const igS = hasIgSplit ? getNum("instagramAdsSpaceCampHQ") : 0;

  const marketingRows = [
    { type: "heading", text: "Facebook Ads" },
    { label: "XODIA:", value: fbX },
    { label: "SPACE CAMP HQ:", value: fbS },
    { type: "blank" },
    { type: "heading", text: "Instagram Ads" },
    { label: "XODIA:", value: igX },
    { label: "SPACE CAMP HQ:", value: igS },
    { type: "blank" },
    { label: "Physical Flyers:", value: getNum("physicalFlyers") },
    { label: "Eventbrite Ads:", value: getNum("eventbriteAds") },
  ];
  sections.push({ title: "Marketing", rows: marketingRows });

  // STAFF
  const staffRows = [
    { label: "Door Staff:", value: getNum("doorStaff") },
    { label: "Merch Table:", value: getNum("merchTable") },
    { label: "Transportation:", value: getNum("transportation") },
  ];
  const nRunners = +document.getElementById("numShowRunners")?.value || 0;
  for (let i = 1; i <= nRunners; i++) staffRows.push({ label: `Show Runner ${i}:`, value: getNum(`showRunner_fee_${i}`) });
  sections.push({ title: "Staff", rows: staffRows });

  // OTHER CATEGORIES
  const otherRows = [];
  const nOtherCats = +document.getElementById("numOtherCategories")?.value || 0;
  for (let c = 1; c <= nOtherCats; c++) {
    const catName = getStr(`otherCategoryName_${c}`) || `Category ${c}`;
    const count = +document.getElementById(`otherCategoryCount_${c}`)?.value || 0;

    otherRows.push({ type: "heading", text: catName });
    for (let i = 1; i <= count; i++) {
      const itemName = getStr(`otherCategory_${c}_itemName_${i}`) || `Item ${i}`;
      otherRows.push({ label: `${itemName}:`, value: getNum(`otherCategory_${c}_itemFee_${i}`) });
    }
    otherRows.push({ type: "blank" });
  }
  if (otherRows.length) sections.push({ title: "Other", rows: otherRows });

  sections.forEach(sec => {
    consider(sec.title);
    (sec.rows || []).forEach(r => {
      if (r?.type === "text" || r?.type === "heading" || r?.type === "blank") return;
      consider(r.label || "");
    });
  });

  const fmtRow = (label, value) => {
    const left = String(label || "").padEnd(labelWidth, " ");
    const money = fmtMoney(value).padStart(MONEY_COL, " ");
    return `${left}  ${money}`;
  };

  const lines = [];
  lines.push(`EVENT: ${showTitle}${showDateText ? `  |  DATE: ${showDateText}` : ""}`);
  lines.push("");
  lines.push("EXPENSES");
  lines.push("--------------------------------");

  let totalExpenses = 0;

  for (const sec of sections) {
    if (!sec?.rows?.length) continue;

    lines.push(sec.title.toUpperCase());

    for (const r of sec.rows) {
      if (r?.type === "blank") { lines.push(""); continue; }
      if (r?.type === "heading") { lines.push(String(r.text || "")); continue; }
      if (r?.type === "text") { lines.push(`  ${r.text}`); continue; }
      lines.push(fmtRow(r.label, r.value));
    }

    const secTotal = sectionTotal(sec.rows);
    totalExpenses += secTotal;

    lines.push(fmtRow(`TOTAL ${sec.title.toUpperCase()}:`, secTotal));
    lines.push("");
  }

  lines.push("--------------------------------");
  lines.push(fmtRow("TOTAL EXPENSES:", totalExpenses));
  lines.push("");

  // REVENUE
  const merchVendorTotal = (() => {
    const n = +document.getElementById("numMerchVendors")?.value || 0;
    let t = 0;
    for (let i = 1; i <= n; i++) t += getNum(`merchVendor_fee_${i}`);
    return t;
  })();

  const revenueRows = [
    { label: "Eventbrite Sales:", value: getNum("eventbriteSales") },
    { label: "DJ Presales:", value: getNum("djPresales") },
    { label: "Promo Team:", value: getNum("promoTeam") },
    { label: "Door Sales:", value: getNum("doorSales") },
    { label: "Merch Sold:", value: getNum("merchSold") },
    { label: "Merch Vendors:", value: merchVendorTotal },
  ];

  revenueRows.forEach(r => consider(r.label || ""));

  const totalRevenue = sectionTotal(revenueRows);

  lines.push("REVENUE");
  lines.push("--------------------------------");
  revenueRows.forEach(r => lines.push(fmtRow(r.label, r.value)));
  lines.push("--------------------------------");
  lines.push(fmtRow("TOTAL REVENUE:", totalRevenue));
  lines.push("");

  lines.push("NET PROFIT");
  lines.push("--------------------------------");
  const netProfit = Number.isFinite(+data.netProfit) ? +data.netProfit : (totalRevenue - totalExpenses);
  lines.push(`${netProfit >= 0 ? "+" : "-"}$${Math.abs(netProfit).toFixed(2)}`);

  preview.textContent = lines.join("\n");
}

export async function copyTextPreview() {
  const text = document.getElementById("textPreview")?.textContent || "";
  const status = document.getElementById("copyStatus");

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }

    if (status) {
      status.textContent = "Copied.";
      setTimeout(() => (status.textContent = ""), 1500);
    }
  } catch (err) {
    if (status) status.textContent = "Copy failed.";
    console.error(err);
  }
}

export function exportTextPreviewTxt() {
  const text = document.getElementById("textPreview")?.textContent || "";
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = buildTxtFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}