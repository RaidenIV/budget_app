// uiHandlers.js - Additional UI handlers for server budget operations
// NOTE: handleBudgetSelection is now defined in main.js and auto-loads on selection

import { buildCSVString } from './modules/csv.js';
import { saveBudgetToServer } from './modules/serverLoad.js';
import { populateBudgetSelector } from './modules/serverLoad.js';

/**
 * Save current budget to server
 * Called by the "Save" button in the UI
 */
export async function handleSaveBudgetToServer() {
  const showTitle = document.getElementById('showTitle')?.value || '';
  const showDate = document.getElementById('showDate')?.value || '';

  // Validate
  if (!showTitle || showTitle.trim() === '' || showTitle === 'Untitled Event') {
    alert('Please enter a show title before saving');
    return;
  }

  try {
    // Use the SAME CSV generation as downloadCSV
    const csvData = buildCSVString();

    console.log('Saving budget to server...');
    console.log('Title:', showTitle);
    console.log('Date:', showDate);
    console.log('CSV length:', csvData.length);

    const result = await saveBudgetToServer(csvData, {
      name: showTitle,
      date: showDate
    });

    console.log('Save result:', result);
    alert('✅ Budget saved successfully!');

    // Refresh the budget selector to show the newly saved budget
    await populateBudgetSelector('budgetSelector');

  } catch (error) {
    console.error('Failed to save budget:', error);
    alert('❌ Failed to save budget: ' + error.message);
  }
}

// Expose to window for HTML onclick handlers
window.handleSaveBudgetToServer = handleSaveBudgetToServer;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  console.log('💾 Save/Load UI Handlers Ready!');
  console.log('✅ handleSaveBudgetToServer available:', typeof window.handleSaveBudgetToServer === 'function');
});
