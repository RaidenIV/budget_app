// serverLoad.js - Load CSV budgets from server

import { loadCSV } from './csv.js';

/**
 * Fetch and load a CSV budget from the server
 * @param {string} budgetId - The ID or filename of the budget to load
 * @param {object} regenerators - Object with regenerator functions
 * @param {function} updateBudgetFn - Function to update the budget display
 * @returns {Promise<void>}
 */
export async function loadBudgetFromServer(budgetId, regenerators, updateBudgetFn) {
  const statusEl = document.getElementById('loadStatus');
  
  try {
    if (statusEl) statusEl.textContent = 'Loading budget...';
    
    // Replace with your actual API endpoint
    const response = await fetch(`/api/budgets/${budgetId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to load budget: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    
    // Use existing loadCSV function to parse and populate the form
    loadCSV(csvText, regenerators, updateBudgetFn);
    
    if (statusEl) {
      statusEl.textContent = 'Budget loaded successfully!';
      setTimeout(() => statusEl.textContent = '', 3000);
    }
    
  } catch (error) {
    console.error('Error loading budget:', error);
    if (statusEl) statusEl.textContent = `Error: ${error.message}`;
    alert(`Failed to load budget: ${error.message}`);
  }
}

/**
 * Fetch list of available budgets from server
 * @returns {Promise<Array>} Array of budget objects
 */
export async function fetchBudgetList() {
  try {
    const response = await fetch('/api/budgets');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch budget list: ${response.statusText}`);
    }
    
    return await response.json();
    // Expected format: [{ id: '123', name: 'Show Name', date: '2024-01-15' }, ...]
    
  } catch (error) {
    console.error('Error fetching budget list:', error);
    throw error;
  }
}

/**
 * Populate a dropdown/select element with available budgets
 * @param {string} selectId - ID of the select element
 */
export async function populateBudgetSelector(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  try {
    const budgets = await fetchBudgetList();
    
    // Clear existing options except the first (placeholder)
    while (select.options.length > 1) {
      select.remove(1);
    }
    
    // Add budget options
    budgets.forEach(budget => {
      const option = document.createElement('option');
      option.value = budget.id;
      option.textContent = `${budget.name} - ${budget.date}`;
      select.appendChild(option);
    });
    
  } catch (error) {
    console.error('Error populating budget selector:', error);
    alert('Failed to load budget list from server');
  }
}

/**
 * Save current budget to server
 * @param {string} csvData - CSV string to save
 * @param {object} metadata - Additional metadata (name, date, etc.)
 * @returns {Promise<object>} Server response with saved budget info
 */
export async function saveBudgetToServer(csvData, metadata = {}) {
  try {
    const response = await fetch('/api/budgets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        csv: csvData,
        name: metadata.name || 'Untitled Budget',
        date: metadata.date || new Date().toISOString().split('T')[0],
        ...metadata
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to save budget: ${response.statusText}`);
    }
    
    return await response.json();
    // Expected format: { id: '123', message: 'Budget saved successfully' }
    
  } catch (error) {
    console.error('Error saving budget to server:', error);
    throw error;
  }
}

/**
 * Search budgets by criteria
 * @param {object} criteria - Search criteria (name, dateFrom, dateTo, etc.)
 * @returns {Promise<Array>} Filtered budget list
 */
export async function searchBudgets(criteria) {
  try {
    const params = new URLSearchParams(criteria);
    const response = await fetch(`/api/budgets/search?${params}`);
    
    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error searching budgets:', error);
    throw error;
  }
}

/**
 * Delete a budget from the server
 * @param {string} budgetId - ID of the budget to delete
 * @returns {Promise<void>}
 */
export async function deleteBudgetFromServer(budgetId) {
  try {
    const response = await fetch(`/api/budgets/${budgetId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete budget: ${response.statusText}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error deleting budget:', error);
    throw error;
  }
}
