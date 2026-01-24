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

// fallback deterministic ID (only used if client doesn't send budgetId)
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
// IMPORTANT: Specific routes MUST come before parameterized routes!

// list budgets (metadata)
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
        if (parsed && parsed.id && parsed.name && parsed.date) {
          budgets.push(parsed);
        }
      } catch (err) {
        console.warn(`Skipping invalid JSON file: ${file}`, err.message);
      }
    }

    console.log(`[GET /api/budgets] Returning ${budgets.length} budgets`);
    res.json(budgets);
  } catch (error) {
    console.error('[GET /api/budgets] Error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// search budgets - MUST come BEFORE /api/budgets/:id
app.get('/api/budgets/search', async (req, res) => {
  try {
    const { name, dateFrom, dateTo } = req.query;
    console.log(`[GET /api/budgets/search] Query:`, { name, dateFrom, dateTo });

    const files = await fs.readdir(BUDGETS_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const budgets = [];
    for (const file of jsonFiles) {
      const fullPath = path.join(BUDGETS_DIR, file);
      try {
        const content = await fs.readFile(fullPath, 'utf8');
        const parsed = JSON.parse(content);
        if (parsed && parsed.id) budgets.push(parsed);
      } catch (err) {
        console.warn(`Skipping invalid JSON file: ${file}`, err.message);
      }
    }

    let filtered = budgets;

    if (name) {
      const q = String(name).toLowerCase();
      filtered = filtered.filter(b => (b.name || '').toLowerCase().includes(q));
    }
    if (dateFrom) filtered = filtered.filter(b => b.date >= dateFrom);
    if (dateTo) filtered = filtered.filter(b => b.date <= dateTo);

    console.log(`[GET /api/budgets/search] Returning ${filtered.length} results`);
    res.json(filtered);
  } catch (error) {
    console.error('[GET /api/budgets/search] Error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// load a budget csv - NOW comes after /search
app.get('/api/budgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[GET /api/budgets/${id}] Loading budget...`);
    
    const csvPath = path.join(BUDGETS_DIR, `${id}.csv`);
    const csv = await fs.readFile(csvPath, 'utf8');
    
    console.log(`[GET /api/budgets/${id}] Successfully loaded ${csv.length} bytes`);
    res.type('text/csv').send(csv);
  } catch (error) {
    console.error(`[GET /api/budgets/${req.params.id}] Error:`, error.message);
    res.status(404).json({ error: 'Budget not found' });
  }
});

// save (UPSERT)
app.post('/api/budgets', async (req, res) => {
  try {
    const { csv, name, date, budgetId } = req.body;

    if (typeof csv !== 'string') {
      console.error('[POST /api/budgets] Missing or invalid csv string');
      return res.status(400).json({ error: 'Missing or invalid csv string' });
    }

    const safeName = name || 'Untitled Budget';
    const safeDate = date || new Date().toISOString().split('T')[0];

    // If client provides an ID, always use it (one-file-per-budget)
    const incomingId = budgetId ? sanitizeIdPart(budgetId) : '';
    const id = incomingId || buildBudgetIdFromNameDate(safeName, safeDate);

    console.log(`[POST /api/budgets] Saving budget "${safeName}" with id: ${id}`);

    const csvPath = path.join(BUDGETS_DIR, `${id}.csv`);
    const metaPath = path.join(BUDGETS_DIR, `${id}.json`);

    const nowIso = new Date().toISOString();

    // Preserve createdAt if already exists
    let createdAt = nowIso;
    if (await fileExists(metaPath)) {
      try {
        const existing = JSON.parse(await fs.readFile(metaPath, 'utf8'));
        if (existing && existing.createdAt) {
          createdAt = existing.createdAt;
          console.log(`[POST /api/budgets] Updating existing budget (created: ${createdAt})`);
        }
      } catch (err) {
        console.warn('[POST /api/budgets] Could not parse existing metadata:', err.message);
      }
    } else {
      console.log(`[POST /api/budgets] Creating new budget`);
    }

    await fs.writeFile(csvPath, csv, 'utf8');

    const metadata = {
      id,
      name: safeName,
      date: safeDate,
      createdAt,
      updatedAt: nowIso
    };

    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    console.log(`[POST /api/budgets] Successfully saved budget ${id}`);
    res.json({ id, message: 'Budget saved successfully (upsert)' });
  } catch (error) {
    console.error('[POST /api/budgets] Error:', error);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// delete
app.delete('/api/budgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /api/budgets/${id}] Deleting budget...`);
    
    const csvPath = path.join(BUDGETS_DIR, `${id}.csv`);
    const metaPath = path.join(BUDGETS_DIR, `${id}.json`);
    
    await fs.unlink(csvPath);
    await fs.unlink(metaPath);
    
    console.log(`[DELETE /api/budgets/${id}] Successfully deleted`);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error(`[DELETE /api/budgets/${req.params.id}] Error:`, error.message);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ Serving frontend from: ${FRONTEND_DIR}`);
  console.log(`✓ Budgets stored in: ${BUDGETS_DIR}`);
  console.log(`✓ Ready to accept requests`);
});
