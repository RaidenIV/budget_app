// client/js/modules/serverLoad.js - Load/Save budgets from server

import { loadCSV } from './csv.js';

/**
 * API base:
 * Works for LAN/mobile and when served by Express.
 */
const API_BASE = window.location.origin;

/**
 * Persistent "current budget" tracking.
 * This is what guarantees "one file per budget".
 */
const LS_ACTIVE_ID = 'xmg_budget_active_id';
const LS_ACTIVE_KEY = 'xmg_budget_active_key'; // name|date at last save/load

function makeKey(name, date) {
  const n = String(name || '').trim();
  const d = String(date || '').trim();
  return `${n}||${d}`;
}

function getActiveBudgetId() {
  try {
    return localStorage.getItem(LS_ACTIVE_ID) || '';
  } catch {
    return '';
  }
}

function setActiveBudget(id, name = '', date = '') {
  try {
    if (id) localStorage.setItem(LS_ACTIVE_ID, id);
    else localStorage.removeItem(LS_ACTIVE_ID);

    const key = makeKey(name, date);
    if (key !== '||') localStorage.setItem(LS_ACTIVE_KEY, key);
    else localStorage.removeItem(LS_ACTIVE_KEY);
  } catch {
    // ignore storage errors
  }
}

function clearActiveBudget() {
  setActiveBudget('', '', '');
}

/**
 * SAFETY:
 * If the user changes name/date from what we last associated with the active ID,
 * treat it as a new budget to avoid overwriting the wrong one.
 */
function maybeClearActiveIfKeyChanged(name, date) {
  try {
    const activeId = getActiveBudgetId();
    if (!activeId) return;

    const lastKey = localStorage.getItem(LS_ACTIVE_KEY) || '';
    const newKey = makeKey(name, date);

    // If we have a lastKey and the user changed it, clear the active ID.
    if (lastKey && newKey && lastKey !== newKey) {
      clearActiveBudget();
    }
  } catch {
    // ignore
  }
}

export async function loadBudgetFromServer(budgetId, regenerators, updateBudgetFn) {
  const statusEl = document.getElementById('loadStatus');

  try {
    if (statusEl) statusEl.textContent = 'Loading budget...';

    const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load budget: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    loadCSV(csvText, regenerators, updateBudgetFn);

    // Mark this budget as the active one (so future saves overwrite it)
    // We may not know name/date at this exact moment (depends on your CSV loader),
    // but we can at least persist the ID. The save flow will update name/date key.
    setActiveBudget(budgetId);

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
    const name = metadata.name || 'Untitled Budget';
    const date = metadata.date || new Date().toISOString().split('T')[0];

    // Safety: if user changed name/date, stop using previous active ID
    maybeClearActiveIfKeyChanged(name, date);

    const activeId = getActiveBudgetId();

    const payload = {
      csv: csvData,
      name,
      date,
      // Core change: send budgetId when available so server overwrites same files
      ...(activeId ? { budgetId: activeId } : {})
    };

    // Include other metadata fields safely
    const { csv, budgetId, ...rest } = metadata;
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

    const result = await response.json();

    // Persist the returned ID as the active budget for future overwrites
    if (result && result.id) {
      setActiveBudget(result.id, name, date);
    }

    return result;
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
  const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`, { method: 'DELETE' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.error('deleteBudgetFromServer failed:', response.status, response.statusText, text);
    throw new Error(`Failed to delete budget: ${response.status} ${response.statusText}`);
  }

  // If deleting active budget, clear it
  const activeId = getActiveBudgetId();
  if (activeId && activeId === budgetId) {
    clearActiveBudget();
  }

  return await response.json();
}

/**
 * Optional exports you can wire to a "New Budget" / "Clear" button.
 * Not required for correctness, but useful for UX.
 */
export function clearActiveBudgetId() {
  clearActiveBudget();
}
