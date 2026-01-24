// client/js/main.js
// Purpose: bridge ES modules to the global functions referenced by index.html inline handlers.

import { state } from './modules/state.js';

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
import { updateCharts, downloadChartsPNG, setChartsTitle } from './modules/charts.js';
import { updateTextPreview, copyTextPreview, exportTextPreviewTxt } from './modules/textPreview.js';

import { buildCSVString, downloadCSV, loadCSV, setupCSVImport, triggerImport } from './modules/csv.js';

import {
  populateBudgetSelector,
  loadBudgetFromServer,
  saveBudgetToServer,
  deleteBudgetFromServer
} from './modules/serverLoad.js';

function $(id) {
  return document.getElementById(id);
}

function getMeta() {
  const name = ($('showTitle')?.value ?? '').trim() || 'Untitled Budget';
  const date = ($('showDate')?.value ?? '').trim() || new Date().toISOString().slice(0, 10);
  return { name, date };
}

/**
 * Core recalculation + UI refresh.
 * Must be global because index.html calls updateBudget() inline. :contentReference[oaicite:2]{index=2}
 */
function updateBudgetImpl() {
  const budgetData = calculateBudget(state);

  // Summary
  try { updateSummaryDisplay(budgetData); } catch {}
  try { updateSummaryDisplay(state, budgetData); } catch {}

  // Charts
  try { updateCharts(budgetData); } catch {}
  try { updateCharts(budgetData?.expenses, budgetData?.revenue); } catch {}
  try { updateCharts(state, budgetData); } catch {}

  // Charts title (if module supports it)
  try { setChartsTitle(getMeta().name); } catch {}

  // Text preview
  try { updateTextPreview(budgetData); } catch {}
  try { updateTextPreview(state, budgetData); } catch {}

  return budgetData;
}

/**
 * Regenerator wrappers used by csv.js loadCSV().
 * csv.js expects regenerators.merchVendors to exist. :contentReference[oaicite:3]{index=3}
 */
function makeRegenerators() {
  return {
    headliners: () => regenerateHeadliners(window.updateBudget),
    localDJs: () => regenerateLocalDJs(window.updateBudget),
    cdjs: () => regenerateCDJs(window.updateBudget),
    showRunners: () => regenerateShowRunners(window.updateBudget),
    vendors: () => regenerateVendors(window.updateBudget),
    merchVendors: () => regenerateVendors(window.updateBudget),
    otherCategories: () => regenerateOtherCategories(window.updateBudget),
    otherItems: (c) => regenerateOtherItems(c, window.updateBudget)
  };
}

const regenerators = makeRegenerators();

/**
 * Server handlers expected by index.html inline onclick/onchange. :contentReference[oaicite:4]{index=4}
 */
async function handleSaveBudgetToServerImpl() {
  const csvText = buildCSVString();
  const meta = getMeta();

  const result = await saveBudgetToServer(csvText, meta);

  await populateBudgetSelector('budgetSelector');

  if (result?.id) {
    const sel = $('budgetSelector');
    if (sel) sel.value = result.id;
  }
}

async function handleLoadSelectedBudgetImpl() {
  const sel = $('budgetSelector');
  const id = sel?.value;
  if (!id) return;
  await loadBudgetFromServer(id, regenerators, window.updateBudget);
}

async function handleBudgetSelectionImpl(budgetId) {
  // You currently show a Load button, so don't auto-load on select by default.
  // Keep as no-op unless you want auto-load behavior.
  void budgetId;
}

async function handleDeleteSelectedBudgetImpl() {
  const sel = $('budgetSelector');
  const id = sel?.value;
  if (!id) return;
  const ok = confirm('Delete this saved budget? This cannot be undone.');
  if (!ok) return;

  await deleteBudgetFromServer(id);
  await populateBudgetSelector('budgetSelector');
  if (sel) sel.value = '';
}

async function downloadAllImpl() {
  // Export CSV
  downloadCSV();

  // Export Charts PNG
  try { downloadChartsPNG(); } catch {}

  // Export Preview TXT
  try { exportTextPreviewTxt(); } catch {}
}

/**
 * CRITICAL FIX:
 * Expose globals at module evaluation time (immediately), not on DOMContentLoaded.
 * This prevents "ReferenceError: updateBudget is not defined" from inline handlers. :contentReference[oaicite:5]{index=5}
 */
function exposeGlobalsNow() {
  // Core
  window.updateBudget = updateBudgetImpl;

  // Repeaters (called inline by index.html) :contentReference[oaicite:6]{index=6}
  window.regenerateHeadliners = () => regenerateHeadliners(window.updateBudget);
  window.regenerateLocalDJs = () => regenerateLocalDJs(window.updateBudget);
  window.regenerateCDJs = () => regenerateCDJs(window.updateBudget);
  window.regenerateShowRunners = () => regenerateShowRunners(window.updateBudget);
  window.regenerateVendors = () => regenerateVendors(window.updateBudget);
  window.regenerateOtherCategories = () => regenerateOtherCategories(window.updateBudget);
  window.regenerateOtherItems = (c) => regenerateOtherItems(c, window.updateBudget);

  // CSV
  window.downloadCSV = downloadCSV;
  window.triggerImport = triggerImport;

  // Preview
  window.copyTextPreview = copyTextPreview;
  window.exportTextPreviewTxt = exportTextPreviewTxt;

  // Charts
  window.downloadChartsPNG = downloadChartsPNG;

  // Server
  window.handleSaveBudgetToServer = () =>
    handleSaveBudgetToServerImpl().catch((e) => {
      console.error(e);
      alert(`Save failed: ${e.message || e}`);
    });

  window.handleLoadSelectedBudget = () =>
    handleLoadSelectedBudgetImpl().catch((e) => {
      console.error(e);
      alert(`Load failed: ${e.message || e}`);
    });

  window.handleBudgetSelection = (v) =>
    handleBudgetSelectionImpl(v).catch?.((e) => console.error(e));

  window.handleDeleteSelectedBudget = () =>
    handleDeleteSelectedBudgetImpl().catch((e) => {
      console.error(e);
      alert(`Delete failed: ${e.message || e}`);
    });

  window.downloadAll = () =>
    downloadAllImpl().catch((e) => {
      console.error(e);
      alert(`Download failed: ${e.message || e}`);
    });
}

// Expose globals immediately
exposeGlobalsNow();

/**
 * DOM-dependent initialization (safe to run after DOM ready).
 */
window.addEventListener('DOMContentLoaded', async () => {
  // CSV import wiring
  setupCSVImport(regenerators, window.updateBudget);

  // Ensure UI has required dynamic fields
  regenerateHeadliners(window.updateBudget);

  // Initial calc/preview
  window.updateBudget();

  // Populate server budgets
  try {
    await populateBudgetSelector('budgetSelector');
  } catch (e) {
    console.warn('Budget list load failed:', e);
  }
});
