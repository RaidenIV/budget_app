// client/js/modules/serverLoad.js - Load/Save CSV budgets from server
import { loadCSV } from './csv.js';

/**
 * Resolve backend base URL:
 * - If on Railway/production: use current origin (Railway serves frontend + backend together)
 * - If on localhost with different port: use localhost:3000
 * - If opened via file://: use localhost:3000
 */
function resolveApiBase() {
  try {
    const { protocol, hostname, port, origin } = window.location;

    // If opened as file:// protocol
    if (protocol === 'file:' || origin === 'null') {
      return 'http://localhost:3000';
    }

    // If on Railway (production domain)
    // Railway domains end in .railway.app, .up.railway.app, or custom domains
    if (hostname.includes('railway.app') || hostname.includes('.app') || 
        (!hostname.includes('localhost') && !hostname.includes('127.0.0.1'))) {
      // On Railway, frontend and backend are served together, use same origin
      console.log('🚂 Detected Railway deployment, using origin:', origin);
      return origin;
    }

    // If on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // If already on port 3000, use origin
      if (port === '3000' || port === '') {
        console.log('🏠 Using localhost origin:', origin);
        return origin;
      }
      // If on different port (e.g., live server on 5500), connect to backend on 3000
      console.log('🏠 Using localhost:3000 for API');
      return 'http://localhost:3000';
    }

    // Default: use current origin
    console.log('🌐 Using current origin:', origin);
    return origin;
    
  } catch (err) {
    console.error('Error resolving API base:', err);
    return 'http://localhost:3000';
  }
}

const API_BASE = resolveApiBase();
console.log('📡 API Base URL:', API_BASE);

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
    console.log('💾 Saving to:', API_BASE);
    
    // IMPORTANT: NO budgetId here – server will compute id from name+date.
    const payload = {
      csv: csvData,
      name: metadata.name || 'Untitled Budget',
      date: metadata.date || new Date().toISOString().split('T')[0]
    };

    // Allow extra metadata fields, but do not let them override csv/name/date
    const { csv, name, date, budgetId, ...rest } = metadata;
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
    console.log('✅ Save successful:', result);
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
  return await response.json();
}
