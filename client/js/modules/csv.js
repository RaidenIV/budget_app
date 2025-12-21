// csv.js - CSV import/export utilities
//
// Format (v4):
//   XODIA_BUDGET_VERSION,4
//   Show Title,<value>
//   Show Date,<value>
//   ID:<elementId>,<value>
//   ...

const CSV_VERSION = 4;

// IDs that must be applied BEFORE regenerating dynamic UI
const COUNT_FIELD_IDS = [
  "numHeadliners",
  "numLocalDJs",
  "numCDJs",
  "numShowRunners",
  "numOtherCategories",
  "numMerchVendors",
];

// Inputs we do NOT want to persist
const EXCLUDE_IDS = new Set([
  "budgetSelector",
  "csvFileInput",
  "loadStatus",
]);

let fileInputEl = null;

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes('"')) {
    const q = s.replace(/"/g, '""');
    return `"${q}"`;
  }
  if (s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s}"`;
  }
  return s;
}

// Very small CSV row parser for 2-column CSV, supports quotes.
// If there are more than 2 columns, it joins the remaining columns into col2.
function parseCsvRows2col(csvText) {
  const rows = [];
  const lines = String(csvText ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);

  for (const line of lines) {
    const cols = [];
    let cur = "";
    let inQ = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (inQ) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          cur += ch;
        }
      } else {
        if (ch === '"') {
          inQ = true;
        } else if (ch === ",") {
          cols.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
    }

    cols.push(cur);

    const k = (cols[0] ?? "").trim();
    const v = cols.length <= 2 ? (cols[1] ?? "") : cols.slice(1).join(",");
    rows.push([k, v]);
  }

  return rows;
}

function getShowTitle() {
  return (
    document.getElementById("showTitle")?.value ??
    document.getElementById("show_name")?.value ??
    ""
  ).trim();
}

function getShowDate() {
  return (
    document.getElementById("showDate")?.value ??
    document.getElementById("show_date")?.value ??
    ""
  ).trim();
}

function sanitizeFilePart(s) {
  return String(s || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\.+$/g, "");
}

function ensureFileInput() {
  if (fileInputEl && document.body.contains(fileInputEl)) return fileInputEl;

  const existing = document.getElementById("csvFileInput");
  if (existing) {
    fileInputEl = existing;
    return fileInputEl;
  }

  fileInputEl = document.createElement("input");
  fileInputEl.type = "file";
  fileInputEl.accept = ".csv,text/csv";
  fileInputEl.id = "csvFileInput";
  fileInputEl.style.display = "none";
  document.body.appendChild(fileInputEl);
  return fileInputEl;
}

/**
 * Build a complete CSV string of the current form values.
 * Exported so BOTH Download and Save-to-server use the same exact data.
 */
export function buildCSVString() {
  const lines = [];
  lines.push(`XODIA_BUDGET_VERSION,${CSV_VERSION}`);

  const showTitle = getShowTitle();
  const showDate = getShowDate();

  lines.push(`Show Title,${csvEscape(showTitle)}`);
  lines.push(`Show Date,${csvEscape(showDate)}`);

  const form =
    document.getElementById("budgetForm") ||
    document.querySelector("form") ||
    document.body;

  const els = form.querySelectorAll("input, select, textarea");

  for (const el of els) {
    if (!el || !el.id) continue;
    if (EXCLUDE_IDS.has(el.id)) continue;

    if (el.tagName.toLowerCase() === "input") {
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "button" || type === "submit" || type === "reset") continue;
      if (type === "file") continue;
    }

    let val = "";
    const tag = el.tagName.toLowerCase();

    if (tag === "input") {
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "checkbox") {
        val = el.checked ? "1" : "0";
      } else if (type === "radio") {
        if (!el.checked) continue;
        val = el.value ?? "";
      } else {
        val = el.value ?? "";
      }
    } else if (tag === "select" || tag === "textarea") {
      val = el.value ?? "";
    }

    // Avoid duplicating showTitle/showDate as ID: rows (we already have label lines)
    if (el.id === "showTitle" || el.id === "showDate") continue;

    lines.push(`ID:${el.id},${csvEscape(val)}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Download the CSV to the user's machine.
 */
export function downloadCSV() {
  const csvText = buildCSVString();

  const titlePart = sanitizeFilePart(getShowTitle()) || "Budget";
  const datePart =
    sanitizeFilePart(getShowDate()) || new Date().toISOString().slice(0, 10);

  const fileName = `${titlePart}_${datePart}.csv`;

  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
  return csvText;
}

/**
 * Import CSV into the form.
 * Signature matches serverLoad.js: loadCSV(csvText, regenerators, updateBudgetFn)
 */
export function loadCSV(csvText, regenerators = {}, updateBudgetFn = null) {
  const rows = parseCsvRows2col(csvText);
  if (!rows.length) return;

  // Backward compatibility for old label rows
  const LABEL_TO_ID = {
    "Show Title": "showTitle",
    "Show Date": "showDate",
  };

  const kv = new Map();

  // 1) Build key/value map
  for (const [rawK, rawV] of rows) {
    if (!rawK) continue;

    if (rawK === "XODIA_BUDGET_VERSION") continue;

    if (rawK.startsWith("ID:")) {
      kv.set(rawK.slice(3), rawV ?? "");
      continue;
    }

    const mappedId = LABEL_TO_ID[rawK];
    if (mappedId) {
      kv.set(mappedId, rawV ?? "");
      continue;
    }

    // Legacy: treat first column as an element id
    kv.set(rawK, rawV ?? "");
  }

  // Helper to set a value by id if element exists
  const setIfExists = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.value = value ?? "";
    return true;
  };

  // 2) Apply TOP-LEVEL count fields first
  for (const id of COUNT_FIELD_IDS) {
    if (!kv.has(id)) continue;
    setIfExists(id, kv.get(id));
  }

  // 3) Regenerate top-level dynamic UI
  try {
    regenerators.headliners?.();
    regenerators.localDJs?.();
    regenerators.cdjs?.();
    regenerators.showRunners?.();
    regenerators.otherCategories?.();
    // Vendors (defensive: some code passes vendors, some passes merchVendors)
    regenerators.vendors?.();
    regenerators.merchVendors?.();
  } catch (e) {
    console.error("Regenerator error (top-level) during loadCSV:", e);
  }

  // 4) IMPORTANT: Apply per-category item counts BEFORE generating items
  const numOtherCategories = Number(
    document.getElementById("numOtherCategories")?.value || 0
  );

  if (Number.isFinite(numOtherCategories) && numOtherCategories > 0) {
    for (let c = 1; c <= numOtherCategories; c++) {
      const countId = `otherCategoryCount_${c}`;
      if (kv.has(countId)) {
        setIfExists(countId, kv.get(countId));
      }
    }

    // 5) Now generate the other items AFTER counts are applied
    try {
      for (let c = 1; c <= numOtherCategories; c++) {
        regenerators.otherItems?.(c);
      }
    } catch (e) {
      console.error("Regenerator error (otherItems) during loadCSV:", e);
    }
  }

  // 6) Apply all remaining values (now that inputs should exist)
  for (const [id, value] of kv.entries()) {
    if (EXCLUDE_IDS.has(id)) continue;

    const el = document.getElementById(id);
    if (!el) continue;

    const tag = el.tagName.toLowerCase();

    if (tag === "input") {
      const type = (el.getAttribute("type") || "").toLowerCase();

      if (type === "checkbox") {
        el.checked = value === "1" || value === "true" || value === "yes";
      } else if (type === "radio") {
        const name = el.name;
        if (!name) continue;
        const group = document.querySelectorAll(
          `input[type="radio"][name="${name}"]`
        );
        for (const r of group) r.checked = r.value === value;
      } else {
        el.value = value ?? "";
      }
    } else if (tag === "select" || tag === "textarea") {
      el.value = value ?? "";
    }
  }

  // 7) Update UI/calcs
  try {
    if (typeof updateBudgetFn === "function") updateBudgetFn();
    else if (typeof window.updateBudget === "function") window.updateBudget();
  } catch (e) {
    console.error("updateBudget error after loadCSV:", e);
  }
}

/**
 * Wire up the "Import" flow.
 */
export function setupCSVImport(regenerators = {}, updateBudgetFn = null) {
  const input = ensureFileInput();

  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      loadCSV(text, regenerators, updateBudgetFn);
    } catch (err) {
      console.error("Failed to read CSV file:", err);
      alert("Failed to import CSV.");
    } finally {
      input.value = "";
    }
  };
}

export function triggerImport() {
  const input = ensureFileInput();
  input.click();
}
