// budgetCalculator.js - Core budget calculation logic

import { getNum } from './utils.js';

export function calculateBudget() {
  const title = document.getElementById("showTitle")?.value || "UNTITLED EVENT";
  const titleUpper = title.toUpperCase();

  // Update title displays
  const mainTitleEl = document.getElementById("showTitleDisplay");
  if (mainTitleEl) mainTitleEl.textContent = titleUpper;

  const chartsTitleEl = document.getElementById("chartsShowTitle");
  if (chartsTitleEl) chartsTitleEl.textContent = titleUpper;

  // Calculate headliners
  let headlinerTotal = 0;
  const numHeadliners = +document.getElementById("numHeadliners")?.value || 0;
  for (let i = 1; i <= numHeadliners; i++) {
    headlinerTotal +=
      (+document.getElementById(`headliner_fee_${i}`)?.value || 0) +
      (+document.getElementById(`headliner_hotel_${i}`)?.value || 0) +
      (+document.getElementById(`headliner_rider_${i}`)?.value || 0);
  }

  // Calculate support
  const directSupport = (+document.getElementById("directSupport")?.value || 0);
  let localDJTotal = 0;
  const numLocalDJs = +document.getElementById("numLocalDJs")?.value || 0;
  for (let i = 1; i <= numLocalDJs; i++) {
    localDJTotal += (+document.getElementById(`localDJ_fee_${i}`)?.value || 0);
  }

  // Calculate production
  const productionTotal =
    getNum("vjFee") +
    getNum("venue") +
    getNum("ledWall") +
    getNum("lights") +
    getNum("lasers");

  // Calculate gear
  let cdjTotal = 0;
  const numCDJs = +document.getElementById("numCDJs")?.value || 0;
  for (let i = 1; i <= numCDJs; i++) {
    cdjTotal += (+document.getElementById(`cdj_fee_${i}`)?.value || 0);
  }
  const gearTotal = cdjTotal + getNum("sound") + getNum("mixer") + getNum("table");

  // Calculate marketing
  const marketingTotal =
    getNum("facebookAdsXodia") +
    getNum("facebookAdsSpaceCampHQ") +
    getNum("instagramAdsXodia") +
    getNum("instagramAdsSpaceCampHQ") +
    getNum("physicalFlyers") +
    getNum("eventbriteAds");

  // Calculate staff
  let showRunnerTotal = 0;
  const numShowRunners = +document.getElementById("numShowRunners")?.value || 0;
  for (let i = 1; i <= numShowRunners; i++) {
    showRunnerTotal += (+document.getElementById(`showRunner_fee_${i}`)?.value || 0);
  }
  const staffTotal =
    getNum("doorStaff") +
    getNum("merchTable") +
    getNum("transportation") +
    showRunnerTotal;

  // Calculate other categories
  let otherTotal = 0;
  const numOtherCategories = +document.getElementById("numOtherCategories")?.value || 0;
  for (let c = 1; c <= numOtherCategories; c++) {
    const count = +document.getElementById(`otherCategoryCount_${c}`)?.value || 0;
    for (let i = 1; i <= count; i++) {
      otherTotal += +document.getElementById(`otherCategory_${c}_itemFee_${i}`)?.value || 0;
    }
  }

  const totalExpenses =
    headlinerTotal +
    directSupport +
    localDJTotal +
    productionTotal +
    gearTotal +
    marketingTotal +
    staffTotal +
    otherTotal;

  // Calculate revenue
  const eventbriteSales = getNum("eventbriteSales");
  const djPresales = getNum("djPresales");
  const promoTeam = getNum("promoTeam");
  const doorSales = getNum("doorSales");
  const merchSold = getNum("merchSold");

  let merchVendorTotal = 0;
  document.querySelectorAll('input[id^="merchVendor_fee_"]').forEach(el => {
    merchVendorTotal += parseFloat(el.value) || 0;
  });

  const totalRevenue =
    eventbriteSales +
    djPresales +
    promoTeam +
    doorSales +
    merchSold +
    merchVendorTotal;

  const netProfit = totalRevenue - totalExpenses;

  return {
    expenses: {
      Headliners: headlinerTotal,
      Support: directSupport + localDJTotal,
      Production: productionTotal,
      Gear: gearTotal,
      Marketing: marketingTotal,
      Staff: staffTotal,
      Other: otherTotal,
      total: totalExpenses
    },
    revenue: {
      Eventbrite: eventbriteSales,
      Presales: djPresales,
      Promo: promoTeam,
      Door: doorSales,
      "Merch Sold": merchSold,
      "Merch Vendors": merchVendorTotal,
      total: totalRevenue
    },
    netProfit
  };
}

export function updateSummaryDisplay(data) {
  const totalExpensesEl = document.getElementById("totalExpenses");
  if (totalExpensesEl) totalExpensesEl.textContent = data.expenses.total.toFixed(2);

  const totalRevenueEl = document.getElementById("totalRevenue");
  if (totalRevenueEl) totalRevenueEl.textContent = data.revenue.total.toFixed(2);

  const profitLine = document.getElementById("profitLine");
  if (profitLine) {
    let netProfitEl = document.getElementById("netProfit");

    if (!netProfitEl) {
      profitLine.innerHTML = `Net Profit: <span id="netProfit"></span>`;
      netProfitEl = document.getElementById("netProfit");
    }

    profitLine.className = data.netProfit >= 0 ? "profit" : "loss";

    if (netProfitEl) {
      netProfitEl.textContent = `${data.netProfit >= 0 ? "+" : "-"}$${Math.abs(data.netProfit).toFixed(2)}`;
      netProfitEl.style.color = data.netProfit < 0 ? "red" : "";
    }
  }
}