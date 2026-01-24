// server/server.js
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

/**
 * FRONTEND SERVING (matches your repo structure)
 * Repo layout:
 *   budget_app/
 *     client/index.html
 *     server/server.js
 *
 * So from /server, the frontend is ../client
 */
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..', 'client');
const INDEX_FILE = process.env.INDEX_FILE || 'index.html';

app.use(express.static(FRONTEND_DIR));

// Fixes GET / (prevents "Cannot GET /" / "Not found")
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
 * Stable ID per budget:
 * One file per (name + date) combination.
 * Save again with same name/date => overwrite same files.
 */
function buildBudgetId(name, date) {
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

// GET all budgets (metadata list)
app.get('/api/budgets', async (req, res) => {
  try {
    const files = await fs.readdir(BUDGETS_DIR);
    const budgets = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(BUDGETS_DIR, file), 'utf8');
          return JSON.parse(content);
        })
    );
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET specific budget CSV by ID
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

// POST upsert budget (overwrite instead of creating a new file each time)
app.post('/api/budgets', async (req, res) => {
  try {
    const { csv, name, date } = req.body;

    if (typeof csv !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid csv string' });
    }

    const safeName = name || 'Untitled Budget';
    const safeDate = date || new Date().toISOString().split('T')[0];

    // Stable ID per budget
    const id = buildBudgetId(safeName, safeDate);

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

// DELETE budget (csv + json)
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
    let budgets = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(BUDGETS_DIR, file), 'utf8');
          return JSON.parse(content);
        })
    );

    if (name) {
      const q = String(name).toLowerCase();
      budgets = budgets.filter(b => (b.name || '').toLowerCase().includes(q));
    }

    if (dateFrom) budgets = budgets.filter(b => b.date >= dateFrom);
    if (dateTo) budgets = budgets.filter(b => b.date <= dateTo);

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Serving frontend from: ${FRONTEND_DIR}`);
  console.log(`Index file: ${INDEX_FILE}`);
});
