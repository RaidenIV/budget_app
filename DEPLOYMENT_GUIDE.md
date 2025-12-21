# Budget App - Railway Deployment Guide

## What Was Wrong

1. **railway.json had incorrect start command**: Said `node server.js` but your file is at `server/server.js`
2. **Hardcoded local IP**: Frontend was pointing to `http://192.168.1.217:3000` which only works on your local network
3. **Missing MongoDB setup**: Need to configure MongoDB Atlas or Railway's MongoDB

## Step-by-Step Deployment

### Part 1: Set Up MongoDB (Choose ONE option)

#### Option A: MongoDB Atlas (Recommended - Free Tier)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a free account and cluster
3. Click "Connect" on your cluster
4. Choose "Connect your application"
5. Copy the connection string (looks like):
   ```
   mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with your actual database password
7. Keep this connection string - you'll need it for Railway

#### Option B: Railway MongoDB Plugin

1. In your Railway project, click "New" → "Database" → "Add MongoDB"
2. Railway will automatically create a MongoDB instance
3. Click on the MongoDB service and copy the `MONGO_URL` variable
4. This will be your connection string

### Part 2: Deploy to Railway

1. **Go to Railway**: https://railway.app/
2. **Sign in** with GitHub
3. **Create New Project** → "Deploy from GitHub repo"
4. **Select your repository**: `RaidenIV/budget_app`
5. **Configure the service**:
   - Railway should auto-detect it's a Node.js app
   - Set the root directory to `/budget_app` if needed

6. **Add Environment Variable**:
   - Go to your service's "Variables" tab
   - Click "New Variable"
   - Name: `MONGODB_URI`
   - Value: Your MongoDB connection string from Part 1
   - Example: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/budgets?retryWrites=true&w=majority`

7. **Deploy**:
   - Railway will automatically deploy
   - Wait for deployment to complete (check the "Deployments" tab)
   - You'll get a public URL like: `https://your-app-name.up.railway.app`

### Part 3: Update Your Frontend Files

Replace these files in your repository:

1. **railway.json** - Use the fixed version I provided
2. **js/modules/serverLoad.js** - Use the updated version I provided

These changes make the app automatically use the correct API URL whether running locally or on Railway.

### Part 4: Test Your Deployment

1. Visit your Railway URL (e.g., `https://your-app-name.up.railway.app`)
2. You should see your budget app
3. Try saving a budget - it should now persist to MongoDB
4. Share the URL with someone not on your network - they should be able to access it!

## Testing Locally with MongoDB

If you want to test locally before deploying:

```bash
# Set environment variable (Windows CMD)
set MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/budgets

# Or (Windows PowerShell)
$env:MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/budgets"

# Or (Mac/Linux)
export MONGODB_URI="mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/budgets"

# Then start your server
npm start
```

## Troubleshooting

### "Cannot connect to MongoDB"
- Check your connection string is correct
- Make sure you replaced `<password>` with your actual password
- Verify your IP is whitelisted in MongoDB Atlas (set to 0.0.0.0/0 to allow all)

### "Module not found" errors on Railway
- Make sure all dependencies are in package.json
- Railway will run `npm install` automatically

### Frontend can't connect to backend
- Check the browser console for errors
- Verify the Railway deployment succeeded
- Make sure CORS is enabled in server.js (it is in your current code)

### "Budget not loading"
- Check Railway logs (click on your service → "Logs" tab)
- Verify data is actually in MongoDB (use MongoDB Atlas web interface)

## Next Steps

Once deployed successfully:
- Share your Railway URL with others
- Consider adding authentication for security
- Set up a custom domain (Railway supports this)
- Monitor your MongoDB storage usage (free tier has limits)

## Alternative: If you want BOTH Pi5 and Railway

You can:
1. Keep your Pi5 server running locally with MongoDB
2. Deploy to Railway for external access
3. Both will use the same MongoDB database
4. Just make sure both use the same `MONGODB_URI`
