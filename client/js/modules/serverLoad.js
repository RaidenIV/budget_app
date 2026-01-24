// client/js/modules/serverLoad.js - Load/Save CSV budgets from server

import { loadCSV } from './csv.js';

/**
 * API base resolution:
 * - If the frontend is served by Express (recommended): use same-origin
 * - If frontend is opened via file:// or served on a different port (8000):
 *   call the backend on port 3000 on the same host (or localhost)
 */
function resolveApiBase() {
  try {
    const { protocol, hostname, port, origin } = window.location;

    // If opened as a local file, origin is "null" and fetch will fail.
    if (protocol === 'file:' || origin === 'null') {
      return 'http://localhost:3000';
    }

    // If you're serving the frontend separately (e.g., :8000), assume backend is :3000.
    // Works for localhost and LAN hosts (192.168.x.x) alike.
    if (port && port !== '3000') {
      return `http://${hostname}:3000`;
    }

    // Otherwise, same-origin (works when Express serves /client)
    return origin;
  } catch {
    return 'http://localhost:3000';
  }
}

const API_BASE = resolveApiBase();

export async function loadBudgetFromServer(budgetId, regenerators, updateBudgetFn) {
  const statusEl = document.getElementById('loadStatus');

  try {
    if (statusEl) statusEl.textContent = 'Loading budget...';

    const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`, { cache: 'no-store' });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('loadBudgetFromServer failed:', response.status, response.statusText, text);
      throw new Error(`Failed to load budget: ${response.status} ${response.statusText}`);
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
  const response = await fetch(`${API_BASE}/api/budgets`, { cache: 'no-store' });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('fetchBudgetList failed:', response.status, response.statusText, text);
    throw new Error(`Failed to fetch budget list: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

export async function populateBudgetSelector(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const budgets = await fetchBudgetList();

    // Sort newest first (use updatedAt if present)
    budgets.sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });

    while (select.options.length > 1) select.remove(1);

    budgets.forEach(budget => {
      const option = document.createElement('option');
      option.value = budget.id;

      const savedDate = new Date(budget.updatedAt || budget.createdAt || Date.now());
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

    // Spread other metadata safely without overriding the main fields
    const { csv, name, date, ...rest } = metadata;
    Object.assign(payload, rest);

    const response = await fetch(`${API_BASE}/api/budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('saveBudgetToServer failed:', response.status, response.statusText, text);
      throw new Error(`Failed to save budget: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving budget to server:', error);
    throw error;
  }
}

export async function searchBudgets(criteria) {
  const params = new URLSearchParams(criteria);
  const response = await fetch(`${API_BASE}/api/budgets/search?${params}`, { cache: 'no-store' });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('searchBudgets failed:', response.status, response.statusText, text);
    throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

export async function deleteBudgetFromServer(budgetId) {
  const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('deleteBudgetFromServer failed:', response.status, response.statusText, text);
    throw new Error(`Failed to delete budget: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}
