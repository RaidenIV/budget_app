// charts.js - Chart rendering and management

import { state } from './state.js';
import { loadImage } from './utils.js';

function fmtUSD(v) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(+v || 0);
}

function toNum(v) {
  return Number.isFinite(+v) ? +v : 0;
}

function cycleColors(colors, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(colors[i % colors.length]);
  return out;
}

function isVisible(chart, i) {
  if (typeof chart.getDataVisibility === "function") return chart.getDataVisibility(i);
  const meta = chart.getDatasetMeta(0);
  const el = meta?.data?.[i];
  return !(el && el.hidden === true);
}

function visibleTotal(chart, values) {
  let t = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] > 0 && isVisible(chart, i)) t += values[i];
  }
  return t;
}

function legendOnClick(e, legendItem, legend) {
  const chart = legend.chart;
  const idx = legendItem.index;

  if (typeof chart.toggleDataVisibility === "function") {
    chart.toggleDataVisibility(idx);
  } else {
    const meta = chart.getDatasetMeta(0);
    if (meta?.data?.[idx]) meta.data[idx].hidden = !meta.data[idx].hidden;
  }

  chart.update();
}

function makeLegendGenerateLabels() {
  return (chart) => {
    const ds = chart.data.datasets?.[0];
    const labels = chart.data.labels || [];
    const values = (ds?.data || []).map(toNum);
    const total = visibleTotal(chart, values);

    return labels.map((label, i) => {
      const v = values[i] || 0;
      const pct = total > 0 ? (v / total) * 100 : 0;

      const fillStyle = Array.isArray(ds.backgroundColor)
        ? ds.backgroundColor[i]
        : ds.backgroundColor;

      return {
        text: `${label}: ${fmtUSD(v)} (${pct.toFixed(0)}%)`,
        fillStyle,
        strokeStyle: fillStyle,
        lineWidth: 1,
        hidden: !isVisible(chart, i),
        index: i,
      };
    });
  };
}

function tooltipLabel(ctx) {
  const v = toNum(ctx.parsed);
  const values = (ctx.chart.data.datasets?.[0]?.data || []).map(toNum);
  const total = visibleTotal(ctx.chart, values);
  const pct = total > 0 ? (v / total) * 100 : 0;
  return `${ctx.label}: ${fmtUSD(v)} (${pct.toFixed(0)}%)`;
}

const EXP_COLORS = ["#FF6384", "#36A2EB", "#FFCE56", "#8BC34A", "#9C27B0", "#FF9800", "#607D8B"];
const REV_COLORS = ["#4CAF50", "#03A9F4", "#FFC107", "#E91E63", "#9E9E9E"];

function buildEntries(mapObj) {
  const entries = Object.entries(mapObj || {})
    .map(([k, v]) => [k, toNum(v)])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return {
    labels: entries.map((e) => e[0]),
    values: entries.map((e) => e[1]),
  };
}

function makeOrUpdatePie(existingChart, canvasId, labels, values, baseColors) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return existingChart;

  const colors = cycleColors(baseColors, values.length);

  if (!existingChart) {
    return new Chart(canvas.getContext("2d"), {
      type: "pie",
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            onClick: legendOnClick,
            labels: {
              generateLabels: makeLegendGenerateLabels(),
            },
          },
          tooltip: {
            callbacks: { label: tooltipLabel },
          },
        },
      },
    });
  }

  existingChart.data.labels = labels;
  existingChart.data.datasets[0].data = values;
  existingChart.data.datasets[0].backgroundColor = colors;

  if (typeof existingChart.setDataVisibility === "function") {
    for (let i = 0; i < labels.length; i++) existingChart.setDataVisibility(i, true);
  }

  existingChart.update();
  return existingChart;
}

export function updateCharts(expenseMap, revenueMap) {
  const exp = buildEntries(expenseMap);
  const rev = buildEntries(revenueMap);

  state.chartExpenses = makeOrUpdatePie(state.chartExpenses, "expensesChart", exp.labels, exp.values, EXP_COLORS);
  state.chartSales = makeOrUpdatePie(state.chartSales, "salesChart", rev.labels, rev.values, REV_COLORS);
}

export async function downloadChartsPNG(filename) {
  if (!state.chartExpenses || !state.chartSales) {
    alert("Charts are not ready yet. Click Update Chart first.");
    return;
  }

  try {
    state.chartExpenses.update("none");
    state.chartSales.update("none");
  } catch (e) {
    // ignore
  }

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  const expURL = (typeof state.chartExpenses.toBase64Image === "function")
    ? state.chartExpenses.toBase64Image()
    : state.chartExpenses.canvas.toDataURL("image/png");

  const salesURL = (typeof state.chartSales.toBase64Image === "function")
    ? state.chartSales.toBase64Image()
    : state.chartSales.canvas.toDataURL("image/png");

  const [expImg, salesImg] = await Promise.all([loadImage(expURL), loadImage(salesURL)]);

  const pad = 24;
  const gap = 24;

  const outW = Math.max(expImg.width, salesImg.width) + pad * 2;
  const outH = expImg.height + salesImg.height + pad * 2 + gap;

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;

  const ctx = out.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);

  let y = pad;
  ctx.drawImage(expImg, (outW - expImg.width) / 2, y);

  y += expImg.height + gap;
  ctx.drawImage(salesImg, (outW - salesImg.width) / 2, y);

  out.toBlob((blob) => {
    if (!blob) {
      const a = document.createElement("a");
      a.href = out.toDataURL("image/png");
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, "image/png");
}