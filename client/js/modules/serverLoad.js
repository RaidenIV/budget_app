// client/serverLoad.js - Load/Save CSV budgets from server

import { loadCSV } from './csv.js';

// Your server base URL (change as needed)
// If you're running locally, use: 'http://localhost:3000'
// If on LAN: 'http://192.168.1.xxx:3000'
const API_BASE = 'http://localhost:3000';

export async function loadBudgetFromServer(budgetId, regenerators, updateBudgetFn) {
  const statusEl = document.getElementById('loadStatus');

  try {
    if (statusEl) statusEl.textContent = 'Loading budget...';

    const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`);

    if (!response.ok) {
      throw new Error(`Failed to load budget: ${response.statusText}`);
    }

    const csvText = await response.text();
    loadCSV(csvText, regenerators, updateBudgetFn);

    if (statusEl) {
      statusEl.textContent = 'Budget loaded successfully!';
      setTimeout(() => (statusEl.textContent = ''), 3000);
    }
  } catch (error) {
    console.error('Error loading budget:', error);
    if (statusEl) statusEl.textContent = `Error: ${error.message}`;
    alert(`Failed to load budget: ${error.message}`);
  }
}

export async function fetchBudgetList() {
  const response = await fetch(`${API_BASE}/api/budgets`);
  if (!response.ok) {
    throw new Error(`Failed to fetch budget list: ${response.statusText}`);
  }
  return await response.json();
}

export async function populateBudgetSelector(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const budgets = await fetchBudgetList();

    // Sort newest first (use updatedAt if present, else createdAt)
    budgets.sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });

    // Clear options except the first placeholder option
    while (select.options.length > 1) {
      select.remove(1);
    }

    budgets.forEach(budget => {
      const option = document.createElement('option');
      option.value = budget.id;

      const savedDate = new Date(budget.updatedAt || budget.createdAt);
      const timeStr = savedDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      option.textContent = `${budget.name} - ${budget.date} (Saved: ${timeStr})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error populating budget selector:', error);
    alert('Failed to load budget list from server');
  }
}

export async function saveBudgetToServer(csvData, metadata = {}) {
  try {
    const payload = {
      csv: csvData,
      name: metadata.name || 'Untitled Budget',
      date: metadata.date || new Date().toISOString().split('T')[0]
    };

    // FIX: spread metadata safely (and avoid overriding csv/name/date unintentionally)
    const { csv, name, date, ...rest } = metadata;
    Object.assign(payload, rest);

    const response = await fetch(`${API_BASE}/api/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Failed to save budget: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving budget to server:', error);
    throw error;
  }
}

export async function searchBudgets(criteria) {
  const params = new URLSearchParams(criteria);
  const response = await fetch(`${API_BASE}/api/budgets/search?${params}`);
  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }
  return await response.json();
}

export async function deleteBudgetFromServer(budgetId) {
  const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error(`Failed to delete budget: ${response.statusText}`);
  }
  return await response.json();
}
