// server/server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend from ../client (repo layout)
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..', 'client');
const INDEX_FILE = process.env.INDEX_FILE || 'index.html';

app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, INDEX_FILE));
});

const BUDGETS_DIR = path.join(__dirname, 'budgets');

// Ensure budgets directory exists
fs.mkdir(BUDGETS_DIR, { recursive: true }).catch(() => {});

// ---------- helpers ----------
function sanitizeIdPart(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Legacy deterministic ID (used only when client doesn't send budgetId).
 * One file per (name + date).
 */
function buildBudgetIdFromNameDate(name, date) {
  const n = sanitizeIdPart(name) || 'untitled';
  const d = sanitizeIdPart(date) || 'nodate';
  return `${n}__${d}`;
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ---------- routes ----------

// GET all budgets (metadata list) — resilient to bad json files
app.get('/api/budgets', async (req, res) => {
  try {
    const files = await fs.readdir(BUDGETS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const budgets = [];
    for (const file of jsonFiles) {
      const fullPath = path.join(BUDGETS_DIR, file);
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(content);

        // minimal sanity check
        if (parsed && parsed.id && parsed.name && parsed.date) {
          budgets.push(parsed);
        } else {
          console.warn('Skipping malformed budget metadata:', fullPath);
        }
      } catch (e) {
        console.warn('Skipping unreadable/invalid JSON budget metadata:', fullPath, e.message);
      }
    }

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET specific budget (csv)
app.get('/api/budgets/:id', async (req, res) => {
  try {
    const csv = await fs.readFile(
      path.join(BUDGETS_DIR, `${req.params.id}.csv`),
      'utf8'
    );
    res.type('text/csv').send(csv);
  } catch (error) {
    res.status(404).json({ error: 'Budget not found' });
  }
});

// POST upsert budget (one file per budget)
app.post('/api/budgets', async (req, res) => {
  try {
    const { csv, name, date, budgetId } = req.body;

    if (typeof csv !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid csv string' });
    }

    const safeName = name || 'Untitled Budget';
    const safeDate = date || new Date().toISOString().split('T')[0];

    /**
     * If the client provides budgetId, it ALWAYS wins.
     * This is the core of "one file per budget" even if name/date change later.
     *
     * If not provided, we fall back to deterministic ID from name+date.
     */
    const id = (budgetId && sanitizeIdPart(budgetId)) || buildBudgetIdFromNameDate(safeName, safeDate);

    const csvPath = path.join(BUDGETS_DIR, `${id}.csv`);
    const metaPath = path.join(BUDGETS_DIR, `${id}.json`);

    const nowIso = new Date().toISOString();

    // Preserve createdAt if it already exists
    let createdAt = nowIso;
    if (await fileExists(metaPath)) {
      try {
        const existing = JSON.parse(await fs.readFile(metaPath, 'utf8'));
        if (existing && existing.createdAt) createdAt = existing.createdAt;
      } catch {
        // ignore parse errors and recreate metadata
      }
    }

    // Write/overwrite CSV
    await fs.writeFile(csvPath, csv, 'utf8');

    // Write/overwrite metadata
    const metadata = {
      id,
      name: safeName,
      date: safeDate,
      createdAt,
      updatedAt: nowIso
    };

    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    res.json({ id, message: 'Budget saved successfully (upsert)' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// DELETE budget
app.delete('/api/budgets/:id', async (req, res) => {
  try {
    await fs.unlink(path.join(BUDGETS_DIR, `${req.params.id}.csv`));
    await fs.unlink(path.join(BUDGETS_DIR, `${req.params.id}.json`));
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// SEARCH budgets
app.get('/api/budgets/search', async (req, res) => {
  try {
    const { name, dateFrom, dateTo } = req.query;

    const files = await fs.readdir(BUDGETS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const budgets = [];
    for (const file of jsonFiles) {
      const fullPath = path.join(BUDGETS_DIR, file);
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && parsed.id) budgets.push(parsed);
      } catch {
        // skip bad json
      }
    }

    let filtered = budgets;

    if (name) {
      const q = String(name).toLowerCase();
      filtered = filtered.filter(b => (b.name || '').toLowerCase().includes(q));
    }
    if (dateFrom) filtered = filtered.filter(b => b.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(b => b.date <= dateTo);

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving frontend from: ${FRONTEND_DIR}`);
});
