// client/js/main.js - Main application controller

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

import { exportCSV, importCSVFromFile } from './modules/csv.js';

import {
  populateBudgetSelector,
  loadBudgetFromServer,
  saveBudgetToServer,
  deleteBudgetFromServer,
  clearActiveBudgetId
} from './modules/serverLoad.js';

import { wireUiHandlers } from './uiHandlers.js';

/**
 * Core update loop: read current state, compute budget, refresh UI (summary, charts, preview)
 */
function updateBudget() {
  const budgetData = calculateBudget(state);

  updateSummaryDisplay(budgetData);

  updateCharts(
    {
      Headliners: budgetData.expenses?.Headliners || 0,
      Support: budgetData.expenses?.Support || 0,
      Production: budgetData.expenses?.Production || 0,
      Gear: budgetData.expenses?.Gear || 0,
      Marketing: budgetData.expenses?.Marketing || 0,
      Staff: budgetData.expenses?.Staff || 0,
      Other: budgetData.expenses?.Other || 0
    },
    budgetData.revenue || {}
  );

  updateTextPreview(budgetData);

  return budgetData;
}

/**
 * Gather metadata for saving.
 * Update these selectors to match your actual DOM IDs if different.
 */
function getBudgetMetadata() {
  const nameEl = document.getElementById('showTitle') || document.getElementById('showName');
  const dateEl = document.getElementById('showDate');

  return {
    name: nameEl ? nameEl.value : 'Untitled Budget',
    date: dateEl ? dateEl.value : new Date().toISOString().split('T')[0]
  };
}

/**
 * Init
 */
window.addEventListener('DOMContentLoaded', async () => {
  // Regenerator hooks used by CSV loader
  const regenerators = {
    headliners: () => regenerateHeadliners(updateBudget),
    localDJs: () => regenerateLocalDJs(updateBudget),
    cdjs: () => regenerateCDJs(updateBudget),
    showRunners: () => regenerateShowRunners(updateBudget),
    vendors: () => regenerateVendors(updateBudget),
    otherCategories: () => regenerateOtherCategories(updateBudget),
    otherItems: (c) => regenerateOtherItems(c, updateBudget)
  };

  // Ensure at least one headliner row exists on first load
  regenerateHeadliners(updateBudget);

  // Initial render
  updateBudget();

  // Populate saved budgets selector from server
  try {
    await populateBudgetSelector('budgetSelector');
  } catch {
    // populateBudgetSelector already alerts on failure
  }

  // Wire UI events
  wireUiHandlers({
    state,
    updateBudget,

    // CSV
    exportCSV: () => exportCSV(state),
    importCSVFromFile: (file) => importCSVFromFile(file, regenerators, updateBudget),

    // Preview
    copyTextPreview,
    exportTextPreviewTxt,

    // Charts export
    downloadChartsPNG: () => downloadChartsPNG(buildChartsPngFileName(getBudgetMetadata())),

    // Server save/load
    saveToServer: async () => {
      const csvData = exportCSV(state);
      const metadata = getBudgetMetadata();
      const result = await saveBudgetToServer(csvData, metadata);

      // Refresh selector list so updatedAt reflects
      await populateBudgetSelector('budgetSelector');
      return result;
    },

    loadFromServer: async (budgetId) => {
      await loadBudgetFromServer(budgetId, regenerators, updateBudget);
      updateBudget();
    },

    deleteFromServer: async (budgetId) => {
      await deleteBudgetFromServer(budgetId);
      await populateBudgetSelector('budgetSelector');
    },

    newBudget: () => {
      // optional: clear active budget ID so next save creates a new budget
      clearActiveBudgetId();
    }
  });
});
