// csv.js - CSV import/export utilities
//
// Key change: buildCSVString() serializes ALL inputs/selects/textareas in the form,
// so server saves include the full budget, not just title/date.
//
// Format:
//   XODIA_BUDGET_VERSION,4
//   Show Title,<value>
//   Show Date,<value>
//   ID:<elementId>,<value>
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
    // escape quotes by doubling
    const q = s.replace(/"/g, '""');
    // quoting needed anyway if it had quotes
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
          // Lookahead for escaped quote
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

  // Create a hidden file input if the HTML doesn't already have one.
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

  // Keep these human-friendly lines (and backward-compatible mapping)
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

    // ignore buttons/submit
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
        // only persist the checked value for the group
        if (!el.checked) continue;
        val = el.value ?? "";
      } else {
        val = el.value ?? "";
      }
    } else if (tag === "select" || tag === "textarea") {
      val = el.value ?? "";
    }

    // Don’t duplicate Show Title / Show Date entries as IDs if they exist
    if (el.id === "showTitle" || el.id === "showDate") {
      // still fine to include, but keep it single-source to avoid confusion
      // (the label lines above already cover these)
      continue;
    }

    lines.push(`ID:${el.id},${csvEscape(val)}`);
  }

  return lines.join("\n") + "\n";
}

/**
 * Download the CSV to the user's machine.
 * Returns the CSV string so other code can reuse it if needed.
 */
export function downloadCSV() {
  const csvText = buildCSVString();

  const titlePart = sanitizeFilePart(getShowTitle()) || "Budget";
  const datePart =
    sanitizeFilePart(getShowDate()) ||
    new Date().toISOString().slice(0, 10);

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
 * Signature matches how your serverLoad.js calls it: loadCSV(csvText, regenerators, updateBudgetFn)
 */
export function loadCSV(csvText, regenerators = {}, updateBudgetFn = null) {
  const rows = parseCsvRows2col(csvText);
  if (!rows.length) return;

  // Map labels from older exports to IDs (keep as needed)
  const LABEL_TO_ID = {
    "Show Title": "showTitle",
    "Show Date": "showDate",
  };

  const kv = new Map();

  // First pass: build key/value map
  for (const [rawK, rawV] of rows) {
    if (!rawK) continue;

    // Skip version header line
    if (rawK === "XODIA_BUDGET_VERSION") continue;

    if (rawK.startsWith("ID:")) {
      kv.set(rawK.slice(3), rawV ?? "");
      continue;
    }

    // Backward-compatible label mapping
    const mappedId = LABEL_TO_ID[rawK];
    if (mappedId) {
      kv.set(mappedId, rawV ?? "");
      continue;
    }

    // If someone exported "id,value" without ID: prefix, still try to load it.
    kv.set(rawK, rawV ?? "");
  }

  // Second pass: apply count fields first (so we can regenerate dynamic inputs)
  for (const id of COUNT_FIELD_IDS) {
    if (!kv.has(id)) continue;
    const el = document.getElementById(id);
    if (el) el.value = kv.get(id);
  }

  // Trigger regenerators to rebuild dynamic UI
  // These are passed from main.js setupCSVImport() and from serverLoad.js loadBudgetFromServer()
  try {
    regenerators.headliners?.();
    regenerators.localDJs?.();
    regenerators.cdjs?.();
    regenerators.showRunners?.();
    regenerators.otherCategories?.();

    // otherItems may depend on how many categories exist
    const otherCount = Number(
      document.getElementById("numOtherCategories")?.value || 0
    );
    if (Number.isFinite(otherCount) && otherCount > 0) {
      for (let c = 1; c <= otherCount; c++) regenerators.otherItems?.(c);
    }

    regenerators.vendors?.();
  } catch (e) {
    console.error("Regenerator error during loadCSV:", e);
  }

  // Third pass: apply all values
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
        // radio groups: match by value
        const group = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`);
        for (const r of group) r.checked = r.value === value;
      } else {
        el.value = value ?? "";
      }
    } else if (tag === "select" || tag === "textarea") {
      el.value = value ?? "";
    }
  }

  // Ensure calculations/UI update
  try {
    if (typeof updateBudgetFn === "function") updateBudgetFn();
    else if (typeof window.updateBudget === "function") window.updateBudget();
  } catch (e) {
    console.error("updateBudget error after loadCSV:", e);
  }
}

/**
 * Wire up the "Import" flow.
 * main.js calls setupCSVImport(...) on DOMContentLoaded.
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
      // reset so selecting the same file again still triggers change
      input.value = "";
    }
  };
}

export function triggerImport() {
  const input = ensureFileInput();
  input.click();
}
