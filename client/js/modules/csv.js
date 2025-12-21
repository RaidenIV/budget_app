// csv.js - CSV import and export functionality

import { FIELDS, CSV_META, CSV_FIELD_BY_LABEL, CSV_ALIASES, collectCsvFields } from './state.js';
import { setVal, buildCsvFileName } from './utils.js';

export function downloadCSV() {
  const rows = [];

  const csvCell = (v) => {
    const s = (v == null) ? "" : String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const pushKV = (label, value) => rows.push(`${label},${csvCell(value)}`);
  const pushField = (field) => pushKV(field.csv, document.getElementById(field.id)?.value || "");

  // CSV VERSION HEADER
  pushKV(CSV_META.key, CSV_META.version);
  rows.push("");

  // BASIC INFO
  pushField(FIELDS.basic.showTitle);
  pushField(FIELDS.basic.showDate);
  rows.push("");

  // HEADLINERS
  rows.push("Headliners:");
  const numHeadliners = +document.getElementById("numHeadliners")?.value || 0;
  for (let i = 1; i <= numHeadliners; i++) {
    pushKV(`Headliner ${i} Fee`, document.getElementById(`headliner_fee_${i}`)?.value || "");
    pushKV(`Headliner ${i} Hotel`, document.getElementById(`headliner_hotel_${i}`)?.value || "");
    pushKV(`Headliner ${i} Rider`, document.getElementById(`headliner_rider_${i}`)?.value || "");
    pushKV(`Headliner ${i} Name`, document.getElementById(`headliner_name_${i}`)?.value || "");
  }
  rows.push("");

  // SUPPORT
  rows.push("Support:");
  pushKV("Direct Support Fee", document.getElementById("directSupport")?.value || "");
  const numLocalDJs = +document.getElementById("numLocalDJs")?.value || 0;
  for (let i = 1; i <= numLocalDJs; i++) {
    pushKV(`Local DJ ${i} Name`, document.getElementById(`localDJ_name_${i}`)?.value || "");
    pushKV(`Local DJ ${i} Fee`, document.getElementById(`localDJ_fee_${i}`)?.value || "");
  }
  rows.push("");

  // PRODUCTION
  rows.push("Production:");
  pushField(FIELDS.production.vjFee);
  pushField(FIELDS.production.venue);
  pushField(FIELDS.production.ledWall);
  pushField(FIELDS.production.lights);
  pushField(FIELDS.production.lasers);
  rows.push("");

  // GEAR RENTALS
  rows.push("Gear Rentals:");
  const numCDJs = +document.getElementById("numCDJs")?.value || 0;
  for (let i = 1; i <= numCDJs; i++) {
    pushKV(`CDJ ${i} Fee`, document.getElementById(`cdj_fee_${i}`)?.value || "");
  }
  pushField(FIELDS.gear.sound);
  pushField(FIELDS.gear.mixer);
  pushField(FIELDS.gear.table);
  rows.push("");

  // MARKETING
  rows.push("Marketing:");
  pushField(FIELDS.marketing.facebookAdsXodia);
  pushField(FIELDS.marketing.facebookAdsSpaceCampHQ);
  pushField(FIELDS.marketing.instagramAdsXodia);
  pushField(FIELDS.marketing.instagramAdsSpaceCampHQ);
  pushField(FIELDS.marketing.physicalFlyers);
  pushField(FIELDS.marketing.eventbriteAds);
  rows.push("");

  // STAFF
  rows.push("Staff:");
  pushField(FIELDS.staff.doorStaff);
  pushField(FIELDS.staff.merchTable);
  pushField(FIELDS.staff.transportation);

  const numShowRunners = +document.getElementById("numShowRunners")?.value || 0;
  for (let i = 1; i <= numShowRunners; i++) {
    pushKV(`Show Runner ${i} Fee`, document.getElementById(`showRunner_fee_${i}`)?.value || "");
  }
  rows.push("");

  // OTHER CATEGORIES
  rows.push("Other Categories:");
  const numOtherCategories = +document.getElementById("numOtherCategories")?.value || 0;
  for (let c = 1; c <= numOtherCategories; c++) {
    const name = document.getElementById(`otherCategoryName_${c}`)?.value || "";
    const count = document.getElementById(`otherCategoryCount_${c}`)?.value || 0;

    pushKV(`Category ${c} Name`, name);
    pushKV(`Category ${c} Items Count`, count);

    for (let i = 1; i <= (+count || 0); i++) {
      pushKV(`Category ${c} Item ${i} Name`, document.getElementById(`otherCategory_${c}_itemName_${i}`)?.value || "");
      pushKV(`Category ${c} Item ${i} Fee`, document.getElementById(`otherCategory_${c}_itemFee_${i}`)?.value || "");
    }
  }
  rows.push("");

  // SALES
  rows.push("Sales:");
  pushField(FIELDS.sales.eventbriteSales);
  pushField(FIELDS.sales.djPresales);
  pushField(FIELDS.sales.promoTeam);
  pushField(FIELDS.sales.doorSales);
  pushField(FIELDS.sales.merchSold);

  const numMerchVendors = +document.getElementById("numMerchVendors")?.value || 0;
  for (let i = 1; i <= numMerchVendors; i++) {
    pushKV(`Vendor ${i} Name`, document.getElementById(`merchVendor_name_${i}`)?.value || "");
    pushKV(`Vendor ${i} Fee`, document.getElementById(`merchVendor_fee_${i}`)?.value || "");
  }

  const blob = new Blob([rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = buildCsvFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function loadCSV(fileOrText, regenerators, updateBudgetFn) {
  console.log('=== loadCSV called ===');
  console.log('Input type:', typeof fileOrText);
  console.log('Has regenerators:', !!regenerators);
  console.log('Has updateBudgetFn:', !!updateBudgetFn);
  
  const resetForm = () => {
    const form = document.getElementById("budgetForm");
    if (form) form.reset();
  };

  const parseLabelValue = (line) => {
    const idx = line.indexOf(",");
    if (idx < 0) return { label: line.trim(), value: "" };

    const label = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"');
    }
    return { label, value };
  };

  const normalizeLabel = (label) => {
    const l = (label || "").trim();
    return (CSV_ALIASES && CSV_ALIASES[l]) ? CSV_ALIASES[l] : l;
  };

  const applyText = (csvText) => {
    if (!csvText || !String(csvText).trim()) {
      alert("CSV is empty.");
      return;
    }

    resetForm();

    const lines = String(csvText).split(/\r?\n/).map(l => l.trim());
    const pairs = [];

    const ensureMerchVendors = (n) => {
      const cur = +document.getElementById("numMerchVendors")?.value || 0;
      if (n > cur) {
        setVal("numMerchVendors", n);
        if (regenerators.vendors) regenerators.vendors();
      }
    };

    const ensureOtherCategories = (c) => {
      const cur = +document.getElementById("numOtherCategories")?.value || 0;
      if (c > cur) {
        setVal("numOtherCategories", c);
        if (regenerators.otherCategories) regenerators.otherCategories();
      }
    };

    const ensureOtherItemRow = (c, itemIndex) => {
      ensureOtherCategories(c);
      const countId = `otherCategoryCount_${c}`;
      const curCount = +document.getElementById(countId)?.value || 0;

      if (itemIndex > curCount) {
        setVal(countId, itemIndex);
        if (regenerators.otherItems) regenerators.otherItems(c);
      }
    };

    // PASS 1: detect max counts
    let maxHead = 0, maxLocal = 0, maxCDJ = 0, maxRunner = 0, maxVendor = 0, maxOtherCats = 0;
    let legacyFbAmount = null, legacyFbAccount = "";
    let legacyIgAmount = null, legacyIgAccount = "";

    for (const line of lines) {
      if (!line || !line.includes(",")) continue;

      const parsed = parseLabelValue(line);
      let label = normalizeLabel(parsed.label);
      const value = parsed.value;

      let m;
      if ((m = label.match(/^Category\s+(\d+)\s+Items$/i))) label = `Category ${m[1]} Items Count`;
      if ((m = label.match(/^Merch Vendor\s+(\d+)\s+(Name|Fee)$/i))) label = `Vendor ${m[1]} ${m[2]}`;

      if (label === CSV_META.key) continue;

      if ((m = label.match(/^Headliner\s+(\d+)\b/i))) maxHead = Math.max(maxHead, +m[1]);
      if ((m = label.match(/^Local DJ\s+(\d+)\b/i))) maxLocal = Math.max(maxLocal, +m[1]);
      if ((m = label.match(/^CDJ\s+(\d+)\b/i))) maxCDJ = Math.max(maxCDJ, +m[1]);
      if ((m = label.match(/^Show Runner\s+(\d+)\b/i))) maxRunner = Math.max(maxRunner, +m[1]);
      if ((m = label.match(/^Vendor\s+(\d+)\b/i))) maxVendor = Math.max(maxVendor, +m[1]);

      if ((m = label.match(/^Category\s+(\d+)\s+(Name|Items Count)$/i))) maxOtherCats = Math.max(maxOtherCats, +m[1]);
      if ((m = label.match(/^Category\s+(\d+)\s+Item\s+(\d+)\s+(Name|Fee)$/i))) maxOtherCats = Math.max(maxOtherCats, +m[1]);

      if (label === "Facebook Ads") legacyFbAmount = value;
      if (label === "Facebook Ads Account") legacyFbAccount = value;
      if (label === "Instagram Ads") legacyIgAmount = value;
      if (label === "Instagram Ads Account") legacyIgAccount = value;

      pairs.push({ label, value });
    }

    // Regenerate dynamic sections
    if (maxHead > 0 && regenerators.headliners) {
      setVal("numHeadliners", maxHead);
      regenerators.headliners();
    }
    if (maxLocal > 0 && regenerators.localDJs) {
      setVal("numLocalDJs", maxLocal);
      regenerators.localDJs();
    }
    if (maxCDJ > 0 && regenerators.cdjs) {
      setVal("numCDJs", maxCDJ);
      regenerators.cdjs();
    }
    if (maxRunner > 0 && regenerators.showRunners) {
      setVal("numShowRunners", maxRunner);
      regenerators.showRunners();
    }
    if (maxVendor > 0) ensureMerchVendors(maxVendor);
    if (maxOtherCats > 0) {
      setVal("numOtherCategories", maxOtherCats);
      if (regenerators.otherCategories) regenerators.otherCategories();
    }

    // PASS 2: apply values
    let currentCategory = 0;

    for (const { label: rawLabel, value } of pairs) {
      let label = rawLabel;

      const mapped = CSV_FIELD_BY_LABEL?.[label];
      if (mapped && mapped.id) {
        setVal(mapped.id, value);
        continue;
      }

      let m;

      if (/^Direct Support(\s+Fee)?$/i.test(label)) { setVal("directSupport", value); continue; }

      if ((m = label.match(/^Headliner\s+(\d+)\s+Fee$/i))) { setVal(`headliner_fee_${m[1]}`, value); continue; }
      if ((m = label.match(/^Headliner\s+(\d+)\s+Hotel$/i))) { setVal(`headliner_hotel_${m[1]}`, value); continue; }
      if ((m = label.match(/^Headliner\s+(\d+)\s+Rider$/i))) { setVal(`headliner_rider_${m[1]}`, value); continue; }
      if ((m = label.match(/^Headliner\s+(\d+)\s+Name$/i))) { setVal(`headliner_name_${m[1]}`, value); continue; }

      if ((m = label.match(/^Local DJ\s+(\d+)\s+Name$/i))) { setVal(`localDJ_name_${m[1]}`, value); continue; }
      if ((m = label.match(/^Local DJ\s+(\d+)\s+Fee$/i))) { setVal(`localDJ_fee_${m[1]}`, value); continue; }

      if ((m = label.match(/^CDJ\s+(\d+)\s+Fee$/i))) { setVal(`cdj_fee_${m[1]}`, value); continue; }
      if ((m = label.match(/^Show Runner\s+(\d+)\s+Fee$/i))) { setVal(`showRunner_fee_${m[1]}`, value); continue; }

      if ((m = label.match(/^Category\s+(\d+)\s+Name$/i))) {
        const c = +m[1];
        ensureOtherCategories(c);
        currentCategory = c;
        setVal(`otherCategoryName_${c}`, value);
        continue;
      }

      if ((m = label.match(/^Category\s+(\d+)\s+Items Count$/i))) {
        const c = +m[1];
        ensureOtherCategories(c);
        currentCategory = c;
        setVal(`otherCategoryCount_${c}`, value);
        if (regenerators.otherItems) regenerators.otherItems(c);
        continue;
      }

      if ((m = label.match(/^Category\s+(\d+)\s+Item\s+(\d+)\s+Name$/i))) {
        const c = +m[1], i = +m[2];
        ensureOtherItemRow(c, i);
        currentCategory = c;
        setVal(`otherCategory_${c}_itemName_${i}`, value);
        continue;
      }

      if ((m = label.match(/^Category\s+(\d+)\s+Item\s+(\d+)\s+Fee$/i))) {
        const c = +m[1], i = +m[2];
        ensureOtherItemRow(c, i);
        currentCategory = c;
        setVal(`otherCategory_${c}_itemFee_${i}`, value);
        continue;
      }

      if ((m = label.match(/^Vendor\s+(\d+)\s+Name$/i))) {
        ensureMerchVendors(+m[1]);
        setVal(`merchVendor_name_${m[1]}`, value);
        continue;
      }

      if ((m = label.match(/^Vendor\s+(\d+)\s+Fee$/i))) {
        ensureMerchVendors(+m[1]);
        setVal(`merchVendor_fee_${m[1]}`, value);
        continue;
      }
    }

    // Legacy marketing fallback
    if (legacyFbAmount != null && !document.getElementById("facebookAdsXodia")?.value) {
      const acct = (legacyFbAccount || "").trim().toUpperCase();
      if (acct === "SPACE CAMP HQ") setVal("facebookAdsSpaceCampHQ", legacyFbAmount);
      else setVal("facebookAdsXodia", legacyFbAmount);
    }

    if (legacyIgAmount != null && !document.getElementById("instagramAdsXodia")?.value) {
      const acct = (legacyIgAccount || "").trim().toUpperCase();
      if (acct === "SPACE CAMP HQ") setVal("instagramAdsSpaceCampHQ", legacyIgAmount);
      else setVal("instagramAdsXodia", legacyIgAmount);
    }

    if (updateBudgetFn) updateBudgetFn();
  };

  if (fileOrText instanceof File) {
    const reader = new FileReader();
    reader.onload = () => applyText(reader.result);
    reader.readAsText(fileOrText);
    return;
  }

  applyText(fileOrText);
}

export function setupCSVImport(regenerators, updateBudgetFn) {
  const input = document.getElementById("csvFileInput");
  if (!input) return;

  input.addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (ev) => loadCSV(ev.target.result || "", regenerators, updateBudgetFn);
    reader.readAsText(f);
  });
}

export function triggerImport() {
  const input = document.getElementById("csvFileInput");
  if (!input) return;
  input.value = "";
  input.click();

}
