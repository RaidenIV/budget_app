const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');

const app = express();

// IMPORTANT: Serve static files BEFORE other middleware
app.use(express.static(path.join(__dirname, '..', 'client')));

app.use(cors({
  origin: '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// MongoDB connection
let db;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/budgets';

console.log('🔍 Checking MongoDB URI...');
console.log('MONGODB_URI is set:', !!process.env.MONGODB_URI);
if (!process.env.MONGODB_URI) {
  console.warn('⚠️  WARNING: MONGODB_URI environment variable is not set! Using fallback.');
}

async function connectDB() {
  try {
    console.log('🔌 Attempting to connect to MongoDB...');
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db();
    console.log('✅ Connected to MongoDB successfully!');
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:');
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    return false;
  }
}

// API Routes - these must come AFTER static files

// Health check
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Budget App Server is running',
    storage: db ? 'MongoDB (Connected)' : 'MongoDB (Not Connected)',
    mongoConfigured: !!process.env.MONGODB_URI
  });
});

// GET all budgets
app.get('/api/budgets', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const budgets = await db.collection('budgets')
      .find({}, { projection: { csv: 0 } })
      .toArray();
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET specific budget (accept custom id OR Mongo _id)
app.get('/api/budgets/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const param = req.params.id;

    // 1) Try your custom "id" field first
    let budget = await db.collection('budgets').findOne({ id: param });

    // 2) If not found and it looks like an ObjectId, try Mongo _id
    if (!budget && ObjectId.isValid(param)) {
      budget = await db.collection('budgets').findOne({ _id: new ObjectId(param) });
    }

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.type('text/csv').send(budget.csv);
  } catch (error) {
    console.error('Error fetching budget:', error);
    res.status(500).json({ error: 'Failed to fetch budget' });
  }
});

// POST new budget
app.post('/api/budgets', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const { csv, name, date } = req.body;

    if (!csv || !name || !date) {
      return res.status(400).json({ error: 'Missing required fields: csv, name, date' });
    }

    const id = Date.now().toString();
    const budget = {
      id,
      name,
      date,
      csv,
      createdAt: new Date().toISOString()
    };

    await db.collection('budgets').insertOne(budget);

    console.log(`✅ Budget saved: ${name} (${id})`);
    res.json({ id, message: 'Budget saved successfully' });
  } catch (error) {
    console.error('❌ Save error:', error);
    res.status(500).json({ error: 'Failed to save budget' });
  }
});

// DELETE budget (accept custom id OR Mongo _id)
app.delete('/api/budgets/:id', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const param = req.params.id;

    // Prefer deleting by custom id; fallback to _id if needed
    let result = await db.collection('budgets').deleteOne({ id: param });

    if (result.deletedCount === 0 && ObjectId.isValid(param)) {
      result = await db.collection('budgets').deleteOne({ _id: new ObjectId(param) });
    }

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    console.log(`🗑️  Budget deleted: ${param}`);
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

const PORT = process.env.PORT || 3000;

// Start server
async function startServer() {
  console.log('🚀 Starting Budget App Server...');

  // Try to connect to MongoDB
  const dbConnected = await connectDB();

  if (!dbConnected) {
    console.warn('⚠️  Server starting WITHOUT database connection');
    console.warn('⚠️  API endpoints will return 503 errors until DB is connected');
  }

  // Start server regardless of DB connection
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend: http://localhost:${PORT}/`);
    if (dbConnected) {
      console.log('🗄️  MongoDB: Connected and ready');
    } else {
      console.log('❌ MongoDB: Not connected - check MONGODB_URI');
    }
  });
}

startServer();
