// server/server.js - MongoDB Version for Railway
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve frontend from ../client
const FRONTEND_DIR = process.env.FRONTEND_DIR || path.join(__dirname, '..', 'client');
const INDEX_FILE = process.env.INDEX_FILE || 'index.html';

app.use(express.static(FRONTEND_DIR));
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, INDEX_FILE));
});

// MongoDB Connection
// Railway provides MONGO_URL, Atlas provides MONGODB_URI
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!MONGODB_URI) {
  console.error('❌ ERROR: No MongoDB connection string found!');
  console.error('   Looking for: MONGODB_URI or MONGO_URL');
  console.error('   Available variables:', Object.keys(process.env).filter(k => k.includes('MONGO')).join(', '));
  process.exit(1);
}

console.log('🔗 Connecting to MongoDB...');
console.log('   Using variable:', process.env.MONGO_URL ? 'MONGO_URL' : 'MONGODB_URI');

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB!');
  console.log(`   Database: ${mongoose.connection.db.databaseName}`);
  console.log(`   Host: ${mongoose.connection.host}`);
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  console.error('   Full error:', err);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Budget Schema
const budgetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  date: { type: String, required: true },
  csv: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for faster queries
budgetSchema.index({ name: 1, date: 1 });
budgetSchema.index({ updatedAt: -1 });

const Budget = mongoose.model('Budget', budgetSchema);

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

function buildBudgetIdFromNameDate(name, date) {
  const n = sanitizeIdPart(name) || 'untitled';
  const d = sanitizeIdPart(date) || 'nodate';
  return `${n}__${d}`;
}

// ---------- routes ----------

// Health check endpoint
app.get('/health', (req, res) => {
  const status = {
    status: 'healthy',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    database: mongoose.connection.db ? mongoose.connection.db.databaseName : 'unknown',
    timestamp: new Date().toISOString()
  };
  res.json(status);
});

// List budgets (metadata)
app.get('/api/budgets', async (req, res) => {
  try {
    console.log('[GET /api/budgets] Fetching budget list...');
    
    const budgets = await Budget.find({}, { csv: 0, __v: 0 })
      .sort({ updatedAt: -1 })
      .lean();
    
    console.log(`[GET /api/budgets] Returning ${budgets.length} budgets`);
    res.json(budgets);
  } catch (error) {
    console.error('[GET /api/budgets] Error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets', details: error.message });
  }
});

// Search budgets
app.get('/api/budgets/search', async (req, res) => {
  try {
    const { name, dateFrom, dateTo } = req.query;
    console.log(`[GET /api/budgets/search] Query:`, { name, dateFrom, dateTo });

    const filter = {};
    
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    if (dateFrom) {
      filter.date = { ...filter.date, $gte: dateFrom };
    }
    if (dateTo) {
      filter.date = { ...filter.date, $lte: dateTo };
    }

    const budgets = await Budget.find(filter, { csv: 0, __v: 0 })
      .sort({ updatedAt: -1 })
      .lean();

    console.log(`[GET /api/budgets/search] Returning ${budgets.length} results`);
    res.json(budgets);
  } catch (error) {
    console.error('[GET /api/budgets/search] Error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Load a budget CSV - comes after /search
app.get('/api/budgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[GET /api/budgets/${id}] Loading budget...`);
    
    const budget = await Budget.findOne({ id }).lean();
    
    if (!budget) {
      console.log(`[GET /api/budgets/${id}] Budget not found`);
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    console.log(`[GET /api/budgets/${id}] Successfully loaded ${budget.csv.length} bytes`);
    res.type('text/csv').send(budget.csv);
  } catch (error) {
    console.error(`[GET /api/budgets/${req.params.id}] Error:`, error);
    res.status(500).json({ error: 'Failed to load budget', details: error.message });
  }
});

// Save (UPSERT)
app.post('/api/budgets', async (req, res) => {
  try {
    const { csv, name, date, budgetId } = req.body;

    if (typeof csv !== 'string') {
      console.error('[POST /api/budgets] Missing or invalid csv string');
      return res.status(400).json({ error: 'Missing or invalid csv string' });
    }

    const safeName = name || 'Untitled Budget';
    const safeDate = date || new Date().toISOString().split('T')[0];

    // If client provides an ID, always use it (one-document-per-budget)
    const incomingId = budgetId ? sanitizeIdPart(budgetId) : '';
    const id = incomingId || buildBudgetIdFromNameDate(safeName, safeDate);

    console.log(`[POST /api/budgets] Saving budget "${safeName}" with id: ${id}`);

    // Use findOneAndUpdate with upsert for atomic operation
    const result = await Budget.findOneAndUpdate(
      { id },
      {
        $set: {
          name: safeName,
          date: safeDate,
          csv,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    console.log(`[POST /api/budgets] ${isNew ? 'Created' : 'Updated'} budget ${id}`);
    
    res.json({ 
      id, 
      message: `Budget ${isNew ? 'created' : 'updated'} successfully`,
      isNew 
    });
  } catch (error) {
    console.error('[POST /api/budgets] Error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Budget ID already exists', details: error.message });
    }
    
    res.status(500).json({ error: 'Failed to save budget', details: error.message });
  }
});

// Delete
app.delete('/api/budgets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE /api/budgets/${id}] Deleting budget...`);
    
    const result = await Budget.deleteOne({ id });
    
    if (result.deletedCount === 0) {
      console.log(`[DELETE /api/budgets/${id}] Budget not found`);
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    console.log(`[DELETE /api/budgets/${id}] Successfully deleted`);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error(`[DELETE /api/budgets/${req.params.id}] Error:`, error);
    res.status(500).json({ error: 'Failed to delete budget', details: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('========================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Frontend directory: ${FRONTEND_DIR}`);
  console.log(`✅ MongoDB: ${mongoose.connection.readyState === 1 ? 'CONNECTED' : 'Connecting...'}`);
  console.log('========================================');
  console.log('✅ Ready to accept requests');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing server...');
  await mongoose.connection.close();
  process.exit(0);
});
