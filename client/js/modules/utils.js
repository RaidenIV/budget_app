// utils.js - Utility helper functions

export function getNum(id) {
  const el = document.getElementById(id);
  const v = el ? parseFloat(el.value) : 0;
  return Number.isFinite(v) ? v : 0;
}

export function getStr(id) {
  const el = document.getElementById(id);
  return el ? (el.value || "") : "";
}

export function setVal(id, v) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = (v == null) ? "" : v;
}

export function storeValues(obj, prefix, count, fields) {
  obj[prefix] = {};
  for (let i = 1; i <= count; i++) {
    obj[prefix][i] = {};
    fields.forEach(f => {
      let el = document.getElementById(`${prefix}_${f}_${i}`);
      if (el) obj[prefix][i][f] = el.value;
    });
  }
}

export function restoreValues(obj, prefix, fields) {
  if (!obj[prefix]) return;
  Object.keys(obj[prefix]).forEach(i => {
    fields.forEach(f => {
      let el = document.getElementById(`${prefix}_${f}_${i}`);
      if (el && obj[prefix][i][f] != null) el.value = obj[prefix][i][f];
    });
  });
}

export function safeFileName(str) {
  return (str || "")
    .toString()
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80) || "budget_export";
}

export function getExportBaseName() {
  const titleRaw = (document.getElementById("showTitle")?.value || "UNTITLED_EVENT").trim();
  const dateRaw = (document.getElementById("showDate")?.value || "NO_DATE").trim();
  return safeFileName(`budget_${titleRaw}_${dateRaw}`);
}

export function buildCsvFileName() {
  return `${getExportBaseName()}.csv`;
}

export function buildTxtFileName() {
  const title = document.getElementById("showTitle")?.value || "";
  const date = document.getElementById("showDate")?.value || "";
  const base = [title, date].filter(Boolean).join("_");
  return safeFileName(base || "budget_export") + ".txt";
}

export function buildChartsPngFileName() {
  return `${getExportBaseName()}_charts.png`;
}

export function fmtMoney(v) {
  const n = Number(v) || 0;
  return `$${n.toFixed(2)}`;
}

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}