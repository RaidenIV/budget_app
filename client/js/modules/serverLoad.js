// serverLoad.js - Load CSV budgets from server

import { loadCSV } from './csv.js';

// Automatically use the deployed URL or local development URL
// Railway will automatically provide the public URL when deployed
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'  // Local development
  : window.location.origin;   // Use same origin as the frontend when deployed

console.log('Using API endpoint:', API_BASE);

export async function loadBudgetFromServer(budgetId, regenerators, updateBudgetFn) {
  const statusEl = document.getElementById('loadStatus');
  
  try {
    if (statusEl) statusEl.textContent = "Loading budget...";
    
    console.log('Loading budget with ID:', budgetId);
    const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // DETAILED DEBUG LOGGING
    console.log('=== Server Response ===');
    console.log('CSV Length:', csvText.length);
    console.log('First 200 chars:', csvText.substring(0, 200));
    console.log('Has newlines:', csvText.includes('\n'));
    console.log('Line count:', csvText.split('\n').length);
    console.log('======================');
    
    // Check if it's actually CSV
    if (!csvText || csvText.trim().length === 0) {
      throw new Error('Received empty data from server');
    }
    
    // Use the existing loadCSV function to parse and load the data
    console.log('Calling loadCSV with data...');
    await loadCSV(csvText, regenerators, updateBudgetFn);
    
    if (statusEl) statusEl.textContent = "Budget loaded successfully!";
    return true;
    
  } catch (error) {
    console.error('Error loading budget:', error);
    if (statusEl) statusEl.textContent = `Error: ${error.message}`;
    alert(`Failed to load budget: ${error.message}`);
    throw error;
  }
}

export async function fetchBudgetList() {
  try {
    console.log('Fetching budget list from:', `${API_BASE}/api/budgets`);
    const response = await fetch(`${API_BASE}/api/budgets`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const budgets = await response.json();
    console.log('Received budget list:', budgets);
    return budgets;
    
  } catch (error) {
    console.error('Error fetching budget list:', error);
    throw error;
  }
}

export async function populateBudgetSelector(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  try {
    const budgets = await fetchBudgetList();

    // Parse createdAt safely (fallbacks included)
    const getTs = (b) => {
      const raw = b?.createdAt ?? b?.updatedAt ?? b?.created_at ?? b?.timestamp;
      const ts = raw ? Date.parse(raw) : NaN;
      return Number.isFinite(ts) ? ts : 0;
    };

    // Sort newest first
    budgets.sort((a, b) => getTs(b) - getTs(a));

    // Dedupe: keep only the latest budget for each (name + show date) pair.
    // Since budgets is sorted newest-first, the first occurrence of each key is the latest.
    const norm = (s) => String(s ?? '').trim().toLowerCase();
    const seen = new Set();
    const latestBudgets = budgets.filter((b) => {
      const nameKey = norm(b?.name ?? 'Untitled Budget');
      const dateKey = norm(b?.date ?? '');
      const key = `${nameKey}__${dateKey}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Keep the placeholder option at index 0; clear everything else
    select.length = 1;

    latestBudgets.forEach((budget) => {
      const id = budget?.id ?? budget?._id ?? budget?.budgetId;
      if (!id) return; // cannot load without a stable id

      const option = document.createElement("option");
      option.value = id;

      const name = budget?.name ?? "Untitled Budget";
      const date = budget?.date ?? "";

      // Format timestamp as human-readable (use parsed time)
      const ts = getTs(budget);
      const timeStr = ts
        ? new Date(ts).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "Unknown time";

      option.textContent = date
        ? `${name} - ${date} (Saved: ${timeStr})`
        : `${name} (Saved: ${timeStr})`;

      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error populating budget selector:", error);
    alert("Failed to load budget list from server");
  }
}


export async function saveBudgetToServer(csvData, metadata = {}) {
  try {
    const response = await fetch(`${API_BASE}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        csvData,
        metadata
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Budget saved:', result);
    return result;
    
  } catch (error) {
    console.error('Error saving budget:', error);
    alert(`Failed to save budget: ${error.message}`);
    throw error;
  }
}

export async function deleteBudgetFromServer(budgetId) {
  try {
    const response = await fetch(`${API_BASE}/api/budgets/${budgetId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Budget deleted:', result);
    return result;
    
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
}
