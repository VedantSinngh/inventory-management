# Deployment Guide - Render & Railway

Your Inventory Management System is ready for production deployment. This guide covers deploying to Render (where you are now) and Railway.

**GitHub Repository:** `https://github.com/VedantSinngh/inventory-management`  
**Current Status:** ✅ Code pushed, ready to deploy

---

## Quick Decision: Which Platform?

| Feature | Render | Railway | Vercel | Heroku |
|---------|--------|---------|--------|--------|
| **Free Tier** | ✅ Yes (limited) | ✅ Yes ($5/mo) | ✅ Yes | ❌ No |
| **Socket.IO** | ✅ Yes | ✅ Yes | ❌ No | ✅ Yes |
| **MongoDB** | ⚠️ External | ✅ Built-in | N/A | ⚠️ External |
| **Ease** | ⭐⭐⭐ | ⭐⭐⭐⭐ | N/A | ⭐⭐⭐ |
| **Cost** | Low | Lowest | N/A | Medium |

**Recommendation:** **Railway** (easiest) or **Render** (what you're using)

---

## Option 1: Deploy on Render (You're Here!)

### Step 1: Prepare Backend Deployment

#### 1.1 Check Backend Dockerfile
```bash
cat backend/Dockerfile
```

Should look like:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 5000
CMD ["node", "server.js"]
```

#### 1.2 Update Root Dockerfile (for monorepo)
Create `Dockerfile` in root directory:

```dockerfile
# Build backend from backend/Dockerfile
FROM node:18-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .

# Final stage
FROM node:18-alpine
WORKDIR /app
COPY --from=backend-builder /app .
EXPOSE 5000
CMD ["node", "server.js"]
```

### Step 2: Configure Render Backend Service

On the Render page you're viewing:

**Fill in these fields:**

```
Name:                    inventory-management-backend
Language:                Docker
Branch:                  main
Region:                  Singapore (or closest to you)
Dockerfile Path:         ./backend/Dockerfile
Root Directory:          ./backend
Instance Type:           Free (or Starter if you can pay)
```

### Step 3: Add Environment Variables

Click "Add Environment Variable" and add these:

```
NODE_ENV                 production
JWT_SECRET               [Generate 32-char random string]
MONGO_URI                [Your MongoDB Atlas URI]
CORS_ORIGIN              [Your frontend URL - add later]
SOCKET_IO_CORS_ORIGIN    [Same as CORS_ORIGIN]
PORT                     5000
LOG_LEVEL                info
```

**How to get MONGO_URI:**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free cluster
3. Copy connection string: `mongodb+srv://username:password@cluster.mongodb.net/inventory`

**How to generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 4: Deploy Backend

Click **"Deploy Web Service"** button

**Wait for:** ~3-5 minutes
- ✅ Install dependencies
- ✅ Build Docker image
- ✅ Start service
- ✅ Health check

**After deployment:**
- You'll get a URL like: `https://inventory-management-backend.onrender.com`
- Save this URL - you need it for frontend

### Step 5: Verify Backend

```bash
# Test health endpoint
curl https://[your-backend-url]/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-06-16T10:30:00Z"
}
```

---

## Option 1b: Deploy Frontend on Render

### Step 1: Create Frontend Service

In Render Dashboard:
1. Click "New +"
2. Select "Web Service"
3. Connect to same GitHub repository

**Fill in these fields:**

```
Name:                    inventory-management-frontend
Language:                Docker
Branch:                  main
Region:                  Singapore
Dockerfile Path:         ./frontend/Dockerfile
Root Directory:          ./frontend
Instance Type:           Free
```

### Step 2: Add Environment Variables

```
VITE_API_URL             https://[your-backend-url]/api
VITE_SOCKET_URL          https://[your-backend-url]
VITE_ENV                 production
```

### Step 3: Update Backend CORS

Go back to Backend service settings:

1. Click "Environment"
2. Update: `CORS_ORIGIN=https://[your-frontend-url]`
3. Update: `SOCKET_IO_CORS_ORIGIN=https://[your-frontend-url]`
4. Save (auto-redeploy)

### Step 4: Deploy Frontend

Click **"Deploy Web Service"** button

Wait for ~2-3 minutes

---

## Option 2: Deploy on Railway (Recommended for Simplicity)

Railway is easier and has better support for monorepo apps.

### Step 1: Connect to Railway

1. Go to https://railway.app
2. Login with GitHub
3. Click "Create New Project"
4. Select "Deploy from GitHub repo"
5. Choose `VedantSinngh/inventory-management`

### Step 2: Configure Services

Railway will auto-detect services. Create two:

#### Backend Service
```
Name:              backend
Dockerfile:        backend/Dockerfile
Build context:     .
Root directory:    backend
Memory:            512 MB
```

#### Frontend Service
```
Name:              frontend
Dockerfile:        frontend/Dockerfile
Build context:     .
Root directory:    frontend
Memory:            256 MB
```

### Step 3: Add MongoDB

1. Click "Add Service"
2. Select "Marketplace"
3. Choose "MongoDB"
4. Create instance (free tier available)

### Step 4: Configure Environment Variables

#### Backend Variables
```
NODE_ENV           production
JWT_SECRET         [32-char random string]
MONGO_URI          [From MongoDB service]
PORT               5000
```

#### Frontend Variables
```
VITE_API_URL       https://[backend-railway-url]/api
VITE_SOCKET_URL    https://[backend-railway-url]
```

### Step 5: Deploy

Railway auto-deploys on push to main branch!

---

## Complete Deployment Checklist

Before going live:

### Pre-Deployment
- [ ] GitHub repository is public and up to date
- [ ] Dockerfiles exist in backend/ and frontend/
- [ ] Environment variables documented
- [ ] MongoDB Atlas account created
- [ ] Backend .env.example reviewed

### During Deployment
- [ ] Backend service deploys successfully
- [ ] Frontend service deploys successfully
- [ ] Environment variables are set correctly
- [ ] CORS origins match deployment URLs

### Post-Deployment
- [ ] Backend health check passes: `/api/health`
- [ ] Frontend loads without errors
- [ ] Can login with test credentials
- [ ] WebSocket connection works
- [ ] Database operations work (create/read/update/delete)

### Final Steps
- [ ] Update CORS_ORIGIN in backend
- [ ] Update frontend environment variables
- [ ] Redeploy after changes
- [ ] Test end-to-end flow

---

## Environment Variables Reference

### Backend (.env)

**Required:**
```
NODE_ENV=production
JWT_SECRET=your-super-secret-32-char-string
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/inventory
PORT=5000
```

**Optional:**
```
CORS_ORIGIN=https://your-frontend.com
SOCKET_IO_CORS_ORIGIN=https://your-frontend.com
LOG_LEVEL=info
```

### Frontend (.env)

**Required:**
```
VITE_API_URL=https://your-backend.com/api
VITE_SOCKET_URL=https://your-backend.com
```

---

## Testing Deployment

After both services are running:

### 1. Test Backend
```bash
# Health check
curl https://[backend-url]/api/health

# Login
curl -X POST https://[backend-url]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.core","password":"admin123"}'

# Expected: { "token": "...", "user": { ... } }
```

### 2. Test Frontend
1. Open: `https://[frontend-url]`
2. Should see login page
3. Try logging in with test credentials:
   - Email: `admin@system.core`
   - Password: `admin123`

### 3. Test WebSocket
Open browser DevTools (F12) and check:
- Network > WS (WebSocket)
- Should see connection to your backend

---

## Troubleshooting

### Issue: Build fails - "Dockerfile not found"
**Solution:**
```bash
# Verify Dockerfile exists
ls backend/Dockerfile
ls frontend/Dockerfile

# Check path is correct in deployment settings
# Should be: ./backend/Dockerfile and ./frontend/Dockerfile
```

### Issue: Backend can't connect to MongoDB
**Solution:**
1. Verify MONGO_URI is correct
2. Check MongoDB Atlas IP whitelist includes your server IP
3. Or allow access from anywhere (⚠️ less secure)

### Issue: Frontend shows blank page
**Solution:**
1. Check browser console (F12)
2. Verify VITE_API_URL is correct
3. Check CORS is configured on backend
4. Verify WebSocket URL is correct

### Issue: "CORS error" when making requests
**Solution:**
1. Go to Backend service settings
2. Update CORS_ORIGIN to exact frontend URL
3. Save and redeploy
4. Wait 5 minutes for changes

### Issue: Login doesn't work
**Solution:**
1. Seed database first: `npm run seed` (if available)
2. Or create user manually through API
3. Check JWT_SECRET is set correctly

---

## Production Best Practices

### 1. Security
- ✅ Use strong JWT_SECRET (32+ characters)
- ✅ Enable CORS for your domain only
- ✅ Use HTTPS (automatic on Render/Railway)
- ✅ Set NODE_ENV=production
- ✅ Don't commit .env files

### 2. Database
- ✅ Use MongoDB Atlas with strong password
- ✅ Enable backups
- ✅ Restrict IP access if possible
- ✅ Use separate database for production

### 3. Monitoring
- ✅ Monitor error logs regularly
- ✅ Set up alerts for failures
- ✅ Track API response times
- ✅ Monitor database query performance

### 4. Scaling
- ✅ Start with Free/Starter tier
- ✅ Upgrade to Standard if needed
- ✅ Add database connection pooling
- ✅ Consider Redis for caching

---

## Deployment Comparison

### Render
```
Pros:
✅ Free tier available
✅ Easy GitHub integration
✅ Supports Socket.IO
✅ Good documentation

Cons:
❌ Spins down after 15 min inactivity
❌ Cold start delay
```

### Railway
```
Pros:
✅ Simple interface
✅ Built-in MongoDB support
✅ $5/month free credit
✅ No cold starts on paid tier

Cons:
❌ $5/month minimum (paid tier)
```

---

## Deploy Today in 5 Steps

1. **Prepare MongoDB**
   - Create free cluster at https://www.mongodb.com/cloud/atlas
   - Get connection string

2. **Deploy Backend**
   - Service: inventory-management-backend
   - Dockerfile: ./backend/Dockerfile
   - Add MONGO_URI environment variable

3. **Get Backend URL**
   - From deployment dashboard
   - Copy URL from service details

4. **Deploy Frontend**
   - Service: inventory-management-frontend
   - Dockerfile: ./frontend/Dockerfile
   - Add VITE_API_URL environment variable

5. **Test**
   - Visit frontend URL
   - Login with admin@system.core / admin123
   - Check WebSocket connection

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **Railway Docs:** https://railway.app/docs
- **MongoDB Atlas:** https://www.mongodb.com/docs/atlas/
- **Your GitHub:** https://github.com/VedantSinngh/inventory-management

---

## Next Steps

After deployment:

1. ✅ Share your frontend URL with users
2. ✅ Monitor logs for errors
3. ✅ Test all features
4. ✅ Set up backups
5. ✅ Consider custom domain

**Your system is production-ready! 🚀**
