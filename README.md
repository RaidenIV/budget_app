# Budget App - Event Budget Tracker

A comprehensive budget tracking application for managing event expenses and revenue with cloud storage via MongoDB.

## Features

- 📊 **Real-time Budget Calculations** - Automatic calculation of expenses, revenue, and net profit
- 📈 **Visual Charts** - Interactive pie charts for expenses and revenue breakdown
- 💾 **Cloud Storage** - Save and load budgets from MongoDB database
- 📤 **Export Options** - Export budgets as CSV, text files, or chart images
- 🎯 **Category Tracking** - Track expenses across multiple categories:
  - Headliners (fees, hotel, rider)
  - Support acts and local DJs
  - Production (venue, LED wall, lights, lasers, VJ)
  - Gear rentals (CDJs, mixer, sound, tables)
  - Marketing (Facebook ads, Instagram ads, flyers)
  - Staff (door, merch table, show runners, transportation)
  - Custom categories
- 💰 **Revenue Tracking** - Track income from:
  - Eventbrite sales
  - DJ presales
  - Promo team
  - Door sales
  - Merch sales and vendors

## Project Structure

```
budget_app/
├── README.md
├── DEPLOYMENT_GUIDE.md
│
├── client/                      # Frontend application
│   ├── index.html              # Main HTML file
│   ├── css/
│   │   └── styles.css          # Application styles
│   └── js/
│       ├── main.js             # Main controller
│       ├── uiHandlers.js       # UI event handlers
│       └── modules/
│           ├── state.js        # State management
│           ├── utils.js        # Utility functions
│           ├── budgetCalculator.js  # Budget calculation logic
│           ├── charts.js       # Chart rendering (Chart.js)
│           ├── textPreview.js  # Text preview generation
│           ├── csv.js          # CSV import/export
│           ├── repeaters.js    # Dynamic form fields
│           └── serverLoad.js   # Server API calls
│
└── server/                      # Backend API
    ├── server.js               # Express + MongoDB server
    └── package.json            # Server dependencies
```

## Tech Stack

### Frontend
- **HTML5/CSS3** - Modern, responsive UI
- **Vanilla JavaScript** (ES6 modules) - No framework dependencies
- **Chart.js** - Interactive data visualization
- **Rajdhani Font** - Clean, modern typography

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web server framework
- **MongoDB** - Cloud database for budget storage
- **CORS** - Cross-origin resource sharing

## Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier) OR local MongoDB installation
- (Optional) Railway account for deployment

### 1. Set Up MongoDB

**Option A: MongoDB Atlas (Recommended - Free Cloud Database)**

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account and cluster
3. Click "Connect" on your cluster
4. Choose "Connect your application"
5. Copy the connection string:
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/budgets?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual database password
7. **Important**: In MongoDB Atlas, go to Network Access and add `0.0.0.0/0` to allow connections from anywhere (or add your specific IPs)

**Option B: Local MongoDB**

1. [Install MongoDB](https://docs.mongodb.com/manual/installation/) locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/budgets`

### 2. Run Backend Locally

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Set MongoDB connection string (replace with your actual connection string)
export MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/budgets"

# Start the server
npm start
```

The server will start on `http://localhost:3000`

### 3. Run Frontend Locally

```bash
# Navigate to client directory
cd client

# Option 1: Open index.html directly in your browser
# or

# Option 2: Use a simple HTTP server
python3 -m http.server 8000
# Then open http://localhost:8000 in your browser

# or use Node.js http-server
npx http-server -p 8000
```

The app will automatically connect to your local server at `http://localhost:3000`

## Deployment

### Deploy to Railway (Recommended)

Railway makes it easy to deploy both frontend and backend together.

#### Step 1: Prepare Your Repository

Make sure your repository has this structure:
```
budget_app/
├── client/
└── server/
```

#### Step 2: Deploy to Railway

1. Create account at [Railway](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repository
4. Railway will detect the Node.js app

#### Step 3: Configure Environment Variables

In your Railway project:
1. Go to the "Variables" tab
2. Add a new variable:
   - **Name**: `MONGODB_URI`
   - **Value**: Your MongoDB connection string
3. Add root directory (if needed):
   - **Name**: `ROOT_DIRECTORY`  
   - **Value**: `/server`

#### Step 4: Deploy

Railway will automatically:
- Install dependencies from `package.json`
- Start your server
- Provide a public URL like `https://your-app.up.railway.app`

#### Step 5: Serve Frontend (Optional - Deploy Together)

To serve frontend and backend together, modify `server/server.js`:

```javascript
// Add at the top
const path = require('path');

// Add after const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));
```

Then access your app at: `https://your-app.up.railway.app`

### Alternative: Separate Frontend Deployment

Deploy `client/` folder to any static hosting service:
- [Netlify](https://www.netlify.com/) - Drag and drop the client folder
- [Vercel](https://vercel.com/) - Connect GitHub repo, set root to `/client`
- [GitHub Pages](https://pages.github.com/) - Host from your repository

The frontend will automatically work with your Railway backend URL.

## Environment Variables

### Server

- `MONGODB_URI` - MongoDB connection string (**required**)
  - Example: `mongodb+srv://user:pass@cluster.mongodb.net/budgets`
- `PORT` - Server port (default: 3000)
  - Railway sets this automatically

### Client

No environment variables needed! The app automatically detects:
- Local development: Uses `http://localhost:3000`
- Deployed: Uses `window.location.origin`

## Usage

### Creating a Budget

1. Enter show title and date
2. Expand sections to add expenses:
   - Add headliners with fees, hotel, rider costs
   - Add support acts and local DJs
   - Enter production costs
   - Add gear rental fees
   - Set marketing budgets
   - Add staff costs
3. Enter revenue sources:
   - Ticket sales from Eventbrite
   - DJ presales
   - Door sales
   - Merch sales
4. View real-time calculations in the summary panel
5. Click "Save" to save to database

### Loading a Budget

1. Click the dropdown in "Load Previous Budget"
2. Select a budget from the list
3. Budget will load automatically

### Exporting Data

- **Export CSV** - Download as spreadsheet
- **Export .txt** - Download text summary
- **Download Charts** - Save charts as PNG image
- **Download All** - Get all three formats at once

## API Endpoints

### GET /
Health check endpoint
```json
{
  "status": "ok",
  "message": "Budget App Server is running",
  "storage": "MongoDB"
}
```

### GET /api/budgets
Get all budgets (without CSV data)
```json
[
  {
    "id": "1703175234567",
    "name": "Summer Festival 2024",
    "date": "2024-07-15",
    "createdAt": "2024-12-21T10:30:45.123Z"
  }
]
```

### GET /api/budgets/:id
Get specific budget (returns CSV data)

### POST /api/budgets
Save new budget
```json
{
  "csv": "csv data here",
  "name": "Event Name",
  "date": "2024-12-25"
}
```

### DELETE /api/budgets/:id
Delete a budget

## Troubleshooting

### "Cannot connect to MongoDB"
- ✅ Verify connection string is correct
- ✅ Check password is not wrapped in `<>` brackets
- ✅ Whitelist IP in MongoDB Atlas (use `0.0.0.0/0` for all IPs)
- ✅ Check network firewall settings

### "Module not found" errors
- ✅ Run `npm install` in server directory
- ✅ Verify all dependencies in package.json
- ✅ Delete `node_modules` and run `npm install` again

### Frontend can't connect to backend
- ✅ Check browser console for errors
- ✅ Verify server is running (should see "✅ Server running on port 3000")
- ✅ Check CORS is enabled (it is in the provided server.js)
- ✅ Verify `serverLoad.js` is using the updated version

### Charts not displaying
- ✅ Check browser console for Chart.js errors
- ✅ Verify Chart.js CDN is loading (check Network tab)
- ✅ Make sure you've entered some data in the form

### Budget not saving
- ✅ Check you've entered a show title
- ✅ Check server logs for errors
- ✅ Verify MongoDB connection is active
- ✅ Check browser console for API errors

## Development

### Local Development Workflow

```bash
# Terminal 1 - Backend
cd server
npm install
export MONGODB_URI="your-connection-string"
npm run dev  # Uses nodemon for auto-restart

# Terminal 2 - Frontend
cd client
python3 -m http.server 8000
```

### Adding New Features

1. **New expense category**: Edit `repeaters.js` and `budgetCalculator.js`
2. **New export format**: Add to `csv.js` or `textPreview.js`
3. **UI changes**: Modify `index.html` and `styles.css`
4. **API endpoints**: Add to `server/server.js`

## Browser Support

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

Requires JavaScript ES6 module support.

## License

This project is open source and available for personal and commercial use.

## Support

For deployment help, see `DEPLOYMENT_GUIDE.md`

For questions or issues:
1. Check the troubleshooting section above
2. Review Railway deployment logs
3. Check browser console for errors
4. Verify MongoDB connection

## Credits

Built with ❤️ for event budget management
- Chart visualization: Chart.js
- Icons: Unicode characters
- Font: Rajdhani (Google Fonts)
