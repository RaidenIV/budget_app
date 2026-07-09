// analytics.js - Budget Analytics Module

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : window.location.origin;

let allBudgets = [];
let currentFilter = 'all';
let expensesChart = null;
let revenueChart = null;

const EXP_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#8BC34A", "#9C27B0", "#FF9800", "#607D8B"];
const REV_COLORS = ["#4CAF50", "#03A9F4", "#FFC107", "#E91E63", "#9E9E9E", "#00BCD4", "#8BC34A"];
const CHART_TEXT = "#ffffff";

// Set Chart.js global defaults for text color
if (typeof Chart !== "undefined" && Chart?.defaults) {
  Chart.defaults.color = CHART_TEXT;
}

function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  const data = {};
  for (const line of lines) {
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    let key = line.substring(0, commaIdx).trim();
    let value = line.substring(commaIdx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"');
    }
    if (key === 'Show Title') {
      data.showTitle = value;
    } else if (key === 'Show Date') {
      data.showDate = value;
    } else if (key.startsWith('ID:')) {
      data[key.substring(3)] = value;
    }
  }
  return data;
}

function calculateBudgetFromData(data) {
  const getNum = (id) => {
    const val = parseFloat(data[id] || 0);
    return Number.isFinite(val) ? val : 0;
  };
  let headlinerTotal = 0;
  const numHeadliners = parseInt(data.numHeadliners || 0);
  for (let i = 1; i <= numHeadliners; i++) {
    headlinerTotal += getNum(`headliner_fee_${i}`) + getNum(`headliner_hotel_${i}`) + getNum(`headliner_rider_${i}`);
  }
  const directSupportTotal = getNum('directSupport') + getNum('directSupportHotel') + getNum('directSupportRider');
  let localDJTotal = 0;
  const numLocalDJs = parseInt(data.numLocalDJs || 0);
  for (let i = 1; i <= numLocalDJs; i++) {
    localDJTotal += getNum(`localDJ_fee_${i}`);
  }
  const productionTotal = getNum('vjFee') + getNum('venue') + getNum('ledWall') + getNum('lights') + getNum('lasers');
  let cdjTotal = 0;
  const numCDJs = parseInt(data.numCDJs || 0);
  for (let i = 1; i <= numCDJs; i++) {
    cdjTotal += getNum(`cdj_fee_${i}`);
  }
  const gearTotal = cdjTotal + getNum('sound') + getNum('mixer') + getNum('table');
  const marketingTotal = getNum('facebookAdsXodia') + getNum('facebookAdsSpaceCampHQ') + getNum('instagramAdsXodia') + getNum('instagramAdsSpaceCampHQ') + getNum('physicalFlyers') + getNum('eventbriteAds') + getNum('collaboratorAmount');
  let showRunnerTotal = 0;
  const numShowRunners = parseInt(data.numShowRunners || 0);
  for (let i = 1; i <= numShowRunners; i++) {
    showRunnerTotal += getNum(`showRunner_fee_${i}`);
  }
  const staffTotal = getNum('doorStaff') + getNum('merchTable') + getNum('transportation') + showRunnerTotal;
  let mediaTotal = 0;
  const numMedia = parseInt(data.numMedia || 0);
  if (numMedia > 0) {
    for (let i = 1; i <= numMedia; i++) {
      mediaTotal += getNum(`media_photo_${i}`) + getNum(`media_video_${i}`) + getNum(`media_photoVideo_${i}`);
    }
  } else {
    // Preserve analytics for budgets saved before Media became repeatable.
    mediaTotal = getNum('photo') + getNum('video');
  }
  let otherTotal = 0;
  const numOtherCategories = parseInt(data.numOtherCategories || 0);
  for (let c = 1; c <= numOtherCategories; c++) {
    const count = parseInt(data[`otherCategoryCount_${c}`] || 0);
    for (let i = 1; i <= count; i++) {
      otherTotal += getNum(`otherCategory_${c}_itemFee_${i}`);
    }
  }
  const eventbriteSales = getNum('eventbriteSales');
  const poshSales = getNum('poshSales');
  const raffleSales = getNum('raffleSales');
  const djPresales = getNum('djPresales');
  const promoTeam = getNum('promoTeam');
  const doorSales = getNum('doorSales');
  const merchSold = getNum('merchSold');
  let merchVendorTotal = 0;
  const numMerchVendors = parseInt(data.numMerchVendors || 0);
  for (let i = 1; i <= numMerchVendors; i++) {
    merchVendorTotal += getNum(`merchVendor_fee_${i}`);
  }
  const expenses = {
    Headliners: headlinerTotal,
    Support: directSupportTotal + localDJTotal,
    Production: productionTotal,
    Gear: gearTotal,
    Marketing: marketingTotal,
    Staff: staffTotal,
    Media: mediaTotal,
    Other: otherTotal
  };
  const revenue = {
    Eventbrite: eventbriteSales,
    Posh: poshSales,
    Raffle: raffleSales,
    Presales: djPresales,
    Promo: promoTeam,
    Door: doorSales,
    'Merch Sold': merchSold,
    'Merch Vendors': merchVendorTotal
  };
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);
  const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0);
  return {
    showTitle: data.showTitle || 'Untitled',
    showDate: data.showDate || '',
    expenses,
    revenue,
    totalExpenses,
    totalRevenue,
    netProfit: totalRevenue - totalExpenses
  };
}

function filterBudgetsByDate(budgets, filter) {
  if (filter === 'all') return budgets;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  return budgets.filter(budget => {
    if (!budget.showDate) return false;
    const budgetDate = new Date(budget.showDate);
    if (isNaN(budgetDate.getTime())) return false;
    if (filter === 'year') {
      return budgetDate.getFullYear() === currentYear;
    } else if (filter === 'month') {
      return budgetDate.getFullYear() === currentYear && budgetDate.getMonth() === currentMonth;
    } else if (filter.type === 'custom') {
      return budgetDate.getFullYear() === filter.year && budgetDate.getMonth() === filter.month - 1;
    }
    return true;
  });
}

function aggregateData(budgets) {
  const aggregated = {
    expenses: { Headliners: 0, Support: 0, Production: 0, Gear: 0, Marketing: 0, Staff: 0, Media: 0, Other: 0 },
    revenue: { Eventbrite: 0, Posh: 0, Raffle: 0, Presales: 0, Promo: 0, Door: 0, 'Merch Sold': 0, 'Merch Vendors': 0 },
    totalExpenses: 0,
    totalRevenue: 0,
    totalProfit: 0,
    eventCount: budgets.length,
    profitableEventCount: 0,
    averageExpensesPerEvent: 0,
    averageIncomingSalesPerEvent: 0,
    averageProfitPerEvent: 0,
    profitMargin: 0,
    returnOnExpenses: 0,
    profitableEventRate: 0,
    events: []
  };
  budgets.forEach(budget => {
    Object.keys(aggregated.expenses).forEach(cat => { aggregated.expenses[cat] += budget.expenses[cat] || 0; });
    Object.keys(aggregated.revenue).forEach(cat => { aggregated.revenue[cat] += budget.revenue[cat] || 0; });
    aggregated.totalExpenses += budget.totalExpenses;
    aggregated.totalRevenue += budget.totalRevenue;
    aggregated.totalProfit += budget.netProfit;
    if (budget.netProfit > 0) aggregated.profitableEventCount += 1;
    aggregated.events.push({ title: budget.showTitle, date: budget.showDate, profit: budget.netProfit });
  });

  if (aggregated.eventCount > 0) {
    aggregated.averageExpensesPerEvent = aggregated.totalExpenses / aggregated.eventCount;
    aggregated.averageIncomingSalesPerEvent = aggregated.totalRevenue / aggregated.eventCount;
    aggregated.averageProfitPerEvent = aggregated.totalProfit / aggregated.eventCount;
    aggregated.profitableEventRate = (aggregated.profitableEventCount / aggregated.eventCount) * 100;
  }
  if (aggregated.totalRevenue > 0) {
    aggregated.profitMargin = (aggregated.totalProfit / aggregated.totalRevenue) * 100;
  }
  if (aggregated.totalExpenses > 0) {
    aggregated.returnOnExpenses = (aggregated.totalProfit / aggregated.totalExpenses) * 100;
  }

  aggregated.events.sort((a, b) => {
    const dateA = new Date(a.date || '1970-01-01');
    const dateB = new Date(b.date || '1970-01-01');
    return dateB - dateA;
  });
  return aggregated;
}

function createOrUpdateChart(chart, canvasId, labels, values, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return chart;
  const ctx = canvas.getContext('2d');
  const filtered = labels.map((label, i) => ({ label, value: values[i] })).filter(item => item.value > 0);
  const filteredLabels = filtered.map(item => item.label);
  const filteredValues = filtered.map(item => item.value);
  const filteredColors = filtered.map((_, i) => colors[i % colors.length]);
  if (chart) {
    chart.data.labels = filteredLabels;
    chart.data.datasets[0].data = filteredValues;
    chart.data.datasets[0].backgroundColor = filteredColors;
    chart.update();
    return chart;
  }
  return new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: filteredLabels,
      datasets: [{ data: filteredValues, backgroundColor: filteredColors, borderColor: 'transparent', borderWidth: 2 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '54%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#ffffff',
            generateLabels: (chart) => {
              const data = chart.data;
              const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
              return data.labels.map((label, i) => {
                const value = data.datasets[0].data[i];
                const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                return { text: `${label}: $${value.toFixed(2)} (${percentage}%)`, fontColor: CHART_TEXT, fillStyle: data.datasets[0].backgroundColor[i], strokeStyle: 'transparent', lineWidth: 0, hidden: false, index: i };
              });
            }
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
              return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
            }
          },
          bodyColor: '#ffffff',
          titleColor: '#ffffff'
        }
      }
    }
  });
}

function updateDisplay(aggregated) {
  document.getElementById('totalEvents').textContent = aggregated.eventCount;
  document.getElementById('totalRevenue_analytics').textContent = `$${aggregated.totalRevenue.toFixed(2)}`;
  document.getElementById('totalExpenses_analytics').textContent = `$${aggregated.totalExpenses.toFixed(2)}`;
  const profitEl = document.getElementById('totalProfit');
  profitEl.textContent = `${aggregated.totalProfit >= 0 ? '+' : ''}$${aggregated.totalProfit.toFixed(2)}`;
  profitEl.className = `stat-inline-value ${aggregated.totalProfit >= 0 ? 'positive' : 'negative'}`;

  document.getElementById('averageExpensesPerEvent').textContent = `$${aggregated.averageExpensesPerEvent.toFixed(2)}`;
  document.getElementById('averageIncomingSalesPerEvent').textContent = `$${aggregated.averageIncomingSalesPerEvent.toFixed(2)}`;

  const averageProfitEl = document.getElementById('averageProfitPerEvent');
  averageProfitEl.textContent = `${aggregated.averageProfitPerEvent >= 0 ? '+' : ''}$${aggregated.averageProfitPerEvent.toFixed(2)}`;
  averageProfitEl.className = `stat-inline-value ${aggregated.averageProfitPerEvent >= 0 ? 'positive' : 'negative'}`;

  const profitMarginEl = document.getElementById('profitMargin');
  profitMarginEl.textContent = `${aggregated.profitMargin.toFixed(2)}%`;
  profitMarginEl.className = `stat-inline-value ${aggregated.profitMargin >= 0 ? 'positive' : 'negative'}`;

  const returnOnExpensesEl = document.getElementById('returnOnExpenses');
  returnOnExpensesEl.textContent = `${aggregated.returnOnExpenses.toFixed(2)}%`;
  returnOnExpensesEl.className = `stat-inline-value ${aggregated.returnOnExpenses >= 0 ? 'positive' : 'negative'}`;

  document.getElementById('profitableEventRate').textContent = `${aggregated.profitableEventRate.toFixed(2)}%`;

  const expenseLabels = Object.keys(aggregated.expenses);
  const expenseValues = Object.values(aggregated.expenses);
  expensesChart = createOrUpdateChart(expensesChart, 'expensesChartAnalytics', expenseLabels, expenseValues, EXP_COLORS);
  const revenueLabels = Object.keys(aggregated.revenue);
  const revenueValues = Object.values(aggregated.revenue);
  revenueChart = createOrUpdateChart(revenueChart, 'revenueChartAnalytics', revenueLabels, revenueValues, REV_COLORS);
  const eventsList = document.getElementById('eventsList');
  if (aggregated.events.length === 0) {
    eventsList.innerHTML = '<p style="text-align: center; color: var(--muted); padding: 2rem;">No events found in selected period</p>';
  } else {
    eventsList.innerHTML = aggregated.events.map(event => `<div class="event-item"><div><div class="event-name">${event.title || 'Untitled Event'}</div><div class="event-date">${formatDate(event.date)}</div></div><div class="event-profit ${event.profit >= 0 ? 'positive' : 'negative'}">${event.profit >= 0 ? '+' : ''}$${event.profit.toFixed(2)}</div></div>`).join('');
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getMonthName(monthNum) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthNum - 1] || '';
}

window.setTimeFilter = function(filter) {
  document.querySelectorAll('.time-filter button').forEach(btn => btn.classList.remove('active'));
  const customSelector = document.getElementById('customSelector');
  if (filter === 'custom') {
    customSelector.style.display = 'flex';
    currentFilter = { type: 'custom', month: parseInt(document.getElementById('monthSelect').value), year: parseInt(document.getElementById('yearSelect').value) };
  } else {
    customSelector.style.display = 'none';
    const btnId = `btn${filter.charAt(0).toUpperCase() + filter.slice(1)}`;
    const btn = document.getElementById(btnId);
    if (btn) btn.classList.add('active');
    currentFilter = filter;
  }
  refreshAnalytics();
};

window.applyCustomFilter = function() {
  currentFilter = { type: 'custom', month: parseInt(document.getElementById('monthSelect').value), year: parseInt(document.getElementById('yearSelect').value) };
  refreshAnalytics();
};

function refreshAnalytics() {
  const filtered = filterBudgetsByDate(allBudgets, currentFilter);
  const aggregated = aggregateData(filtered);
  updateDisplay(aggregated);
}

function populateYearSelector() {
  const yearSelect = document.getElementById('yearSelect');
  if (!yearSelect) return;
  const currentYear = new Date().getFullYear();
  const years = new Set(allBudgets.map(b => b.showDate ? new Date(b.showDate).getFullYear() : null).filter(y => y && !isNaN(y)));
  const minYear = Math.min(...years, currentYear);
  const maxYear = Math.max(...years, currentYear);
  yearSelect.innerHTML = '';
  for (let year = maxYear; year >= minYear; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }
  const monthSelect = document.getElementById('monthSelect');
  if (monthSelect) monthSelect.value = new Date().getMonth() + 1;
}

export async function loadAnalytics() {
  console.log('🔄 Loading analytics...');
  const loadingEl = document.getElementById('loadingIndicator');
  const contentEl = document.getElementById('analyticsContent');
  if (loadingEl) loadingEl.style.display = 'block';
  if (contentEl) contentEl.style.display = 'none';
  try {
    console.log('📡 Fetching from:', `${API_BASE}/api/budgets/all-data`);
    const response = await fetch(`${API_BASE}/api/budgets/all-data`);
    console.log('📥 Response status:', response.status);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }
    const budgetsData = await response.json();
    console.log('✅ Fetched budgets:', budgetsData.length);
    
    // Process all budgets with their metadata
    const processedBudgets = budgetsData.map(b => {
      if (!b.csv) {
        console.warn('⚠️  Budget missing CSV:', b);
        return null;
      }
      const parsed = parseCSV(b.csv);
      const calculated = calculateBudgetFromData(parsed);
      // Add metadata for deduplication
      calculated.createdAt = b.createdAt || b.created_at || b.timestamp || '';
      calculated.id = b.id || b._id || '';
      return calculated;
    }).filter(b => b && b.showDate);
    
    console.log('✅ Processed budgets:', processedBudgets.length);
    
    // Deduplicate: keep only the latest budget for each show (by title + date)
    const budgetMap = new Map();
    processedBudgets.forEach(budget => {
      const key = `${(budget.showTitle || '').toLowerCase().trim()}__${(budget.showDate || '').trim()}`;
      
      if (!budgetMap.has(key)) {
        budgetMap.set(key, budget);
      } else {
        // Compare timestamps - keep the newer one
        const existing = budgetMap.get(key);
        const existingTime = new Date(existing.createdAt || 0).getTime();
        const currentTime = new Date(budget.createdAt || 0).getTime();
        
        if (currentTime > existingTime) {
          budgetMap.set(key, budget);
        }
      }
    });
    
    allBudgets = Array.from(budgetMap.values());
    console.log('✅ Deduplicated to unique shows:', allBudgets.length);
    
    if (loadingEl) loadingEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    populateYearSelector();
    refreshAnalytics();
  } catch (error) {
    console.error('❌ Error loading analytics:', error);
    if (loadingEl) {
      loadingEl.innerHTML = `<p style="color: #ff4444;">Failed to load analytics</p><p style="font-size: 0.9rem;">${error.message}</p>`;
    }
  }
}

window.loadAnalytics = loadAnalytics;
console.log('✅ Analytics module loaded');
