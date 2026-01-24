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

import {
  updateTextPreview,
  copyTextPreview,
  exportTextPreviewTxt
} from './modules/textPreview.js';

import { buildCSVString, downloadCSV, setupCSVImport, triggerImport } from './modules/csv.js';

// Server load/save functions
import { 
  populateBudgetSelector, 
  loadBudgetFromServer,
  saveBudgetToServer 
} from './modules/serverLoad.js';

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

  // Reset the budget selector dropdown
  const budgetSelector = document.getElementById("budgetSelector");
  if (budgetSelector) {
    budgetSelector.value = "";
  }

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

/**
 * Build the regenerators map used by CSV import and server-loaded CSV.
 */
function buildRegenerators() {
  return {
    headliners: () => regenerateHeadliners(updateBudget),
    localDJs: () => regenerateLocalDJs(updateBudget),
    cdjs: () => regenerateCDJs(updateBudget),
    showRunners: () => regenerateShowRunners(updateBudget),
    vendors: () => regenerateVendors(updateBudget),
    merchVendors: () => regenerateVendors(updateBudget),
    otherCategories: () => regenerateOtherCategories(updateBudget),
    otherItems: (c) => regenerateOtherItems(c, updateBudget)
  };
}

/**
 * Helper to get current show metadata
 */
function getShowMetadata() {
  const name = (document.getElementById('showTitle')?.value || '').trim() || 'Untitled Budget';
  const date = (document.getElementById('showDate')?.value || '').trim() || new Date().toISOString().slice(0, 10);
  return { name, date };
}

/**
 * Save budget to server - CRITICAL HANDLER
 */
async function handleSaveBudgetToServerImpl() {
  const statusEl = document.getElementById('loadStatus');
  
  try {
    if (statusEl) statusEl.textContent = 'Saving budget...';
    
    const csvData = buildCSVString();
    const metadata = getShowMetadata();
    
    console.log('Saving budget:', metadata);
    const result = await saveBudgetToServer(csvData, metadata);
    
    console.log('Save result:', result);
    
    if (statusEl) {
      statusEl.textContent = 'Budget saved successfully!';
      setTimeout(() => (statusEl.textContent = ''), 3000);
    }
    
    // Refresh the budget selector to show the newly saved budget
    await populateBudgetSelector('budgetSelector');
    
  } catch (error) {
    console.error('Save error:', error);
    if (statusEl) {
      statusEl.textContent = `Error: ${error.message}`;
    }
    alert(`Failed to save budget: ${error.message}`);
  }
}

/**
 * Load selected budget from server - CRITICAL HANDLER
 */
async function handleLoadSelectedBudgetImpl() {
  const select = document.getElementById('budgetSelector');
  const budgetId = select?.value;
  
  if (!budgetId) {
    alert('Please select a budget to load');
    return;
  }
  
  try {
    const regenerators = buildRegenerators();
    await loadBudgetFromServer(budgetId, regenerators, updateBudget);
  } catch (error) {
    console.error('Load error:', error);
    alert(`Failed to load budget: ${error.message}`);
  }
}

/**
 * Handle budget selection change
 */
async function handleBudgetSelectionImpl(budgetId) {
  if (!budgetId) return;
  // Optional: auto-load on selection
  // Uncomment the next line if you want budgets to load automatically when selected
  // await handleLoadSelectedBudgetImpl();
}

// CRITICAL: Make ALL functions globally available for HTML onclick handlers
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

// CRITICAL: Server load/save handlers (THESE WERE MISSING!)
window.handleSaveBudgetToServer = () => handleSaveBudgetToServerImpl().catch(err => {
  console.error('handleSaveBudgetToServer error:', err);
  alert(`Save failed: ${err.message}`);
});

window.handleLoadSelectedBudget = () => handleLoadSelectedBudgetImpl().catch(err => {
  console.error('handleLoadSelectedBudget error:', err);
  alert(`Load failed: ${err.message}`);
});

window.handleBudgetSelection = (budgetId) => handleBudgetSelectionImpl(budgetId).catch(err => {
  console.error('handleBudgetSelection error:', err);
});

// Initialize on DOM ready
document.addEventListener("DOMContentLoaded", async () => {
  console.log('🚀 Budget App Initializing...');

  // Verify critical functions are accessible
  console.log('✅ updateBudget:', typeof window.updateBudget === 'function');
  console.log('✅ handleSaveBudgetToServer:', typeof window.handleSaveBudgetToServer === 'function');
  console.log('✅ handleLoadSelectedBudget:', typeof window.handleLoadSelectedBudget === 'function');
  console.log('✅ handleBudgetSelection:', typeof window.handleBudgetSelection === 'function');

  // Populate the budget selector dropdown
  try {
    console.log('Populating budget selector...');
    await populateBudgetSelector("budgetSelector");
    console.log('✅ Budget selector populated');
  } catch (e) {
    console.error("❌ Failed to populate budget selector:", e);
    console.error("This usually means the server isn't running or the API URL is wrong");
  }

  // Setup CSV import handler
  setupCSVImport(buildRegenerators(), updateBudget);

  // Initialize with one headliner
  regenerateHeadliners(updateBudget);
  updateBudget();

  console.log('✅ Budget App Ready!');
});
