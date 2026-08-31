// main.js - Main application controller

import { state } from './modules/state.js';
import { buildChartsPngFileName } from './modules/utils.js';

import {
  regenerateHeadliners,
  regenerateLocalDJs,
  regenerateCDJs,
  regenerateShowRunners,
  regenerateMedia,
  regenerateVendors,
  regenerateOtherCategories,
  regenerateOtherItems
} from './modules/repeaters.js';

import { calculateBudget, updateSummaryDisplay } from './modules/budgetCalculator.js';
import { updateCharts, downloadChartsPNG } from './modules/charts.js';

import {
  updateTextPreview,
  copyTextPreview,
  exportTextPreviewTxt
} from './modules/textPreview.js';

import { downloadCSV, setupCSVImport, triggerImport } from './modules/csv.js';

// NEW: server load + selector population
import { populateBudgetSelector, loadBudgetFromServer } from './modules/serverLoad.js';

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
      Media: budgetData.expenses.Media,
      Other: budgetData.expenses.Other
    },
    {
      Eventbrite: budgetData.revenue.Eventbrite,
      "Posh Sales": budgetData.revenue["Posh Sales"],
      "Raffle Sales": budgetData.revenue["Raffle Sales"],
      Presales: budgetData.revenue.Presales,
      "Promo Team Sales": budgetData.revenue["Promo Team Sales"],
      Door: budgetData.revenue.Door,
      "Merch Sold": budgetData.revenue["Merch Sold"],
      "Merch Vendors": budgetData.revenue["Merch Vendors"],
      "Other Sales": budgetData.revenue["Other Sales"]
    }
  );
}

function getTicketTypeInputValues() {
  const values = {};
  document
    .querySelectorAll('[id^="ticketTypeName_"], [id^="ticketTypePrice_"], [id^="ticketTypeSold_"], [id^="ticketTypeAvailable_"]')
    .forEach((el) => {
      values[el.id] = el.value;
    });
  return values;
}

function setTicketTypeCount(count) {
  const countInput = document.getElementById("numTicketTypes");
  if (!countInput) return 0;

  const safeCount = Math.max(0, Math.min(10, Math.floor(Number(count) || 0)));
  countInput.value = String(safeCount);
  return safeCount;
}

function renderTicketTypeRows(count, previousValues = getTicketTypeInputValues()) {
  const container = document.getElementById("ticketTypeInputs");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 1; i <= count; i++) {
    const row = document.createElement("div");
    row.className = "ads-split-row break-even-ticket-row";

    const nameCol = document.createElement("div");
    nameCol.className = "ads-split-col";

    const nameLabel = document.createElement("div");
    nameLabel.className = "ads-split-label";
    nameLabel.textContent = `Ticket Type ${i}`;

    const nameInput = document.createElement("input");
    nameInput.id = `ticketTypeName_${i}`;
    nameInput.type = "text";
    nameInput.placeholder = "Name";
    nameInput.value = previousValues[nameInput.id] || "";
    nameInput.addEventListener("input", updateBudget);

    nameCol.append(nameLabel, nameInput);

    const priceCol = document.createElement("div");
    priceCol.className = "ads-split-col";

    const priceLabel = document.createElement("div");
    priceLabel.className = "ads-split-label";
    priceLabel.textContent = "Price";

    const priceInput = document.createElement("input");
    priceInput.id = `ticketTypePrice_${i}`;
    priceInput.type = "number";
    priceInput.min = "0";
    priceInput.step = "0.01";
    priceInput.placeholder = "0.00";
    priceInput.value = previousValues[priceInput.id] || "";
    priceInput.addEventListener("input", updateBudget);

    priceCol.append(priceLabel, priceInput);

    const soldCol = document.createElement("div");
    soldCol.className = "ads-split-col";

    const soldLabel = document.createElement("div");
    soldLabel.className = "ads-split-label";
    soldLabel.textContent = "Sold";

    const soldInput = document.createElement("input");
    soldInput.id = `ticketTypeSold_${i}`;
    soldInput.type = "number";
    soldInput.min = "0";
    soldInput.step = "1";
    soldInput.placeholder = "0";
    soldInput.value = previousValues[soldInput.id] || "";
    soldInput.addEventListener("input", updateBudget);

    soldCol.append(soldLabel, soldInput);

    const availableCol = document.createElement("div");
    availableCol.className = "ads-split-col";

    const availableLabel = document.createElement("div");
    availableLabel.className = "ads-split-label";
    availableLabel.textContent = "Capacity";

    const availableInput = document.createElement("input");
    availableInput.id = `ticketTypeAvailable_${i}`;
    availableInput.type = "number";
    availableInput.min = "0";
    availableInput.step = "1";
    availableInput.placeholder = "0";
    availableInput.value = previousValues[availableInput.id] || "";
    availableInput.addEventListener("input", updateBudget);

    availableCol.append(availableLabel, availableInput);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-ticket-type-btn";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", `Remove ticket type ${i}`);
    removeButton.addEventListener("click", () => removeTicketType(i));

    row.append(nameCol, priceCol, soldCol, availableCol, removeButton);
    container.appendChild(row);
  }
}

export function regenerateTicketTypes() {
  const countInput = document.getElementById("numTicketTypes");
  if (!countInput) return;

  const count = setTicketTypeCount(countInput.value);
  renderTicketTypeRows(count);
  updateBudget();
}

export function addTicketType() {
  const countInput = document.getElementById("numTicketTypes");
  if (!countInput) return;

  const nextCount = setTicketTypeCount((Number(countInput.value) || 0) + 1);
  renderTicketTypeRows(nextCount);
  updateBudget();
}

export function removeTicketType(indexToRemove) {
  const countInput = document.getElementById("numTicketTypes");
  if (!countInput) return;

  const currentCount = Math.max(0, Math.min(10, Math.floor(Number(countInput.value) || 0)));
  const previousValues = getTicketTypeInputValues();
  const shiftedValues = {};
  let nextIndex = 1;

  for (let i = 1; i <= currentCount; i++) {
    if (i === indexToRemove) continue;

    shiftedValues[`ticketTypeName_${nextIndex}`] = previousValues[`ticketTypeName_${i}`] || "";
    shiftedValues[`ticketTypePrice_${nextIndex}`] = previousValues[`ticketTypePrice_${i}`] || "";
    shiftedValues[`ticketTypeSold_${nextIndex}`] = previousValues[`ticketTypeSold_${i}`] || "";
    shiftedValues[`ticketTypeAvailable_${nextIndex}`] = previousValues[`ticketTypeAvailable_${i}`] || "";
    nextIndex++;
  }

  const nextCount = setTicketTypeCount(currentCount - 1);
  renderTicketTypeRows(nextCount, shiftedValues);
  updateBudget();
}

// Form reset function
export function resetForm() {
  const form = document.getElementById("budgetForm");
  if (form) form.reset();

  // Reset the budget selector dropdown
  const budgetSelector = document.getElementById("budgetSelector");
  if (budgetSelector) {
    budgetSelector.value = "";
  }

  const numHeadliners = document.getElementById("numHeadliners");
  const numLocalDJs = document.getElementById("numLocalDJs");
  const numCDJs = document.getElementById("numCDJs");
  const numShowRunners = document.getElementById("numShowRunners");
  const numMedia = document.getElementById("numMedia");
  const numOtherCategories = document.getElementById("numOtherCategories");
  const numMerchVendors = document.getElementById("numMerchVendors");
  const numTicketTypes = document.getElementById("numTicketTypes");

  if (numHeadliners) numHeadliners.value = 1;
  if (numLocalDJs) numLocalDJs.value = 0;
  if (numCDJs) numCDJs.value = 0;
  if (numShowRunners) numShowRunners.value = 0;
  if (numMedia) numMedia.value = 0;
  if (numOtherCategories) numOtherCategories.value = 0;
  if (numMerchVendors) numMerchVendors.value = 0;
  if (numTicketTypes) numTicketTypes.value = 0;

  state.headliners = {};
  state.localDJs = {};
  state.cdjs = {};
  state.showRunners = {};
  state.media = {};
  state.otherCats = {};
  state.vendors = {};

  const containers = [
    "headlinerInputs",
    "localDJInputs",
    "cdjInputs",
    "showRunnerInputs",
    "mediaInputs",
    "allOtherCategories",
    "merchVendorInputs",
    "ticketTypeInputs"
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

/**
 * Build the regenerators map used by CSV import and server-loaded CSV.
 * Some code paths may refer to "vendors" vs "merchVendors", so we provide both.
 */
function buildRegenerators() {
  return {
    headliners: () => regenerateHeadliners(updateBudget),
    localDJs: () => regenerateLocalDJs(updateBudget),
    cdjs: () => regenerateCDJs(updateBudget),
    showRunners: () => regenerateShowRunners(updateBudget),
    media: () => regenerateMedia(updateBudget),

    // Merch vendors are handled by the same repeater in this codebase
    vendors: () => regenerateVendors(updateBudget),
    merchVendors: () => regenerateVendors(updateBudget),

    otherCategories: () => regenerateOtherCategories(updateBudget),
    otherItems: (c) => regenerateOtherItems(c, updateBudget),
    ticketTypes: () => regenerateTicketTypes()
  };
}

// CRITICAL: Make ALL functions globally available for HTML onclick handlers
// Without these, buttons won't work!
window.updateBudget = updateBudget;
window.resetForm = resetForm;
window.downloadCSV = downloadCSV;
window.triggerImport = triggerImport;
window.downloadAll = downloadAll;
window.toggleCollapse = toggleCollapse;
window.regenerateTicketTypes = regenerateTicketTypes;
window.addTicketType = addTicketType;
window.removeTicketType = removeTicketType;
window.copyTextPreview = copyTextPreview;
window.exportTextPreviewTxt = exportTextPreviewTxt;
window.downloadChartsPNG = () => downloadChartsPNG(buildChartsPngFileName());

// Make regenerate functions global for HTML onchange handlers
window.regenerateHeadliners = () => regenerateHeadliners(updateBudget);
window.regenerateLocalDJs = () => regenerateLocalDJs(updateBudget);
window.regenerateCDJs = () => regenerateCDJs(updateBudget);
window.regenerateShowRunners = () => regenerateShowRunners(updateBudget);
window.regenerateMedia = () => regenerateMedia(updateBudget);
window.regenerateVendors = () => regenerateVendors(updateBudget);
window.regenerateOtherCategories = () => regenerateOtherCategories(updateBudget);
window.regenerateOtherItems = (catId) => regenerateOtherItems(catId, updateBudget);

// NEW: this is what your <select onchange="handleBudgetSelection(this.value)"> needs
window.handleBudgetSelection = async (budgetId) => {
  if (!budgetId) return;

  try {
    const regenerators = buildRegenerators();
    await loadBudgetFromServer(budgetId, regenerators, updateBudget);
  } catch (err) {
    console.error('Failed to load selected budget:', err);
  }
};

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log('🚀 Budget App Initializing...');

  // Verify functions are accessible
  console.log('✅ updateBudget available:', typeof window.updateBudget === 'function');
  console.log('✅ regenerateHeadliners available:', typeof window.regenerateHeadliners === 'function');
  console.log('✅ handleBudgetSelection available:', typeof window.handleBudgetSelection === 'function');

  // Populate the "Load Previous Budget" selector
  try {
    await populateBudgetSelector("budgetSelector");
  } catch (e) {
    console.error("Failed to populate budget selector:", e);
  }

  // Setup CSV import handler
  setupCSVImport(buildRegenerators(), updateBudget);

  // Initialize with one headliner
  regenerateHeadliners(updateBudget);
  regenerateTicketTypes();
  updateBudget();

  console.log('✅ Budget App Ready!');
});
