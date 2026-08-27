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

  // Calculate support - UPDATED to include hotel and rider
  const directSupportFee = (+document.getElementById("directSupport")?.value || 0);
  const directSupportHotel = (+document.getElementById("directSupportHotel")?.value || 0);
  const directSupportRider = (+document.getElementById("directSupportRider")?.value || 0);
  const directSupportTotal = directSupportFee + directSupportHotel + directSupportRider;
  
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
    getNum("eventbriteAds") +
    getNum("collaboratorAmount");

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

  // Calculate media
  let mediaTotal = 0;
  const numMedia = +document.getElementById("numMedia")?.value || 0;
  for (let i = 1; i <= numMedia; i++) {
    mediaTotal +=
      (+document.getElementById(`media_photo_${i}`)?.value || 0) +
      (+document.getElementById(`media_video_${i}`)?.value || 0) +
      (+document.getElementById(`media_photoVideo_${i}`)?.value || 0);
  }

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
    directSupportTotal +
    localDJTotal +
    productionTotal +
    gearTotal +
    marketingTotal +
    staffTotal +
    mediaTotal +
    otherTotal;

  // Calculate revenue
  const eventbriteSales = getNum("eventbriteSales");
  const poshSales = getNum("poshSales");
  const raffleSales = getNum("raffleSales");
  const djPresales = getNum("djPresales");
  const promoTeam = getNum("promoTeam");
  const doorSales = getNum("doorSales");
  const merchSold = getNum("merchSold");
  const otherSales = getNum("otherSales");

  let merchVendorTotal = 0;
  document.querySelectorAll('input[id^="merchVendor_fee_"]').forEach(el => {
    merchVendorTotal += parseFloat(el.value) || 0;
  });

  const totalRevenue =
    eventbriteSales +
    poshSales +
    raffleSales +
    djPresales +
    promoTeam +
    doorSales +
    merchSold +
    merchVendorTotal +
    otherSales;

  const netProfit = totalRevenue - totalExpenses;

  const numTicketTypes = +document.getElementById("numTicketTypes")?.value || 0;
  let totalTicketsAvailable = 0;
  let totalTicketRevenue = 0;

  for (let i = 1; i <= numTicketTypes; i++) {
    const price = getNum(`ticketTypePrice_${i}`);
    const available = Math.max(0, Math.floor(getNum(`ticketTypeAvailable_${i}`)));

    if (price > 0 && available > 0) {
      totalTicketsAvailable += available;
      totalTicketRevenue += price * available;
    }
  }

  const averageTicketPrice = totalTicketsAvailable > 0
    ? totalTicketRevenue / totalTicketsAvailable
    : 0;

  const breakEvenTickets = averageTicketPrice > 0 && totalExpenses > 0
    ? Math.ceil(totalExpenses / averageTicketPrice)
    : 0;

  const canBreakEvenWithTicketInventory = totalExpenses <= totalTicketRevenue;
  const remainingTicketsAfterBreakEven = canBreakEvenWithTicketInventory && breakEvenTickets > 0
    ? Math.max(0, totalTicketsAvailable - breakEvenTickets)
    : 0;
  const ticketRevenueShortfall = canBreakEvenWithTicketInventory
    ? 0
    : Math.max(0, totalExpenses - totalTicketRevenue);

  return {
    expenses: {
      Headliners: headlinerTotal,
      Support: directSupportTotal + localDJTotal,
      Production: productionTotal,
      Gear: gearTotal,
      Marketing: marketingTotal,
      Staff: staffTotal,
      Media: mediaTotal,
      Other: otherTotal,
      total: totalExpenses
    },
    revenue: {
      Eventbrite: eventbriteSales,
      "Posh Sales": poshSales,
      "Raffle Sales": raffleSales,
      Presales: djPresales,
      "Promo Team Sales": promoTeam,
      Door: doorSales,
      "Merch Sold": merchSold,
      "Merch Vendors": merchVendorTotal,
      "Other Sales": otherSales,
      total: totalRevenue
    },
    ticketBreakEven: {
      averageTicketPrice,
      totalTicketsAvailable,
      totalTicketRevenue,
      ticketsNeeded: breakEvenTickets,
      remainingTicketsAfterBreakEven,
      canBreakEvenWithTicketInventory,
      ticketRevenueShortfall
    },
    netProfit
  };
}

export function updateSummaryDisplay(data) {
  const totalExpensesEl = document.getElementById("totalExpenses");
  if (totalExpensesEl) totalExpensesEl.textContent = data.expenses.total.toFixed(2);

  const totalRevenueEl = document.getElementById("totalRevenue");
  if (totalRevenueEl) totalRevenueEl.textContent = data.revenue.total.toFixed(2);

  const averageTicketPriceEl = document.getElementById("averageTicketPrice");
  if (averageTicketPriceEl) {
    averageTicketPriceEl.textContent = (data.ticketBreakEven?.averageTicketPrice || 0).toFixed(2);
  }

  const totalTicketsAvailableEl = document.getElementById("totalTicketsAvailable");
  if (totalTicketsAvailableEl) {
    totalTicketsAvailableEl.textContent = (data.ticketBreakEven?.totalTicketsAvailable || 0).toLocaleString("en-US");
  }

  const totalTicketRevenueEl = document.getElementById("totalTicketRevenue");
  if (totalTicketRevenueEl) {
    totalTicketRevenueEl.textContent = (data.ticketBreakEven?.totalTicketRevenue || 0).toFixed(2);
  }

  const breakEvenTicketsEl = document.getElementById("breakEvenTickets");
  if (breakEvenTicketsEl) {
    breakEvenTicketsEl.textContent = (data.ticketBreakEven?.ticketsNeeded || 0).toLocaleString("en-US");
  }

  const remainingTicketsEl = document.getElementById("remainingTicketsAfterBreakEven");
  if (remainingTicketsEl) {
    remainingTicketsEl.textContent = (data.ticketBreakEven?.remainingTicketsAfterBreakEven || 0).toLocaleString("en-US");
  }

  const breakEvenWarningEl = document.getElementById("breakEvenWarning");
  if (breakEvenWarningEl) {
    const ticketBreakEven = data.ticketBreakEven || {};
    const shouldShowWarning = ticketBreakEven.totalTicketsAvailable > 0 && !ticketBreakEven.canBreakEvenWithTicketInventory;
    breakEvenWarningEl.hidden = !shouldShowWarning;
    breakEvenWarningEl.textContent = shouldShowWarning
      ? `Break-even is not possible with the current ticket inventory. Maximum possible ticket revenue is $${(ticketBreakEven.totalTicketRevenue || 0).toFixed(2)}, leaving a $${(ticketBreakEven.ticketRevenueShortfall || 0).toFixed(2)} shortfall.`
      : "";
  }

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
      // Green when net profit is any positive number (e.g., $0.01 or $400.43)
      const isPositive = Number.isFinite(data.netProfit) && data.netProfit > 0;

      if (isPositive) {
        netProfitEl.style.color = "var(--success)";
      } else if (data.netProfit < 0) {
        netProfitEl.style.color = "red";
      } else {
        netProfitEl.style.color = "";
      }
}
  }
}
