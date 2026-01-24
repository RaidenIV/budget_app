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
 * IMPORTANT: must be global because index.html calls updateBudget() inline. :contentReference[oaicite:1]{index=1}
 */
function updateBudgetImpl() {
  const budgetData = calculateBudget(state);

  // Summary
  try { updateSummaryDisplay(budgetData); } catch (e) { /* allow older signatures */ }
  try { updateSummaryDisplay(state, budgetData); } catch (e) {}

  // Charts
  try { updateCharts(budgetData); } catch (e) {}
  try { updateCharts(budgetData?.expenses, budgetData?.revenue); } catch (e) {}
  try { updateCharts(state, budgetData); } catch (e) {}

  // Charts title (if module supports it)
  try { setChartsTitle(getMeta().name); } catch (e) {}

  // Text preview
  try { updateTextPreview(budgetData); } catch (e) {}
  try { updateTextPreview(state, budgetData); } catch (e) {}

  return budgetData;
}

/**
 * Regenerator wrappers (must be global because index.html calls them inline). :contentReference[oaicite:2]{index=2}
 */
function makeRegenerators() {
  return {
    headliners: () => regenerateHeadliners(window.updateBudget),
    localDJs: () => regenerateLocalDJs(window.updateBudget),
    cdjs: () => regenerateCDJs(window.updateBudget),
    showRunners: () => regenerateShowRunners(window.updateBudget),
    vendors: () => regenerateVendors(window.updateBudget),
    otherCategories: () => regenerateOtherCategories(window.updateBudget),
    otherItems: (c) => regenerateOtherItems(c, window.updateBudget),
    merchVendors: () => regenerateVendors(window.updateBudget) // alias; csv.js references regenerators.merchVendors :contentReference[oaicite:3]{index=3}
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

  // Refresh list after save so updatedAt changes show up
  await populateBudgetSelector('budgetSelector');

  // Keep selection on the saved budget if server returns id
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
  // index.html calls this on dropdown change; we’ll just no-op if empty,
  // and *not* auto-load unless you want it.
  if (!budgetId) return;
  // Optional: auto-load on selection
  // await loadBudgetFromServer(budgetId, regenerators, window.updateBudget);
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

/**
 * index.html calls downloadAll(). It didn’t exist in your uploaded files.
 * Provide a reasonable implementation: export CSV + charts PNG + text preview txt.
 */
async function downloadAllImpl() {
  // CSV
  downloadCSV();

  // Charts PNG (your charts module expects no args per index.html usage) :contentReference[oaicite:5]{index=5}
  try { downloadChartsPNG(); } catch (e) {}

  // Text preview TXT
  try { exportTextPreviewTxt(); } catch (e) {}
}

/**
 * Expose globals expected by inline HTML handlers.
 * This is the critical fix.
 */
function exposeGlobals() {
  // Core
  window.updateBudget = updateBudgetImpl;

  // Repeaters
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

  // Preview actions (index.html calls these inline) :contentReference[oaicite:6]{index=6}
  window.copyTextPreview = copyTextPreview;
  window.exportTextPreviewTxt = exportTextPreviewTxt;

  // Charts export (index.html calls downloadChartsPNG() inline) :contentReference[oaicite:7]{index=7}
  window.downloadChartsPNG = downloadChartsPNG;

  // Server load/save handlers used by index.html
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

  // Optional delete handler (not in your HTML currently, but useful)
  window.handleDeleteSelectedBudget = () =>
    handleDeleteSelectedBudgetImpl().catch((e) => {
      console.error(e);
      alert(`Delete failed: ${e.message || e}`);
    });

  // Download all
  window.downloadAll = () =>
    downloadAllImpl().catch((e) => {
      console.error(e);
      alert(`Download failed: ${e.message || e}`);
    });
}

window.addEventListener('DOMContentLoaded', async () => {
  // Make globals available before any inline handlers fire
  exposeGlobals();

  // CSV import wiring (creates hidden file input if missing)
  setupCSVImport(regenerators, window.updateBudget);

  // Initial UI setup
  regenerateHeadliners(window.updateBudget);
  window.updateBudget();

  // Populate saved budgets
  try {
    await populateBudgetSelector('budgetSelector');
  } catch (e) {
    console.warn('Budget list load failed:', e);
  }
});
