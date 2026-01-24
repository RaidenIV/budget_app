const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..')));

const BUDGETS_DIR = path.join(__dirname, 'budgets');
fs.mkdir(BUDGETS_DIR, { recursive: true });

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

// list budgets
app.get('/api/budgets', async (req, res) => {
  try {
    const files = await fs.readdir(BUDGETS_DIR);
    const budgets = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const content = await fs.readFile(path.join(BUDGETS_DIR, f), 'utf8');
          return JSON.parse(content);
        })
    );
    res.json(budgets);
  } catch {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// load csv
app.get('/api/budgets/:id', async (req, res) => {
  try {
    const csv = await fs.readFile(
      path.join(BUDGETS_DIR, `${req.params.id}.csv`),
      'utf8'
    );
    res.type('text/csv').send(csv);
  } catch {
    res.status(404).json({ error: 'Budget not found' });
  }
});

// save (UPSERT)
app.post('/api/budgets', async (req, res) => {
  try {
    const { csv, name, date } = req.body;

    const safeName = name || 'Untitled Budget';
    const safeDate = date || new Date().toISOString().split('T')[0];

    const id = buildBudgetId(safeName, safeDate);

    const csvPath = path.join(BUDGETS_DIR, `${id}.csv`);
    const metaPath = path.join(BUDGETS_DIR, `${id}.json`);

    const now = new Date().toISOString();
    let createdAt = now;

    if (await fileExists(metaPath)) {
      const existing = JSON.parse(await fs.readFile(metaPath, 'utf8'));
      if (existing.createdAt) createdAt = existing.createdAt;
    }

    await fs.writeFile(csvPath, csv, 'utf8');

    const metadata = {
      id,
      name: safeName,
      date: safeDate,
      createdAt,
      updatedAt: now
    };

    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    res.json({ id, message: 'Budget saved (overwritten if existing)' });
  } catch {
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// delete
app.delete('/api/budgets/:id', async (req, res) => {
  try {
    await fs.unlink(path.join(BUDGETS_DIR, `${req.params.id}.csv`));
    await fs.unlink(path.join(BUDGETS_DIR, `${req.params.id}.json`));
    res.json({ message: 'Budget deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// search
app.get('/api/budgets/search', async (req, res) => {
  try {
    const { name, dateFrom, dateTo } = req.query;

    const files = await fs.readdir(BUDGETS_DIR);
    let budgets = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const content = await fs.readFile(path.join(BUDGETS_DIR, f), 'utf8');
          return JSON.parse(content);
        })
    );

    if (name) {
      budgets = budgets.filter(b =>
        b.name.toLowerCase().includes(name.toLowerCase())
      );
    }
    if (dateFrom) budgets = budgets.filter(b => b.date >= dateFrom);
    if (dateTo) budgets = budgets.filter(b => b.date <= dateTo);

    res.json(budgets);
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
