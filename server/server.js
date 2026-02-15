const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Use timestamp + original filename to avoid collisions
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// IMPORTANT: Serve static files BEFORE other middleware
app.use(express.static(path.join(__dirname, '..', 'client')));

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

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

// GET all budgets WITH CSV data (for analytics)
app.get('/api/budgets/all-data', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const budgets = await db.collection('budgets')
      .find({})
      .toArray();
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets with data:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// GET specific budget CSV (accept custom id OR Mongo _id)
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

// GET specific budget's flyer
app.get('/api/budgets/:id/flyer', async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    const param = req.params.id;

    // Try custom id first
    let budget = await db.collection('budgets').findOne({ id: param });

    // Fallback to ObjectId
    if (!budget && ObjectId.isValid(param)) {
      budget = await db.collection('budgets').findOne({ _id: new ObjectId(param) });
    }

    if (!budget || !budget.flyerPath) {
      return res.status(404).json({ error: 'Flyer not found' });
    }

    const flyerFullPath = path.join(__dirname, budget.flyerPath);
    
    if (!fs.existsSync(flyerFullPath)) {
      return res.status(404).json({ error: 'Flyer file not found on disk' });
    }

    res.sendFile(flyerFullPath);
  } catch (error) {
    console.error('Error fetching flyer:', error);
    res.status(500).json({ error: 'Failed to fetch flyer' });
  }
});

// POST new budget with optional flyer upload
app.post('/api/budgets', upload.single('flyer'), async (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    
    const { csv, name, venueName, date } = req.body;

    if (!csv || !name || !date) {
      return res.status(400).json({ error: 'Missing required fields: csv, name, date' });
    }

    const id = Date.now().toString();
    const budget = {
      id,
      name,
      venueName: venueName || '',
      date,
      csv,
      createdAt: new Date().toISOString()
    };

    // Add flyer path if file was uploaded
    if (req.file) {
      budget.flyerPath = `uploads/${req.file.filename}`;
      budget.flyerOriginalName = req.file.originalname;
    }

    await db.collection('budgets').insertOne(budget);

    console.log(`✅ Budget saved: ${name} (${id})${req.file ? ' with flyer' : ''}`);
    res.json({ id, message: 'Budget saved successfully' });
  } catch (error) {
    console.error('❌ Save error:', error);
    
    // Clean up uploaded file if database save failed
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete orphaned file:', err);
      });
    }
    
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

    // Find the budget first to get flyer path
    let budget = await db.collection('budgets').findOne({ id: param });
    
    if (!budget && ObjectId.isValid(param)) {
      budget = await db.collection('budgets').findOne({ _id: new ObjectId(param) });
    }

    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    // Delete the flyer file if it exists
    if (budget.flyerPath) {
      const flyerFullPath = path.join(__dirname, budget.flyerPath);
      if (fs.existsSync(flyerFullPath)) {
        fs.unlinkSync(flyerFullPath);
        console.log(`🗑️  Deleted flyer: ${budget.flyerPath}`);
      }
    }

    // Delete from database
    let result = await db.collection('budgets').deleteOne({ id: param });

    if (result.deletedCount === 0 && ObjectId.isValid(param)) {
      result = await db.collection('budgets').deleteOne({ _id: new ObjectId(param) });
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
    console.log(`📁 Uploads directory: ${uploadsDir}`);
    if (dbConnected) {
      console.log('🗄️  MongoDB: Connected and ready');
    } else {
      console.log('❌ MongoDB: Not connected - check MONGODB_URI');
    }
  });
}

startServer();
