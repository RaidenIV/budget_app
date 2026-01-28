// analytics.js - Budget Analytics Module

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3000'
  : window.location.origin;

let allBudgets = [];
let currentFilter = 'all';
let expensesChart = null;
let revenueChart = null;

// Chart colors (matching main app)
const EXP_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#8BC34A", "#9C27B0", "#FF9800", "#607D8B"];
const REV_COLORS = ["#4CAF50", "#03A9F4", "#FFC107", "#E91E63", "#9E9E9E", "#00BCD4"];

// Parse CSV to extract key/value pairs
function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(l => l.trim());
  const data = {};
  
  for (const line of lines) {
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    
    let key = line.substring(0, commaIdx).trim();
    let value = line.substring(commaIdx + 1).trim();
    
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/""/g, '"');
    }
    
    if (key === 'Show Title') {
      data.showTitle = value;
    } else if (key === 'Show Date') {
      data.showDate = value;
    } else if (key.startsWith('ID:')) {
      const fieldId = key.substring(3);
      data[fieldId] = value;
    }
  }
  
  return data;
}

// Calculate budget totals from parsed CSV data
function calculateBudgetFromData(data) {
  const getNum = (id) => {
    const val = parseFloat(data[id] || 0);
    return Number.isFinite(val) ? val : 0;
  };

  // Headliners
  let headlinerTotal = 0;
  const numHeadliners = parseInt(data.numHeadliners || 0);
  for (let i = 1; i <= numHeadliners; i++) {
    headlinerTotal += getNum(`headliner_fee_${i}`) + 
                     getNum(`headliner_hotel_${i}`) + 
                     getNum(`headliner_rider_${i}`);
  }

  // Support (Direct Support + Local DJs)
  const directSupportTotal = getNum('directSupport') + 
                             getNum('directSupportHotel') + 
                             getNum('directSupportRider');
  
  let localDJTotal = 0;
  const numLocalDJs = parseInt(data.numLocalDJs || 0);
  for (let i = 1; i <= numLocalDJs; i++) {
    localDJTotal += getNum(`localDJ_fee_${i}`);
  }

  // Production
  const productionTotal = getNum('vjFee') + getNum('venue') + 
                         getNum('ledWall') + getNum('lights') + getNum('lasers');

  // Gear
  let cdjTotal = 0;
  const numCDJs = parseInt(data.numCDJs || 0);
  for (let i = 1; i <= numCDJs; i++) {
    cdjTotal += getNum(`cdj_fee_${i}`);
  }
  const gearTotal = cdjTotal + getNum('sound') + getNum('mixer') + getNum('table');

  // Marketing
  const marketingTotal = getNum('facebookAdsXodia') + getNum('facebookAdsSpaceCampHQ') +
                        getNum('instagramAdsXodia') + getNum('instagramAdsSpaceCampHQ') +
                        getNum('physicalFlyers') + getNum('eventbriteAds');

  // Staff
  let showRunnerTotal = 0;
  const numShowRunners = parseInt(data.numShowRunners || 0);
  for (let i = 1; i <= numShowRunners; i++) {
    showRunnerTotal += getNum(`showRunner_fee_${i}`);
  }
  const staffTotal = getNum('doorStaff') + getNum('merchTable') + 
                    getNum('transportation') + showRunnerTotal;

  // Other categories
  let otherTotal = 0;
  const numOtherCategories = parseInt(data.numOtherCategories || 0);
  for (let c = 1; c <= numOtherCategories; c++) {
    const count = parseInt(data[`otherCategoryCount_${c}`] || 0);
    for (let i = 1; i <= count; i++) {
      otherTotal += getNum(`otherCategory_${c}_itemFee_${i}`);
    }
  }

  // Revenue
  const eventbriteSales = getNum('eventbriteSales');
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
    Other: otherTotal
  };

  const revenue = {
    Eventbrite: eventbriteSales,
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

// Filter budgets by time period
function filterBudgetsByDate(budgets, filter) {
  if (filter === 'all') return budgets;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  return budgets.filter(budget => {
    if (!budget.showDate) return false;
    
    const budgetDate = new Date(budget.showDate);
    if (isNaN(budgetDate.getTime())) return false;

    if (filter === 'year') {
      return budgetDate.getFullYear() === currentYear;
    } else if (filter === 'month') {
      return budgetDate.getFullYear() === currentYear && 
             budgetDate.getMonth() === currentMonth;
    } else if (filter.type === 'custom') {
      return budgetDate.getFullYear() === filter.year && 
             budgetDate.getMonth() === filter.month - 1;
    }

    return true;
  });
}

// Aggregate totals across budgets
function aggregateData(budgets) {
  const aggregated = {
    expenses: {
      Headliners: 0,
      Support: 0,
      Production: 0,
      Gear: 0,
      Marketing: 0,
      Staff: 0,
      Other: 0
    },
    revenue: {
      Eventbrite: 0,
      Presales: 0,
      Promo: 0,
      Door: 0,
      'Merch Sold': 0,
      'Merch Vendors': 0
    },
    totalExpenses: 0,
    totalRevenue: 0,
    totalProfit: 0,
    eventCount: budgets.length,
    events: []
  };

  budgets.forEach(budget => {
    // Add to category totals
    Object.keys(aggregated.expenses).forEach(cat => {
      aggregated.expenses[cat] += budget.expenses[cat] || 0;
    });
    
    Object.keys(aggregated.revenue).forEach(cat => {
      aggregated.revenue[cat] += budget.revenue[cat] || 0;
    });

    aggregated.totalExpenses += budget.totalExpenses;
    aggregated.totalRevenue += budget.totalRevenue;
    aggregated.totalProfit += budget.netProfit;

    aggregated.events.push({
      title: budget.showTitle,
      date: budget.showDate,
      profit: budget.netProfit
    });
  });

  // Sort events by date (newest first)
  aggregated.events.sort((a, b) => {
    const dateA = new Date(a.date || '1970-01-01');
    const dateB = new Date(b.date || '1970-01-01');
    return dateB - dateA;
  });

  return aggregated;
}

// Create or update pie chart
function createOrUpdateChart(chart, canvasId, labels, values, colors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return chart;

  const ctx = canvas.getContext('2d');

  // Filter out zero values
  const filtered = labels.map((label, i) => ({ label, value: values[i] }))
                         .filter(item => item.value > 0);
  
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
    type: 'pie',
    data: {
      labels: filteredLabels,
      datasets: [{
        data: filteredValues,
        backgroundColor: filteredColors,
        borderColor: 'transparent',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
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
                
                return {
                  text: `${label}: $${value.toFixed(2)} (${percentage}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  hidden: false,
                  index: i
                };
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

// Update the display with aggregated data
function updateDisplay(aggregated) {
  // Update stats
  document.getElementById('totalEvents').textContent = aggregated.eventCount;
  document.getElementById('totalRevenue').textContent = `$${aggregated.totalRevenue.toFixed(2)}`;
  document.getElementById('totalExpenses').textContent = `$${aggregated.totalExpenses.toFixed(2)}`;
  
  const profitEl = document.getElementById('totalProfit');
  profitEl.textContent = `${aggregated.totalProfit >= 0 ? '+' : ''}$${aggregated.totalProfit.toFixed(2)}`;
  profitEl.className = `stat-value ${aggregated.totalProfit >= 0 ? 'positive' : 'negative'}`;

  // Update period text
  const periodMap = {
    'all': 'All time',
    'year': 'This year',
    'month': 'This month'
  };
  const periodText = typeof currentFilter === 'object' 
    ? `${getMonthName(currentFilter.month)} ${currentFilter.year}`
    : periodMap[currentFilter] || 'Selected period';
  document.getElementById('eventsPeriod').textContent = periodText;

  // Update charts
  const expenseLabels = Object.keys(aggregated.expenses);
  const expenseValues = Object.values(aggregated.expenses);
  expensesChart = createOrUpdateChart(expensesChart, 'expensesChart', expenseLabels, expenseValues, EXP_COLORS);

  const revenueLabels = Object.keys(aggregated.revenue);
  const revenueValues = Object.values(aggregated.revenue);
  revenueChart = createOrUpdateChart(revenueChart, 'revenueChart', revenueLabels, revenueValues, REV_COLORS);

  // Update events list
  const eventsList = document.getElementById('eventsList');
  if (aggregated.events.length === 0) {
    eventsList.innerHTML = '<p style="text-align: center; color: var(--text-dim); padding: 2rem;">No events found in selected period</p>';
  } else {
    eventsList.innerHTML = aggregated.events.map(event => `
      <div class="event-item">
        <div>
          <div class="event-name">${event.title || 'Untitled Event'}</div>
          <div class="event-date">${formatDate(event.date)}</div>
        </div>
        <div class="event-profit ${event.profit >= 0 ? 'positive' : 'negative'}">
          ${event.profit >= 0 ? '+' : ''}$${event.profit.toFixed(2)}
        </div>
      </div>
    `).join('');
  }
}

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return 'No date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Get month name
function getMonthName(monthNum) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return months[monthNum - 1] || '';
}

// Set time filter
window.setTimeFilter = function(filter) {
  // Update button states
  document.querySelectorAll('.time-filter button').forEach(btn => {
    btn.classList.remove('active');
  });

  const customSelector = document.getElementById('customSelector');
  
  if (filter === 'custom') {
    customSelector.style.display = 'flex';
    currentFilter = {
      type: 'custom',
      month: parseInt(document.getElementById('monthSelect').value),
      year: parseInt(document.getElementById('yearSelect').value)
    };
  } else {
    customSelector.style.display = 'none';
    document.getElementById(`btn${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
    currentFilter = filter;
  }

  refreshAnalytics();
};

// Apply custom filter
window.applyCustomFilter = function() {
  currentFilter = {
    type: 'custom',
    month: parseInt(document.getElementById('monthSelect').value),
    year: parseInt(document.getElementById('yearSelect').value)
  };
  refreshAnalytics();
};

// Refresh analytics display
function refreshAnalytics() {
  const filtered = filterBudgetsByDate(allBudgets, currentFilter);
  const aggregated = aggregateData(filtered);
  updateDisplay(aggregated);
}

// Populate year selector
function populateYearSelector() {
  const yearSelect = document.getElementById('yearSelect');
  const currentYear = new Date().getFullYear();
  
  // Get range of years from budgets
  const years = new Set(allBudgets
    .map(b => b.showDate ? new Date(b.showDate).getFullYear() : null)
    .filter(y => y && !isNaN(y)));
  
  const minYear = Math.min(...years, currentYear);
  const maxYear = Math.max(...years, currentYear);
  
  for (let year = maxYear; year >= minYear; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }

  // Set month to current month
  const monthSelect = document.getElementById('monthSelect');
  monthSelect.value = new Date().getMonth() + 1;
}

// Load all budgets and initialize
async function loadAnalytics() {
  try {
    // Fetch all budgets with full CSV data
    const response = await fetch(`${API_BASE}/api/budgets/all-data`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch budget data');
    }

    const budgetsData = await response.json();
    
    // Parse and calculate each budget
    allBudgets = budgetsData
      .map(b => {
        const parsed = parseCSV(b.csv);
        return calculateBudgetFromData(parsed);
      })
      .filter(b => b.showDate); // Only include budgets with dates

    // Hide loading, show content
    document.getElementById('loadingIndicator').style.display = 'none';
    document.getElementById('analyticsContent').style.display = 'block';

    // Populate year selector
    populateYearSelector();

    // Initial display
    refreshAnalytics();

  } catch (error) {
    console.error('Error loading analytics:', error);
    document.getElementById('loadingIndicator').innerHTML = `
      <p style="color: #ff4444;">Failed to load analytics data</p>
      <p style="font-size: 0.9rem;">${error.message}</p>
    `;
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadAnalytics);
