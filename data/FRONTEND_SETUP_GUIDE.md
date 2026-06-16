# 🚀 Frontend Setup & Troubleshooting Guide

## Quick Start

### Step 1: Install Dependencies
```bash
cd frontend
npm install
```

### Step 2: Configure Environment
Make sure `frontend/.env` has correct values:
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### Step 3: Start Backend First
```bash
cd backend
npm install
npm start  # or npm run dev
```

Backend should be running on `http://localhost:5000`

### Step 4: Start Frontend
```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## Common Issues & Solutions

### Issue 1: Blank White Page
**Cause**: JavaScript is failing to load or React isn't rendering

**Solutions**:
1. Open browser DevTools (F12) → Console tab
2. Check for any red errors
3. Verify backend is running: `curl http://localhost:5000/api/health`
4. Clear cache: `Ctrl+Shift+Delete` (or Cmd+Shift+Delete)
5. Hard refresh: `Ctrl+Shift+R` (or Cmd+Shift+R)

### Issue 2: "Cannot GET /api/..."
**Cause**: Frontend can't reach backend API

**Solutions**:
1. Start backend: `cd backend && npm start`
2. Check backend runs on port 5000
3. Verify `.env` has `VITE_API_URL=http://localhost:5000/api`
4. Check CORS settings in `backend/server.js`

### Issue 3: Login page loads but can't login
**Cause**: API is not accessible or returns errors

**Solutions**:
1. Check DevTools Network tab for failed requests
2. Verify backend is running
3. Check MongoDB is running
4. Look at backend logs for errors

### Issue 4: Charts don't display
**Cause**: Chart.js not properly imported or data is empty

**Solutions**:
1. Check browser console for errors
2. Verify `npm install chart.js react-chartjs-2` was run
3. Data will be empty until you create products/orders
4. Try creating test data first

### Issue 5: "Loading..." spinner never completes
**Cause**: Data fetch is hanging or failing silently

**Solutions**:
1. Open DevTools Console
2. Look for messages like "InventoryContext: Fetching products from..."
3. If you see auth errors, make sure you're logged in
4. Check backend API endpoints are working

---

## Development Commands

### Frontend
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Backend
```bash
# Development with nodemon
npm run dev

# Production start
npm start

# Check health
curl http://localhost:5000/api/health
```

---

## Debugging Tips

### 1. Check Browser Console (F12 → Console)
Look for errors with "InventoryContext" or "AuthContext" prefixes - they have detailed logging.

### 2. Check Network Requests (F12 → Network)
- Look for failed API calls (red)
- Check response status codes
- Verify headers have `Authorization: Bearer <token>`

### 3. Backend Logs
Backend console shows:
- Database connections
- Request logging
- Errors with full stack traces

### 4. Test API Directly
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Try login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

---

## Environment Setup

### Backend `.env`
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/inventorySystem
JWT_SECRET=dev-secret-key-min-32-chars-1234567890abcdef
CORS_ORIGIN=http://localhost:5173
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
SENDGRID_API_KEY=test-key
SENDGRID_FROM_EMAIL=noreply@localhost
FRONTEND_URL=http://localhost:5173
```

### Frontend `.env`
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 5173 | http://localhost:5173 |
| Backend API | 5000 | http://localhost:5000 |
| MongoDB | 27017 | mongodb://localhost:27017 |

---

## Database Setup (MongoDB)

### Mac (Homebrew)
```bash
brew install mongodb-community
brew services start mongodb-community
```

### Windows
- Download from: https://www.mongodb.com/try/download/community
- Or use: `choco install mongodb` (via Chocolatey)

### Docker
```bash
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Test Connection
```bash
mongosh  # or mongo for older versions
```

---

## First Time Setup Checklist

- [ ] MongoDB is running
- [ ] Backend `.env` is configured correctly
- [ ] Frontend `.env` is configured correctly
- [ ] Backend dependencies installed: `cd backend && npm install`
- [ ] Frontend dependencies installed: `cd frontend && npm install`
- [ ] Backend starts without errors: `npm start`
- [ ] Frontend starts without errors: `npm run dev`
- [ ] Can access: http://localhost:5173
- [ ] Login works with test credentials
- [ ] Dashboard displays without errors
- [ ] Charts render properly

---

## Test Credentials

After first database setup, use:
```
Email: admin@test.com
Password: Admin@123456
```

---

## Still Having Issues?

1. Check all 3 services are running:
   - MongoDB: `mongosh` command works
   - Backend: No errors in logs
   - Frontend: Shows in browser

2. Look at detailed logs:
   - Browser Console (F12)
   - Backend terminal output
   - MongoDB logs

3. Try clearing everything:
   - Clear browser cache (Ctrl+Shift+Delete)
   - Delete `node_modules` and reinstall
   - Reset database (careful with data!)

---
