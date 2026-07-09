// textPreview.js - Text budget preview generation

import { getNum, getStr, fmtMoney } from './utils.js';

export function updateTextPreview(data = {}) {
  const preview = document.getElementById("textPreview");
  if (!preview) return;

  const sectionTotal = (rows) =>
    (rows || []).reduce((sum, r) => sum + (r && typeof r.value === "number" ? (+r.value || 0) : 0), 0);

  const isVisibleMoney = (value) => Math.abs(+value || 0) > 0.004;
  const moneyRow = (label, value) => isVisibleMoney(value) ? { label, value: +value || 0 } : null;
  const compactRows = (rows = []) => {
    const cleaned = [];

    for (const row of rows) {
      if (!row) continue;

      if (row.type === "blank") {
        if (cleaned.length && cleaned[cleaned.length - 1].type !== "blank") cleaned.push(row);
        continue;
      }

      if (row.type === "heading") {
        cleaned.push(row);
        continue;
      }

      if (row.type === "text") {
        if (String(row.text || "").trim()) cleaned.push(row);
        continue;
      }

      if (typeof row.value === "number" && isVisibleMoney(row.value)) cleaned.push(row);
    }

    while (cleaned.length && cleaned[cleaned.length - 1].type === "blank") cleaned.pop();

    return cleaned.filter((row, index, arr) => {
      if (row.type !== "heading") return true;
      const next = arr[index + 1];
      return !!next && next.type !== "heading";
    });
  };

  const MIN_LABEL_COL = 32;
  const MONEY_COL = 12;

  let labelWidth = MIN_LABEL_COL;
  const consider = (s) => { labelWidth = Math.max(labelWidth, String(s || "").length); };

  const showTitle = (getStr("showTitle") || "UNTITLED EVENT").toUpperCase();
  const showDateText = getStr("showDate");

  const sections = [];

  const headlinerRows = [];
  const nHead = +document.getElementById("numHeadliners")?.value || 0;
  for (let i = 1; i <= nHead; i++) {
    const name = getStr(`headliner_name_${i}`) || `Headliner ${i}`;
    [
      moneyRow(`${name} Fee:`, getNum(`headliner_fee_${i}`)),
      moneyRow(`${name} Hotel:`, getNum(`headliner_hotel_${i}`)),
      moneyRow(`${name} Rider:`, getNum(`headliner_rider_${i}`)),
    ].filter(Boolean).forEach(row => headlinerRows.push(row));
  }
  if (headlinerRows.length) sections.push({ title: "Headliners", rows: headlinerRows });

  const supportRows = [];
  const directSupportName = getStr("directSupportName") || "Direct Support";
  [
    moneyRow(`${directSupportName} Fee:`, getNum("directSupport")),
    moneyRow(`${directSupportName} Hotel:`, getNum("directSupportHotel")),
    moneyRow(`${directSupportName} Rider:`, getNum("directSupportRider")),
  ].filter(Boolean).forEach(row => supportRows.push(row));

  const nLocal = +document.getElementById("numLocalDJs")?.value || 0;
  for (let i = 1; i <= nLocal; i++) {
    const name = getStr(`localDJ_name_${i}`) || `Local DJ ${i}`;
    const fee = moneyRow(`${name} Fee:`, getNum(`localDJ_fee_${i}`));
    if (fee) supportRows.push(fee);
  }
  if (supportRows.length) sections.push({ title: "Support", rows: supportRows });

  const productionRows = [
    moneyRow("VJ Fee:", getNum("vjFee")),
    moneyRow("Venue:", getNum("venue")),
    moneyRow("LED Wall:", getNum("ledWall")),
    moneyRow("Lights:", getNum("lights")),
    moneyRow("Lasers:", getNum("lasers"))
  ].filter(Boolean);
  if (productionRows.length) sections.push({ title: "Production", rows: productionRows });

  const gearRows = [];
  const nCDJ = +document.getElementById("numCDJs")?.value || 0;
  for (let i = 1; i <= nCDJ; i++) {
    const row = moneyRow(`CDJ ${i}:`, getNum(`cdj_fee_${i}`));
    if (row) gearRows.push(row);
  }
  [
    moneyRow("Mixer:", getNum("mixer")),
    moneyRow("Sound:", getNum("sound")),
    moneyRow("Table:", getNum("table"))
  ].filter(Boolean).forEach(row => gearRows.push(row));
  if (gearRows.length) sections.push({ title: "Gear Rentals", rows: gearRows });

  const hasFbSplit = !!document.getElementById("facebookAdsXodia") || !!document.getElementById("facebookAdsSpaceCampHQ");
  const hasIgSplit = !!document.getElementById("instagramAdsXodia") || !!document.getElementById("instagramAdsSpaceCampHQ");

  const fbX = hasFbSplit ? getNum("facebookAdsXodia") : getNum("facebookAds");
  const fbS = hasFbSplit ? getNum("facebookAdsSpaceCampHQ") : 0;
  const igX = hasIgSplit ? getNum("instagramAdsXodia") : getNum("instagramAds");
  const igS = hasIgSplit ? getNum("instagramAdsSpaceCampHQ") : 0;

  const marketingRows = [];
  const fbRows = [moneyRow("XODIA:", fbX), moneyRow("SPACE CAMP HQ:", fbS)].filter(Boolean);
  if (fbRows.length) marketingRows.push({ type: "heading", text: "Facebook Ads" }, ...fbRows, { type: "blank" });
  const igRows = [moneyRow("XODIA:", igX), moneyRow("SPACE CAMP HQ:", igS)].filter(Boolean);
  if (igRows.length) marketingRows.push({ type: "heading", text: "Instagram Ads" }, ...igRows, { type: "blank" });
  [
    moneyRow("Physical Flyers:", getNum("physicalFlyers")),
    moneyRow("Eventbrite Ads:", getNum("eventbriteAds")),
  ].filter(Boolean).forEach(row => marketingRows.push(row));
  const collaboratorAmount = getNum("collaboratorAmount");
  const collaboratorName = getStr("collaboratorName") || "Collaborator";
  const collaboratorRow = moneyRow(`${collaboratorName}:`, collaboratorAmount);
  if (collaboratorRow) marketingRows.push({ type: "heading", text: "Collaborator" }, collaboratorRow, { type: "blank" });
  const compactMarketingRows = compactRows(marketingRows);
  if (compactMarketingRows.length) sections.push({ title: "Marketing", rows: compactMarketingRows });

  const staffRows = [
    moneyRow("Door Staff:", getNum("doorStaff")),
    moneyRow("Merch Table:", getNum("merchTable")),
    moneyRow("Transportation:", getNum("transportation")),
  ].filter(Boolean);
  const nRunners = +document.getElementById("numShowRunners")?.value || 0;
  for (let i = 1; i <= nRunners; i++) {
    const row = moneyRow(`Show Runner ${i}:`, getNum(`showRunner_fee_${i}`));
    if (row) staffRows.push(row);
  }
  if (staffRows.length) sections.push({ title: "Staff", rows: staffRows });

  const mediaRows = [];
  const nMedia = +document.getElementById("numMedia")?.value || 0;
  for (let i = 1; i <= nMedia; i++) {
    const mediaName = getStr(`media_name_${i}`) || `Media ${i}`;
    const itemRows = [
      moneyRow("Photo:", getNum(`media_photo_${i}`)),
      moneyRow("Video:", getNum(`media_video_${i}`)),
      moneyRow("Photo & Video:", getNum(`media_photoVideo_${i}`)),
    ].filter(Boolean);

    if (itemRows.length) {
      mediaRows.push({ type: "heading", text: mediaName }, ...itemRows, { type: "blank" });
    }
  }
  const compactMediaRows = compactRows(mediaRows);
  if (compactMediaRows.length) sections.push({ title: "Media", rows: compactMediaRows });

  const otherRows = [];
  const nOtherCats = +document.getElementById("numOtherCategories")?.value || 0;
  for (let c = 1; c <= nOtherCats; c++) {
    const catName = getStr(`otherCategoryName_${c}`) || `Category ${c}`;
    const count = +document.getElementById(`otherCategoryCount_${c}`)?.value || 0;
    const categoryRows = [];

    for (let i = 1; i <= count; i++) {
      const itemName = getStr(`otherCategory_${c}_itemName_${i}`) || `Item ${i}`;
      const row = moneyRow(`${itemName}:`, getNum(`otherCategory_${c}_itemFee_${i}`));
      if (row) categoryRows.push(row);
    }

    if (categoryRows.length) otherRows.push({ type: "heading", text: catName }, ...categoryRows, { type: "blank" });
  }
  const compactOtherRows = compactRows(otherRows);
  if (compactOtherRows.length) sections.push({ title: "Other", rows: compactOtherRows });

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

  const merchVendorTotal = (() => {
    const n = +document.getElementById("numMerchVendors")?.value || 0;
    let t = 0;
    for (let i = 1; i <= n; i++) t += getNum(`merchVendor_fee_${i}`);
    return t;
  })();

  const otherSalesName = getStr("otherSalesName") || "Other Sales";
  const revenueRows = [
    moneyRow("Eventbrite Sales:", getNum("eventbriteSales")),
    moneyRow("Posh Sales:", getNum("poshSales")),
    moneyRow("Raffle Sales:", getNum("raffleSales")),
    moneyRow("DJ Presales:", getNum("djPresales")),
    moneyRow("Promo Team Sales:", getNum("promoTeam")),
    moneyRow("Door Sales:", getNum("doorSales")),
    moneyRow("Merch Sold:", getNum("merchSold")),
    moneyRow("Merch Vendors:", merchVendorTotal),
    moneyRow(`${otherSalesName}:`, getNum("otherSales")),
  ].filter(Boolean);

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

// Helper function for filename (referenced but not defined in original)
function buildTxtFileName() {
  const title = document.getElementById("showTitle")?.value || "budget";
  const date = document.getElementById("showDate")?.value || new Date().toISOString().slice(0, 10);
  const sanitize = (s) => String(s).replace(/[^a-z0-9_-]/gi, '_');
  return `${sanitize(title)}_${sanitize(date)}.txt`;
}
