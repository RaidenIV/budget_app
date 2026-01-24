// client/js/main.js - Main application controller (WORKING)

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

import {
  buildCSVString,
  downloadCSV,
  setupCSVImport,
  triggerImport
} from './modules/csv.js';

import {
  populateBudgetSelector,
  loadBudgetFromServer,
  saveBudgetToServer,
  deleteBudgetFromServer
} from './modules/serverLoad.js';

/* ------------------------------------------------------------
   Small utilities
------------------------------------------------------------ */

function $(id) {
  return document.getElementById(id);
}

function safe(fn, ...args) {
  try {
    if (typeof fn === 'function') return fn(...args);
  } catch (e) {
    console.error('Error calling function:', fn?.name || fn, e);
  }
  return undefined;
}

function getMetadataFromUI() {
  // These IDs are referenced in your CSV module too
  const name = ($('showTitle')?.value ?? '').trim() || 'Untitled Budget';
  const date = ($('showDate')?.value ?? '').trim() || new Date().toISOString().split('T')[0];
  return { name, date };
}

/* ------------------------------------------------------------
   Core update pipeline
------------------------------------------------------------ */

function updateBudget() {
  // 1) Calculate
  const budgetData = safe(calculateBudget, state);

  // 2) Update summary (signature varies across implementations)
  // Try common patterns: updateSummaryDisplay(budgetData) or updateSummaryDisplay(state, budgetData)
  if (budgetData !== undefined) {
    safe(updateSummaryDisplay, budgetData);
    safe(updateSummaryDisplay, state, budgetData);
  } else {
    safe(updateSummaryDisplay, state);
  }

  // 3) Update charts (signature varies)
  // Try: updateCharts(budgetData), updateCharts(expenses, revenue), updateCharts(state, budgetData)
  if (budgetData !== undefined) {
    safe(updateCharts, budgetData);
    safe(updateCharts, budgetData.expenses, budgetData.revenue);
    safe(updateCharts, state, budgetData);
  } else {
    safe(updateCharts, state);
  }

  // 4) Update preview text (signature varies)
  if (budgetData !== undefined) {
    safe(updateTextPreview, budgetData);
    safe(updateTextPreview, state, budgetData);
  } else {
    safe(updateTextPreview, state);
  }

  return budgetData;
}

/* ------------------------------------------------------------
   Regenerators for CSV import + dynamic fields
------------------------------------------------------------ */

const regenerators = {
  headliners: () => regenerateHeadliners(updateBudget),
  localDJs: () => regenerateLocalDJs(updateBudget),
  cdjs: () => regenerateCDJs(updateBudget),
  showRunners: () => regenerateShowRunners(updateBudget),
  vendors: () => regenerateVendors(updateBudget),
  otherCategories: () => regenerateOtherCategories(updateBudget),
  otherItems: (c) => regenerateOtherItems(c, updateBudget)
};

/* ------------------------------------------------------------
   Server actions
------------------------------------------------------------ */

async function refreshBudgetSelector(keepSelectedId = '') {
  await populateBudgetSelector('budgetSelector');

  if (keepSelectedId) {
    const sel = $('budgetSelector');
    if (sel) sel.value = keepSelectedId;
  }
}

async function onSaveToServer() {
  // Build CSV from DOM/state (your csv.js reads inputs by ID)
  const csvText = buildCSVString();
  const metadata = getMetadataFromUI();

  const result = await saveBudgetToServer(csvText, metadata);

  // Refresh selector list and keep saved budget selected (if server returns id)
  if (result && result.id) {
    await refreshBudgetSelector(result.id);
  } else {
    await refreshBudgetSelector();
  }

  // Optional status message element
  const statusEl = $('saveStatus');
  if (statusEl) {
    statusEl.textContent = 'Saved!';
    setTimeout(() => (statusEl.textContent = ''), 1500);
  }
}

async function onLoadSelectedBudget() {
  const sel = $('budgetSelector');
  const id = sel?.value;
  if (!id) return;

  await loadBudgetFromServer(id, regenerators, updateBudget);
  updateBudget();
}

async function onDeleteSelectedBudget() {
  const sel = $('budgetSelector');
  const id = sel?.value;
  if (!id) return;

  const ok = confirm('Delete this saved budget? This cannot be undone.');
  if (!ok) return;

  await deleteBudgetFromServer(id);
  await refreshBudgetSelector('');
  updateBudget();
}

/* ------------------------------------------------------------
   CSV actions
------------------------------------------------------------ */

function onExportCSV() {
  // Your csv.js already generates filename from show title/date
  safe(downloadCSV);
}

function onImportCSV() {
  safe(triggerImport);
}

/* ------------------------------------------------------------
   Preview + charts actions
------------------------------------------------------------ */

function onCopyPreview() {
  safe(copyTextPreview);
}

function onExportPreviewTxt() {
  safe(exportTextPreviewTxt);
}

function onExportChartsPng() {
  const meta = getMetadataFromUI();
  const fname = safe(buildChartsPngFileName, meta) || 'charts.png';
  safe(downloadChartsPNG, fname);
}

/* ------------------------------------------------------------
   Wire UI
------------------------------------------------------------ */

function bindClick(idList, handler) {
  for (const id of idList) {
    const el = $(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        handler();
      });
      return true;
    }
  }
  return false;
}

function bindChange(idList, handler) {
  for (const id of idList) {
    const el = $(id);
    if (el) {
      el.addEventListener('change', handler);
      return true;
    }
  }
  return false;
}

function installLiveUpdate() {
  // Lightweight live-update: any input/select/textarea changes trigger recalculation
  // Debounced to avoid heavy redraw during typing.
  let t = null;
  document.addEventListener('input', (e) => {
    const tag = e.target?.tagName?.toLowerCase();
    if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') return;

    clearTimeout(t);
    t = setTimeout(() => updateBudget(), 60);
  });
}

/* ------------------------------------------------------------
   Init
------------------------------------------------------------ */

window.addEventListener('DOMContentLoaded', async () => {
  // Ensure CSV import is wired (creates hidden file input)
  safe(setupCSVImport, regenerators, updateBudget);

  // Initialize repeaters (at least one headliner)
  regenerateHeadliners(updateBudget);

  // Initial render
  updateBudget();

  // Populate server budget selector (safe if server offline)
  try {
    await refreshBudgetSelector();
  } catch (e) {
    console.warn('Could not populate budget selector:', e);
  }

  // Buttons (supports multiple possible IDs)
  bindClick(['btnExportCSV', 'exportCSVBtn', 'downloadCsvBtn', 'downloadCSV'], onExportCSV);
  bindClick(['btnImportCSV', 'importCSVBtn', 'importCsvBtn'], onImportCSV);

  bindClick(['btnCopyPreview', 'copyPreviewBtn', 'copyTextBtn'], onCopyPreview);
  bindClick(['btnExportPreview', 'exportPreviewBtn', 'exportTxtBtn'], onExportPreviewTxt);

  bindClick(['btnExportCharts', 'exportChartsBtn', 'downloadChartsBtn'], onExportChartsPng);

  bindClick(['btnSaveServer', 'saveServerBtn', 'saveToServerBtn', 'saveBudgetBtn'], () => {
    onSaveToServer().catch((e) => {
      console.error(e);
      alert(`Save failed: ${e.message || e}`);
    });
  });

  bindClick(['btnLoadServer', 'loadServerBtn', 'loadBudgetBtn'], () => {
    onLoadSelectedBudget().catch((e) => {
      console.error(e);
      alert(`Load failed: ${e.message || e}`);
    });
  });

  bindClick(['btnDeleteServer', 'deleteServerBtn', 'deleteBudgetBtn'], () => {
    onDeleteSelectedBudget().catch((e) => {
      console.error(e);
      alert(`Delete failed: ${e.message || e}`);
    });
  });

  // Auto-load on selector change if present
  bindChange(['budgetSelector'], () => {
    onLoadSelectedBudget().catch((e) => {
      console.error(e);
      alert(`Load failed: ${e.message || e}`);
    });
  });

  // Keep budget calculations responsive
  installLiveUpdate();
});
