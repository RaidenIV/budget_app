// repeaters.js - Dynamic form field generators

import { state } from './state.js';
import { storeValues, restoreValues } from './utils.js';

export function regenerateHeadliners(updateBudgetFn) {
  const container = document.getElementById("headlinerInputs");
  const numHeadlinersEl = document.getElementById("numHeadliners");
  const oldCount = parseInt(numHeadlinersEl.dataset.old || 1);
  const newCount = parseInt(numHeadlinersEl.value);

  storeValues(state.headliners, "headliner", oldCount, ["name", "fee", "hotel", "rider"]);
  container.innerHTML = "";

  for (let i = 1; i <= newCount; i++) {
    const card = document.createElement("div");
    card.className = "headliner-card";
    card.innerHTML = `
      <h3>Headliner ${i}</h3>
      <label>Name</label>
      <input id="headliner_name_${i}" type="text" oninput="updateBudget()"/>
      <label>Fee</label>
      <input id="headliner_fee_${i}" type="number" step="0.01" oninput="updateBudget()"/>
      <label>Hotel</label>
      <input id="headliner_hotel_${i}" type="number" step="0.01" oninput="updateBudget()"/>
      <label>Rider</label>
      <input id="headliner_rider_${i}" type="number" step="0.01" oninput="updateBudget()"/>
    `;
    container.appendChild(card);
  }

  restoreValues(state.headliners, "headliner", ["name", "fee", "hotel", "rider"]);
  document.getElementById("numHeadliners").dataset.old = newCount;
  
  if (updateBudgetFn) updateBudgetFn();
}

export function regenerateLocalDJs(updateBudgetFn) {
  const container = document.getElementById("localDJInputs");
  const numLocalDJsEl = document.getElementById("numLocalDJs");
  const old = parseInt(numLocalDJsEl.dataset.old || 0);
  const n = parseInt(numLocalDJsEl.value);

  storeValues(state.localDJs, "localDJ", old, ["name", "fee"]);
  container.innerHTML = "";

  for (let i = 1; i <= n; i++) {
    container.innerHTML += `
      <label>Local DJ Name #${i}</label>
      <input id="localDJ_name_${i}" type="text" oninput="updateBudget()">
      <label>Local DJ Fee #${i}</label>
      <input id="localDJ_fee_${i}" type="number" step="0.01" oninput="updateBudget()">
    `;
  }

  restoreValues(state.localDJs, "localDJ", ["name", "fee"]);
  document.getElementById("numLocalDJs").dataset.old = n;
  
  if (updateBudgetFn) updateBudgetFn();
}

export function regenerateCDJs(updateBudgetFn) {
  const container = document.getElementById("cdjInputs");
  const numCDJsEl = document.getElementById("numCDJs");
  const old = parseInt(numCDJsEl.dataset.old || 0);
  const n = parseInt(numCDJsEl.value);

  storeValues(state.cdjs, "cdj", old, ["fee"]);
  container.innerHTML = "";

  for (let i = 1; i <= n; i++) {
    container.innerHTML += `
      <label>CDJ Fee #${i}</label>
      <input id="cdj_fee_${i}" type="number" step="0.01" oninput="updateBudget()">
    `;
  }

  restoreValues(state.cdjs, "cdj", ["fee"]);
  document.getElementById("numCDJs").dataset.old = n;
  
  if (updateBudgetFn) updateBudgetFn();
}

export function regenerateShowRunners(updateBudgetFn) {
  const container = document.getElementById("showRunnerInputs");
  const numShowRunnersEl = document.getElementById("numShowRunners");
  const old = parseInt(numShowRunnersEl.dataset.old || 0);
  const n = parseInt(numShowRunnersEl.value);

  storeValues(state.showRunners, "showRunner", old, ["fee"]);
  container.innerHTML = "";

  for (let i = 1; i <= n; i++) {
    container.innerHTML += `
      <label>Show Runner Fee #${i}</label>
      <input id="showRunner_fee_${i}" type="number" step="0.01" oninput="updateBudget()">
    `;
  }

  restoreValues(state.showRunners, "showRunner", ["fee"]);
  document.getElementById("numShowRunners").dataset.old = n;
  
  if (updateBudgetFn) updateBudgetFn();
}

export function regenerateVendors(updateBudgetFn) {
  const container = document.getElementById("merchVendorInputs");
  const numMerchVendorsEl = document.getElementById("numMerchVendors");
  const old = parseInt(numMerchVendorsEl.dataset.old || 0);
  const n = parseInt(numMerchVendorsEl.value);

  storeValues(state.vendors, "merchVendor", old, ["name", "fee"]);
  container.innerHTML = "";

  for (let i = 1; i <= n; i++) {
    container.innerHTML += `
      <label>Vendor Name #${i}</label>
      <input id="merchVendor_name_${i}" type="text" oninput="updateBudget()">
      <label>Vendor Fee #${i}</label>
      <input id="merchVendor_fee_${i}" type="number" step="0.01" oninput="updateBudget()">
    `;
  }

  restoreValues(state.vendors, "merchVendor", ["name", "fee"]);
  document.getElementById("numMerchVendors").dataset.old = n;
  
  if (updateBudgetFn) updateBudgetFn();
}

const otherCategoryState = {};

export function regenerateOtherCategories(updateBudgetFn) {
  const numOtherCategoriesEl = document.getElementById("numOtherCategories");
  const allOtherCategoriesEl = document.getElementById("allOtherCategories");
  const newCount = parseInt(numOtherCategoriesEl.value) || 0;

  for (let c = 1; c <= Object.keys(otherCategoryState).length; c++) {
    const nameEl = document.getElementById(`otherCategoryName_${c}`);
    const countEl = document.getElementById(`otherCategoryCount_${c}`);

    if (!otherCategoryState[c]) otherCategoryState[c] = { items: {} };

    otherCategoryState[c].name = nameEl ? nameEl.value : '';
    otherCategoryState[c].count = countEl ? parseInt(countEl.value) || 0 : 0;

    for (let i = 1; i <= otherCategoryState[c].count; i++) {
      const name = document.getElementById(`otherCategory_${c}_itemName_${i}`)?.value || '';
      const fee = document.getElementById(`otherCategory_${c}_itemFee_${i}`)?.value || '';
      otherCategoryState[c].items[i] = { name, fee };
    }
  }

  allOtherCategoriesEl.innerHTML = '';

  for (let c = 1; c <= newCount; c++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'other-category-wrapper';

    wrapper.innerHTML = `
      <label>Category ${c} Name:</label>
      <input id="otherCategoryName_${c}" type="text" oninput="updateBudget()">
      <div class="quantity-row">
        <label>Number of Items:</label>
        <input id="otherCategoryCount_${c}" type="number" min="0" max="20" value="0"
               onchange="regenerateOtherItems(${c})">
      </div>
      <div id="otherCategoryItems_${c}"></div>
    `;

    allOtherCategoriesEl.appendChild(wrapper);

    if (otherCategoryState[c]) {
      document.getElementById(`otherCategoryName_${c}`).value = otherCategoryState[c].name || '';
      document.getElementById(`otherCategoryCount_${c}`).value = otherCategoryState[c].count || 0;
      regenerateOtherItems(c);
    }
  }

  if (updateBudgetFn) updateBudgetFn();
}

export function regenerateOtherItems(categoryId, updateBudgetFn) {
  const count = parseInt(document.getElementById(`otherCategoryCount_${categoryId}`).value) || 0;
  const container = document.getElementById(`otherCategoryItems_${categoryId}`);

  if (!otherCategoryState[categoryId]) {
    otherCategoryState[categoryId] = { items: {} };
  }

  container.innerHTML = '';

  for (let i = 1; i <= count; i++) {
    const row = document.createElement('div');
    row.className = 'dynamic-input-group';

    row.innerHTML = `
      <label>Item ${i} Name:</label>
      <input id="otherCategory_${categoryId}_itemName_${i}" type="text" oninput="updateBudget()">
      <label>Item ${i} Fee:</label>
      <input id="otherCategory_${categoryId}_itemFee_${i}" type="number" step="0.01" oninput="updateBudget()">
    `;

    container.appendChild(row);

    if (otherCategoryState[categoryId].items[i]) {
      document.getElementById(`otherCategory_${categoryId}_itemName_${i}`).value =
        otherCategoryState[categoryId].items[i].name || '';
      document.getElementById(`otherCategory_${categoryId}_itemFee_${i}`).value =
        otherCategoryState[categoryId].items[i].fee || '';
    }
  }

  if (updateBudgetFn) updateBudgetFn();
}