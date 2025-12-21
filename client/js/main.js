// main.js - Main application controller

import { state } from './modules/state.js';
import { buildChartsPngFileName } from './modules/utils.js';
import {
  regenerateHeadliners,
  regenerateLocalDJs,
  regenerateCDJs,
  regenerateShowRunners,
  regenerateVendors,
  regenerateOtherCategories,
  regenerateOtherItems
} from './modules/repeaters.js';
import { calculateBudget, updateSummaryDisplay } from './modules/budgetCalculator.js';
import { updateCharts, downloadChartsPNG } from './modules/charts.js';
import { updateTextPreview, copyTextPreview, exportTextPreviewTxt } from './modules/textPreview.js';
import { downloadCSV, setupCSVImport, triggerImport } from './modules/csv.js';

// Main budget update function
export function updateBudget() {
  const budgetData = calculateBudget();
  updateSummaryDisplay(budgetData);
  updateTextPreview(budgetData);
  
  updateCharts(
    {
      Headliners: budgetData.expenses.Headliners,
      Support: budgetData.expenses.Support,
      Production: budgetData.expenses.Production,
      Gear: budgetData.expenses.Gear,
      Marketing: budgetData.expenses.Marketing,
      Staff: budgetData.expenses.Staff,
      Other: budgetData.expenses.Other
    },
    {
      Eventbrite: budgetData.revenue.Eventbrite,
      Presales: budgetData.revenue.Presales,
      Promo: budgetData.revenue.Promo,
      Door: budgetData.revenue.Door,
      "Merch Sold": budgetData.revenue["Merch Sold"],
      "Merch Vendors": budgetData.revenue["Merch Vendors"]
    }
  );
}

// Form reset function
export function resetForm() {
  const form = document.getElementById("budgetForm");
  if (form) form.reset();

  const numHeadliners = document.getElementById("numHeadliners");
  const numLocalDJs = document.getElementById("numLocalDJs");
  const numCDJs = document.getElementById("numCDJs");
  const numShowRunners = document.getElementById("numShowRunners");
  const numOtherCategories = document.getElementById("numOtherCategories");
  const numMerchVendors = document.getElementById("numMerchVendors");

  if (numHeadliners) numHeadliners.value = 1;
  if (numLocalDJs) numLocalDJs.value = 0;
  if (numCDJs) numCDJs.value = 0;
  if (numShowRunners) numShowRunners.value = 0;
  if (numOtherCategories) numOtherCategories.value = 0;
  if (numMerchVendors) numMerchVendors.value = 0;

  state.headliners = {};
  state.localDJs = {};
  state.cdjs = {};
  state.showRunners = {};
  state.otherCats = {};
  state.vendors = {};

  const containers = [
    "headlinerInputs",
    "localDJInputs",
    "cdjInputs",
    "showRunnerInputs",
    "allOtherCategories",
    "merchVendorInputs"
  ];

  containers.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });

  regenerateHeadliners(updateBudget);
  updateBudget();
}

// Download all files
export function downloadAll() {
  updateBudget();
  downloadCSV();
  exportTextPreviewTxt();
  setTimeout(() => {
    downloadChartsPNG(buildChartsPngFileName());
  }, 150);
}

// Collapsible toggle
export function toggleCollapse(id) {
  const section = document.getElementById(id);
  if (!section) return;
  section.classList.toggle("open");
}

// Make functions globally available for HTML onclick handlers
window.updateBudget = updateBudget;
window.resetForm = resetForm;
window.downloadCSV = downloadCSV;
window.triggerImport = triggerImport;
window.downloadAll = downloadAll;
window.toggleCollapse = toggleCollapse;
window.copyTextPreview = copyTextPreview;
window.exportTextPreviewTxt = exportTextPreviewTxt;
window.downloadChartsPNG = () => downloadChartsPNG(buildChartsPngFileName());

// Make regenerate functions global for HTML onchange handlers
window.regenerateHeadliners = () => regenerateHeadliners(updateBudget);
window.regenerateLocalDJs = () => regenerateLocalDJs(updateBudget);
window.regenerateCDJs = () => regenerateCDJs(updateBudget);
window.regenerateShowRunners = () => regenerateShowRunners(updateBudget);
window.regenerateVendors = () => regenerateVendors(updateBudget);
window.regenerateOtherCategories = () => regenerateOtherCategories(updateBudget);
window.regenerateOtherItems = (catId) => regenerateOtherItems(catId, updateBudget);

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // Setup CSV import handler
  setupCSVImport(
    {
      headliners: () => regenerateHeadliners(updateBudget),
      localDJs: () => regenerateLocalDJs(updateBudget),
      cdjs: () => regenerateCDJs(updateBudget),
      showRunners: () => regenerateShowRunners(updateBudget),
      vendors: () => regenerateVendors(updateBudget),
      otherCategories: () => regenerateOtherCategories(updateBudget),
      otherItems: (c) => regenerateOtherItems(c, updateBudget)
    },
    updateBudget
  );

  // Initialize with one headliner
  regenerateHeadliners(updateBudget);
  updateBudget();

});
