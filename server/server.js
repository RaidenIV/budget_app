const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..'))); // Serve parent directory

const BUDGETS_DIR = path.join(__dirname, 'budgets');

// Ensure budgets directory exists
fs.mkdir(BUDGETS_DIR, { recursive: true });

// GET all budgets
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

// GET specific budget
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

// POST new budget
app.post('/api/budgets', async (req, res) => {
  try {
    const { csv, name, date } = req.body;
    const id = Date.now().toString();
    
    await fs.writeFile(
      path.join(BUDGETS_DIR, `${id}.csv`),
      csv,
      'utf8'
    );
    
    const metadata = { id, name, date, createdAt: new Date().toISOString() };
    await fs.writeFile(
      path.join(BUDGETS_DIR, `${id}.json`),
      JSON.stringify(metadata, null, 2),
      'utf8'
    );
    
    res.json({ id, message: 'Budget saved successfully' });
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
    let budgets = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async (file) => {
          const content = await fs.readFile(path.join(BUDGETS_DIR, file), 'utf8');
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
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});