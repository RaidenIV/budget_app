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
import { downloadCSV } from './modules/csv.js';

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
 */
export function handleBudgetSelection(budgetId) {
  selectedBudgetId = budgetId;
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
    headliners: () => window.regenerateHeadliners(),
    localDJs: () => window.regenerateLocalDJs(),
    cdjs: () => window.regenerateCDJs(),
    showRunners: () => window.regenerateShowRunners(),
    vendors: () => window.regenerateVendors(),
    otherCategories: () => window.regenerateOtherCategories(),
    otherItems: (c) => window.regenerateOtherItems(c)
  };

  await loadBudgetFromServer(selectedBudgetId, regenerators, updateBudget);
}

/**
 * Search budgets with filters
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
 * Display search results in the UI
 */
function displaySearchResults(budgets) {
  const resultsContainer = document.getElementById('budgetResults');
  if (!resultsContainer) return;

  if (budgets.length === 0) {
    resultsContainer.innerHTML = '<p>No budgets found</p>';
    return;
  }

  resultsContainer.innerHTML = budgets.map(budget => `
    <div class="budget-item">
      <div class="budget-item-name">${budget.name}</div>
      <div class="budget-item-date">${budget.date}</div>
      <div class="budget-item-actions">
        <button onclick="loadBudgetById('${budget.id}')">Load</button>
        <button onclick="deleteBudgetById('${budget.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

/**
 * Load a specific budget by ID
 */
export async function loadBudgetById(budgetId) {
  const regenerators = {
    headliners: () => window.regenerateHeadliners(),
    localDJs: () => window.regenerateLocalDJs(),
    cdjs: () => window.regenerateCDJs(),
    showRunners: () => window.regenerateShowRunners(),
    vendors: () => window.regenerateVendors(),
    otherCategories: () => window.regenerateOtherCategories(),
    otherItems: (c) => window.regenerateOtherItems(c)
  };

  await loadBudgetFromServer(budgetId, regenerators, updateBudget);
}

/**
 * Delete a budget with confirmation
 */
export async function deleteBudgetById(budgetId) {
  if (!confirm('Are you sure you want to delete this budget?')) {
    return;
  }

  try {
    await deleteBudgetFromServer(budgetId);
    alert('Budget deleted successfully');
    
    // Refresh the list
    if (document.getElementById('searchName')) {
      await handleSearchBudgets();
    }
    if (document.getElementById('budgetSelector')) {
      await initBudgetSelector();
    }
  } catch (error) {
    alert('Failed to delete budget: ' + error.message);
  }
}

/**
 * Generate CSV data from current form state
 */
function generateCSVData() {
  // Create a temporary container to capture CSV output
  const rows = [];
  
  const csvCell = (v) => {
    const s = (v == null) ? "" : String(v);
    if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const pushKV = (label, value) => rows.push(`${label},${csvCell(value)}`);
  
  // Add CSV version
  pushKV('XODIA_BUDGET_VERSION', '3');
  rows.push('');
  
  // Add basic info
  pushKV('Show Title', document.getElementById('showTitle')?.value || '');
  pushKV('Show Date', document.getElementById('showDate')?.value || '');
  rows.push('');
  
  // Add all form data (simplified version - you can expand this)
  // For now, just return the basic structure
  return rows.join('\n');
}

/**
 * Save current budget to server
 */
export async function handleSaveBudgetToServer() {
  const showTitle = document.getElementById('showTitle')?.value || 'Untitled Event';
  const showDate = document.getElementById('showDate')?.value || '';

  if (!showTitle || showTitle === 'Untitled Event') {
    alert('Please enter a show title before saving');
    return;
  }

  try {
    // Generate CSV data by triggering the download function and capturing it
    // This is a workaround - ideally we'd refactor downloadCSV to return the data
    const csvData = generateCSVData();

    const result = await saveBudgetToServer(csvData, {
      name: showTitle,
      date: showDate
    });

    alert('Budget saved to server successfully!');
    
    // Refresh selector if it exists
    if (document.getElementById('budgetSelector')) {
      await initBudgetSelector();
    }
  } catch (error) {
    alert('Failed to save budget: ' + error.message);
    console.error('Save error:', error);
  }
}

/**
 * Modal handlers
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
    listContainer.innerHTML = '<p>No saved budgets found</p>';
    return;
  }

  listContainer.innerHTML = budgets.map(budget => `
    <div class="budget-item" onclick="loadBudgetAndCloseModal('${budget.id}')">
      <div class="budget-item-name">${budget.name}</div>
      <div class="budget-item-date">${budget.date}</div>
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

// Make functions globally available for HTML onclick handlers
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
  // Initialize budget selector if it exists
  if (document.getElementById('budgetSelector')) {
    initBudgetSelector();
  }

});
