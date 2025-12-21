// uiHandlers.js - UI event handlers for server budget loading

import {
  loadBudgetFromServer,
  fetchBudgetList,
  populateBudgetSelector,
  saveBudgetToServer,
  searchBudgets,
  deleteBudgetFromServer
} from './modules/serverLoad.js';

import { updateBudget } from './main.js';
import { buildCSVString } from './modules/csv.js';

// Store currently selected budget ID
let selectedBudgetId = null;

/**
 * Initialize the budget selector dropdown
 */
export async function initBudgetSelector() {
  await populateBudgetSelector('budgetSelector');
}

/**
 * Handle budget selection from dropdown
 * IMPORTANT: Your HTML has NO "Load" button, so selection MUST trigger loading.
 */
export function handleBudgetSelection(budgetId) {
  selectedBudgetId = budgetId || null;
  console.log('Budget selected:', selectedBudgetId);

  // Auto-load immediately on selection
  if (selectedBudgetId) {
    handleLoadSelectedBudget().catch((err) => {
      console.error('Auto-load failed:', err);
    });
  }
}

/**
 * Load the selected budget
 */
export async function handleLoadSelectedBudget() {
  if (!selectedBudgetId) {
    alert('Please select a budget first');
    return;
  }

  const regenerators = {
    headliners: () => window.regenerateHeadliners?.(),
    localDJs: () => window.regenerateLocalDJs?.(),
    cdjs: () => window.regenerateCDJs?.(),
    showRunners: () => window.regenerateShowRunners?.(),
    vendors: () => window.regenerateVendors?.(),
    merchVendors: () => window.regenerateVendors?.(), // defensive alias
    otherCategories: () => window.regenerateOtherCategories?.(),
    otherItems: (c) => window.regenerateOtherItems?.(c)
  };

  await loadBudgetFromServer(selectedBudgetId, regenerators, updateBudget);
}

/**
 * Search budgets with filters (if you use the search UI)
 */
export async function handleSearchBudgets() {
  const name = document.getElementById('searchName')?.value || '';
  const dateFrom = document.getElementById('searchDateFrom')?.value || '';
  const dateTo = document.getElementById('searchDateTo')?.value || '';

  try {
    const results = await searchBudgets({ name, dateFrom, dateTo });
    displaySearchResults(results);
  } catch (error) {
    alert('Search failed: ' + error.message);
  }
}

/**
 * Display search results in the UI (if you use the search UI)
 */
function displaySearchResults(budgets) {
  const resultsContainer = document.getElementById('budgetResults');
  if (!resultsContainer) return;

  if (budgets.length === 0) {
    resultsContainer.innerHTML = `
      <p>No budgets found</p>
    `;
    return;
  }

  resultsContainer.innerHTML = budgets.map(budget => `
    <div class="budget-result">
      <div><strong>${budget.name}</strong></div>
      <div>${budget.date}</div>
      <div class="button-row">
        <button type="button" onclick="loadBudgetById('${budget.id || budget._id}')">Load</button>
        <button type="button" class="btn-danger" onclick="deleteBudgetById('${budget.id || budget._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/**
 * Load a specific budget by ID
 */
export async function loadBudgetById(budgetId) {
  selectedBudgetId = budgetId || null;
  await handleLoadSelectedBudget();
}

/**
 * Delete a budget with confirmation
 */
export async function deleteBudgetById(budgetId) {
  if (!confirm('Are you sure you want to delete this budget?')) return;

  try {
    await deleteBudgetFromServer(budgetId);
    alert('Budget deleted successfully');

    // Refresh UI
    if (document.getElementById('searchName')) await handleSearchBudgets();
    if (document.getElementById('budgetSelector')) await initBudgetSelector();

    // Clear selection if we deleted the selected one
    if (selectedBudgetId === budgetId) {
      selectedBudgetId = null;
      const sel = document.getElementById('budgetSelector');
      if (sel) sel.value = '';
    }
  } catch (error) {
    alert('Failed to delete budget: ' + error.message);
  }
}

/**
 * Save current budget to server
 * CRITICAL FIX: Use buildCSVString() so the saved CSV contains ALL form fields.
 */
export async function handleSaveBudgetToServer() {
  const showTitle = document.getElementById('showTitle')?.value?.trim() || '';
  const showDate = document.getElementById('showDate')?.value?.trim() || '';

  if (!showTitle) {
    alert('Please enter a show title before saving');
    return;
  }

  try {
    // Ensure totals/text are up-to-date before saving
    if (typeof window.updateBudget === 'function') window.updateBudget();

    const csvData = buildCSVString();

    const result = await saveBudgetToServer(csvData, {
      name: showTitle,
      date: showDate || new Date().toISOString().split('T')[0]
    });

    console.log('Save result:', result);

    // Refresh selector and select the newly saved budget
    if (document.getElementById('budgetSelector')) {
      await initBudgetSelector();
      const sel = document.getElementById('budgetSelector');
      if (sel && result?.id) {
        sel.value = String(result.id);
        selectedBudgetId = String(result.id);
      }
    }

    alert('Budget saved to server successfully!');
  } catch (error) {
    alert('Failed to save budget: ' + error.message);
    console.error('Save error:', error);
  }
}

/**
 * Modal handlers (if you use the modal UI)
 */
export function openBudgetLoadModal() {
  const modal = document.getElementById('budgetLoadModal');
  if (modal) {
    modal.style.display = 'flex';
    loadModalBudgetList();
  }
}

export function closeBudgetLoadModal() {
  const modal = document.getElementById('budgetLoadModal');
  if (modal) modal.style.display = 'none';
}

async function loadModalBudgetList() {
  try {
    const budgets = await fetchBudgetList();
    displayModalBudgetList(budgets);
  } catch (error) {
    console.error('Error loading modal budget list:', error);
  }
}

function displayModalBudgetList(budgets) {
  const listContainer = document.getElementById('modalBudgetList');
  if (!listContainer) return;

  if (budgets.length === 0) {
    listContainer.innerHTML = `
      <p>No saved budgets found</p>
    `;
    return;
  }

  listContainer.innerHTML = budgets.map(budget => `
    <div class="modal-budget-row" onclick="loadBudgetAndCloseModal('${budget.id || budget._id}')">
      <div><strong>${budget.name}</strong></div>
      <div>${budget.date}</div>
    </div>
  `).join('');
}

export async function loadBudgetAndCloseModal(budgetId) {
  await loadBudgetById(budgetId);
  closeBudgetLoadModal();
}

export async function handleModalSearch() {
  const searchTerm = document.getElementById('modalSearchName')?.value || '';
  try {
    const results = await searchBudgets({ name: searchTerm });
    displayModalBudgetList(results);
  } catch (error) {
    alert('Search failed: ' + error.message);
  }
}

// Make functions globally available for inline HTML handlers
window.handleBudgetSelection = handleBudgetSelection;
window.handleLoadSelectedBudget = handleLoadSelectedBudget;
window.handleSearchBudgets = handleSearchBudgets;
window.loadBudgetById = loadBudgetById;
window.deleteBudgetById = deleteBudgetById;
window.handleSaveBudgetToServer = handleSaveBudgetToServer;
window.openBudgetLoadModal = openBudgetLoadModal;
window.closeBudgetLoadModal = closeBudgetLoadModal;
window.loadBudgetAndCloseModal = loadBudgetAndCloseModal;
window.handleModalSearch = handleModalSearch;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('🧩 UI Handlers Initializing...');
  if (document.getElementById('budgetSelector')) {
    initBudgetSelector().catch((e) => console.error('initBudgetSelector failed:', e));
  }
  console.log('✅ UI Handlers Ready!');
});
