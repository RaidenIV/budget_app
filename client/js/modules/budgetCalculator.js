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
  let totalTicketsSold = 0;
  let currentTicketRevenue = 0;
  let totalTicketsAvailable = 0;
  let totalTicketRevenue = 0;
  let remainingTicketInventory = 0;
  let remainingPossibleTicketRevenue = 0;
  const remainingTicketTypes = [];

  for (let i = 1; i <= numTicketTypes; i++) {
    const price = Math.max(0, getNum(`ticketTypePrice_${i}`));
    const sold = Math.max(0, Math.floor(getNum(`ticketTypeSold_${i}`)));
    const available = Math.max(0, Math.floor(getNum(`ticketTypeAvailable_${i}`)));
    const remainingAvailable = Math.max(0, available - sold);
    const ticketName = document.getElementById(`ticketTypeName_${i}`)?.value?.trim() || `Ticket Type ${i}`;

    if (price > 0) {
      if (sold > 0) {
        totalTicketsSold += sold;
        currentTicketRevenue += price * sold;
      }

      if (available > 0) {
        totalTicketsAvailable += available;
        totalTicketRevenue += price * available;
      }

      if (remainingAvailable > 0) {
        remainingTicketInventory += remainingAvailable;
        remainingPossibleTicketRevenue += price * remainingAvailable;
        remainingTicketTypes.push({ name: ticketName, price, remaining: remainingAvailable });
      }
    }
  }

  const currentRevenueIncludingTickets = totalRevenue + currentTicketRevenue;
  const soldWeightedAverageTicketPrice = totalTicketsSold > 0
    ? currentTicketRevenue / totalTicketsSold
    : 0;
  const remainingWeightedTicketValue = remainingTicketInventory > 0
    ? remainingPossibleTicketRevenue / remainingTicketInventory
    : 0;
  const availableWeightedAverageTicketPrice = totalTicketsAvailable > 0
    ? totalTicketRevenue / totalTicketsAvailable
    : 0;
  const remainingAmountToBreakEven = Math.max(0, totalExpenses - currentRevenueIncludingTickets);
  const ticketsStillNeeded = remainingWeightedTicketValue > 0 && remainingAmountToBreakEven > 0
    ? Math.ceil(remainingAmountToBreakEven / remainingWeightedTicketValue)
    : 0;

  const canBreakEvenWithTicketInventory = remainingAmountToBreakEven <= remainingPossibleTicketRevenue;
  const remainingTicketsAfterBreakEven = canBreakEvenWithTicketInventory && ticketsStillNeeded > 0
    ? Math.max(0, remainingTicketInventory - ticketsStillNeeded)
    : remainingAmountToBreakEven === 0
      ? remainingTicketInventory
      : 0;
  const ticketRevenueShortfall = canBreakEvenWithTicketInventory
    ? 0
    : Math.max(0, remainingAmountToBreakEven - remainingPossibleTicketRevenue);
  const projectedSoldOutProfit = currentRevenueIncludingTickets + remainingPossibleTicketRevenue - totalExpenses;
  const hasTicketData = totalTicketsSold > 0 || totalTicketsAvailable > 0 || currentTicketRevenue > 0 || remainingPossibleTicketRevenue > 0;

  function buildBestCaseTicketPath(amountNeeded, ticketTypes) {
    if (!hasTicketData) return "N/A";
    if (amountNeeded <= 0) return "Already at zero-profit point";

    let remainingAmount = amountNeeded;
    const pathParts = [];

    [...ticketTypes]
      .sort((a, b) => b.price - a.price)
      .forEach((ticketType) => {
        if (remainingAmount <= 0 || ticketType.price <= 0 || ticketType.remaining <= 0) return;

        const quantity = Math.min(ticketType.remaining, Math.ceil(remainingAmount / ticketType.price));
        if (quantity <= 0) return;

        pathParts.push(`${quantity.toLocaleString("en-US")} ${ticketType.name}`);
        remainingAmount -= quantity * ticketType.price;
      });

    if (remainingAmount > 0) return "Not enough remaining inventory";
    return pathParts.join(" + ") || "N/A";
  }

  const bestCaseTicketPath = buildBestCaseTicketPath(remainingAmountToBreakEven, remainingTicketTypes);
  const zeroProfitStatus = !hasTicketData
    ? "Add ticket info to calculate"
    : remainingAmountToBreakEven === 0
      ? "Zero-profit point reached"
      : canBreakEvenWithTicketInventory
        ? "Zero-profit is still possible"
        : "Zero-profit is not possible with remaining inventory";
  const zeroProfitStatusTone = !hasTicketData
    ? "neutral"
    : remainingAmountToBreakEven === 0 || canBreakEvenWithTicketInventory
      ? "positive"
      : "warning";

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
      averageTicketPrice: remainingWeightedTicketValue,
      soldWeightedAverageTicketPrice,
      availableWeightedAverageTicketPrice,
      remainingWeightedTicketValue,
      totalTicketsSold,
      currentTicketRevenue,
      currentRevenueIncludingTickets,
      remainingAmountToBreakEven,
      totalTicketsAvailable,
      totalTicketRevenue,
      remainingTicketInventory,
      remainingPossibleTicketRevenue,
      ticketsNeeded: ticketsStillNeeded,
      ticketsStillNeeded,
      remainingTicketsAfterBreakEven,
      canBreakEvenWithTicketInventory,
      ticketRevenueShortfall,
      projectedSoldOutProfit,
      bestCaseTicketPath,
      zeroProfitStatus,
      zeroProfitStatusTone,
      hasTicketData
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

  const totalTicketsSoldEl = document.getElementById("totalTicketsSold");
  if (totalTicketsSoldEl) {
    totalTicketsSoldEl.textContent = (data.ticketBreakEven?.totalTicketsSold || 0).toLocaleString("en-US");
  }

  const currentTicketRevenueEl = document.getElementById("currentTicketRevenue");
  if (currentTicketRevenueEl) {
    currentTicketRevenueEl.textContent = (data.ticketBreakEven?.currentTicketRevenue || 0).toFixed(2);
  }

  const remainingAmountEl = document.getElementById("remainingAmountToBreakEven");
  if (remainingAmountEl) {
    remainingAmountEl.textContent = (data.ticketBreakEven?.remainingAmountToBreakEven || 0).toFixed(2);
  }

  const totalTicketsAvailableEl = document.getElementById("totalTicketsAvailable");
  if (totalTicketsAvailableEl) {
    totalTicketsAvailableEl.textContent = (data.ticketBreakEven?.totalTicketsAvailable || 0).toLocaleString("en-US");
  }

  const remainingTicketInventoryEl = document.getElementById("remainingTicketInventory");
  if (remainingTicketInventoryEl) {
    remainingTicketInventoryEl.textContent = (data.ticketBreakEven?.remainingTicketInventory || 0).toLocaleString("en-US");
  }

  const totalTicketRevenueEl = document.getElementById("totalTicketRevenue");
  if (totalTicketRevenueEl) {
    totalTicketRevenueEl.textContent = (data.ticketBreakEven?.totalTicketRevenue || 0).toFixed(2);
  }

  const remainingPossibleRevenueEl = document.getElementById("remainingPossibleTicketRevenue");
  if (remainingPossibleRevenueEl) {
    remainingPossibleRevenueEl.textContent = (data.ticketBreakEven?.remainingPossibleTicketRevenue || 0).toFixed(2);
  }

  const breakEvenTicketsEl = document.getElementById("breakEvenTickets");
  if (breakEvenTicketsEl) {
    breakEvenTicketsEl.textContent = (data.ticketBreakEven?.ticketsNeeded || 0).toLocaleString("en-US");
  }

  const ticketsStillNeededEl = document.getElementById("ticketsStillNeeded");
  if (ticketsStillNeededEl) {
    const ticketBreakEven = data.ticketBreakEven || {};
    const ticketsNeeded = ticketBreakEven.ticketsStillNeeded || 0;
    ticketsStillNeededEl.textContent = ticketBreakEven.remainingAmountToBreakEven === 0
      ? "0"
      : ticketsNeeded > 0
        ? `~${ticketsNeeded.toLocaleString("en-US")}`
        : "N/A";
  }

  const zeroProfitStatusEl = document.getElementById("zeroProfitStatus");
  if (zeroProfitStatusEl) {
    const ticketBreakEven = data.ticketBreakEven || {};
    zeroProfitStatusEl.textContent = ticketBreakEven.zeroProfitStatus || "Add ticket info to calculate";
    zeroProfitStatusEl.className = `break-even-status-${ticketBreakEven.zeroProfitStatusTone || "neutral"}`;
  }

  const bestCaseTicketPathEl = document.getElementById("bestCaseTicketPath");
  if (bestCaseTicketPathEl) {
    bestCaseTicketPathEl.textContent = data.ticketBreakEven?.bestCaseTicketPath || "N/A";
  }

  const projectedSoldOutProfitEl = document.getElementById("projectedSoldOutProfit");
  if (projectedSoldOutProfitEl) {
    const projectedProfit = data.ticketBreakEven?.projectedSoldOutProfit || 0;
    projectedSoldOutProfitEl.textContent = `${projectedProfit >= 0 ? "+" : "-"}$${Math.abs(projectedProfit).toFixed(2)}`;
    projectedSoldOutProfitEl.style.color = projectedProfit > 0
      ? "var(--success)"
      : projectedProfit < 0
        ? "red"
        : "";
  }

  const remainingTicketsEl = document.getElementById("remainingTicketsAfterBreakEven");
  if (remainingTicketsEl) {
    remainingTicketsEl.textContent = (data.ticketBreakEven?.remainingTicketsAfterBreakEven || 0).toLocaleString("en-US");
  }

  const breakEvenWarningEl = document.getElementById("breakEvenWarning");
  if (breakEvenWarningEl) {
    const ticketBreakEven = data.ticketBreakEven || {};
    const hasTicketInventory = ticketBreakEven.totalTicketsAvailable > 0 || ticketBreakEven.totalTicketsSold > 0;
    const shouldShowWarning = hasTicketInventory && ticketBreakEven.remainingAmountToBreakEven > 0 && !ticketBreakEven.canBreakEvenWithTicketInventory;
    breakEvenWarningEl.hidden = !shouldShowWarning;
    breakEvenWarningEl.textContent = shouldShowWarning
      ? `Zero-profit is not possible with the current remaining ticket inventory. Remaining possible ticket revenue is $${(ticketBreakEven.remainingPossibleTicketRevenue || 0).toFixed(2)}, leaving a $${(ticketBreakEven.ticketRevenueShortfall || 0).toFixed(2)} shortfall.`
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
