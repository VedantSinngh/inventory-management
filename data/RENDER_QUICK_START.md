# Render Deployment - Complete Flow

Your project is ready to deploy on Render. Here's exactly what to fill in the form you're looking at.

---

## Your Current Render Form

You're on the "New Web Service" page. Follow these exact steps:

### Step 1: Service Details (Top Section)

```
Name:                   inventory-management-backend
Language:               Docker
Branch:                 main
Region:                 Singapore (Southeast Asia) ✓ Already selected
Root Directory:         backend
Dockerfile Path:        ./Dockerfile
```

**Why these values?**
- Backend service handles API requests
- `main` branch is your production code
- Root directory tells Render where backend code is
- Dockerfile already exists in backend/

---

## Step 2: Instance Type

For a hobby/resume project, select:

```
⭕ Free ($0/month)
   512 MB RAM
   0.1 CPU
```

**If you want better performance:**
```
⭕ Starter ($7/month)
   512 MB RAM
   0.5 CPU
```

---

## Step 3: Environment Variables

Click **"Add Environment Variable"** for each:

### Variable 1: Node Environment
```
NAME:  NODE_ENV
VALUE: production
```

### Variable 2: JWT Secret (Generate this!)
Open terminal and run:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output, then add:
```
NAME:  JWT_SECRET
VALUE: [paste the long string you just generated]
```

### Variable 3: MongoDB URI

First, create a free MongoDB:
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Create Free Account"
3. Create a new project
4. Click "Build a Cluster" (free tier)
5. Create database user
6. Whitelist IP: Add 0.0.0.0/0 (allow all - for now)
7. Click "Connect" and copy the connection string

Should look like: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/inventory?retryWrites=true&w=majority`

Then add:
```
NAME:  MONGO_URI
VALUE: [paste your MongoDB connection string]
```

### Variable 4: Port
```
NAME:  PORT
VALUE: 5000
```

### Variable 5: Logging
```
NAME:  LOG_LEVEL
VALUE: info
```

**All Variables Added:**
```
✅ NODE_ENV = production
✅ JWT_SECRET = [32-char string]
✅ MONGO_URI = mongodb+srv://...
✅ PORT = 5000
✅ LOG_LEVEL = info
```

---

## Step 4: Deploy

Scroll down and click:

```
[ Deploy Web Service ] 🚀
```

Then **WAIT** for 3-5 minutes:
- ✅ Installing dependencies
- ✅ Building Docker image
- ✅ Starting container
- ✅ Health checks

You'll see a screen like:
```
Deployment Status: Building ⏳
```

Then after success:
```
Deployment Status: Live ✅
Service URL: https://inventory-management-backend.onrender.com
```

---

## Step 5: Verify Backend Works

Once deployed, test it:

```bash
# Get your backend URL from Render dashboard
# Then run:

curl https://[your-url]/api/health

# You should see:
{
  "status": "ok",
  "timestamp": "2024-06-16T10:30:00Z"
}
```

---

## Step 6: Deploy Frontend

**In same Render dashboard:**
1. Click "New +" (top right)
2. Click "Web Service"
3. Select same GitHub repo
4. Fill in:

```
Name:                   inventory-management-frontend
Language:               Docker
Branch:                 main
Region:                 Singapore
Root Directory:         frontend
Dockerfile Path:        ./Dockerfile
Instance Type:          Free
```

### Frontend Environment Variables

Get your backend URL from previous deployment (looks like `https://inventory-management-backend.onrender.com`)

Then add:
```
VITE_API_URL    = https://[your-backend-url]/api
VITE_SOCKET_URL = https://[your-backend-url]
VITE_ENV        = production
```

### Deploy Frontend

Click **"Deploy Web Service"**

Wait 2-3 minutes for build...

---

## Step 7: Update Backend CORS

Your backend needs to know about the frontend URL.

1. Go back to **Backend service** in Render dashboard
2. Click "Environment"
3. Click "Add Environment Variable"
4. Add:

```
CORS_ORIGIN             = https://[your-frontend-url]
SOCKET_IO_CORS_ORIGIN   = https://[your-frontend-url]
```

5. Click "Save"

This will auto-redeploy the backend (1-2 minutes)

---

## Step 8: Test Everything

Once both services are live:

### Test 1: Can you see the frontend?
1. Go to: `https://[your-frontend-url]`
2. Should see login page

### Test 2: Can you login?
1. Enter email: `admin@system.core`
2. Enter password: `admin123`
3. Click Login

If it works: ✅ Deployment successful!

If it doesn't work:
- Check browser console (F12) for errors
- Check Render logs for backend errors

---

## Complete Checklist

Use this to verify everything:

```
DEPLOYMENT CHECKLIST
═══════════════════════════════════

Backend Service:
 ☐ Service created on Render
 ☐ Docker image building
 ☐ Service running (Live status)
 ☐ Health check passes (/api/health)
 ☐ Got backend URL

MongoDB:
 ☐ Free cluster created
 ☐ Database user created
 ☐ Connection string copied
 ☐ MONGO_URI added to backend env

Frontend Service:
 ☐ Service created on Render
 ☐ Docker image building
 ☐ Service running (Live status)
 ☐ Got frontend URL

CORS Configuration:
 ☐ CORS_ORIGIN set in backend
 ☐ SOCKET_IO_CORS_ORIGIN set
 ☐ Backend redeployed

Frontend Environment:
 ☐ VITE_API_URL set correctly
 ☐ VITE_SOCKET_URL set correctly
 ☐ Frontend redeployed

Testing:
 ☐ Frontend URL loads
 ☐ Login page appears
 ☐ Can login with test credentials
 ☐ Dashboard loads
 ☐ Can see inventory data

READY FOR PRODUCTION:
 ☑ All checks passed!
```

---

## URLs to Bookmark

After deployment:

```
Your Backend:   https://inventory-management-backend.onrender.com
Your Frontend:  https://inventory-management-frontend.onrender.com
Your GitHub:    https://github.com/VedantSinngh/inventory-management
Your MongoDB:   https://cloud.mongodb.com/v2/
Your Render:    https://dashboard.render.com
```

---

## Common Issues & Fixes

### Issue: "Service failed to build"
**Fix:**
- Check Render logs for build errors
- Verify Dockerfile exists: `ls backend/Dockerfile`
- Verify Root Directory is correct: `backend`

### Issue: "Port already in use"
**Fix:**
- Change PORT env var from 5000 to 8000
- Redeploy backend

### Issue: "Cannot connect to MongoDB"
**Fix:**
- Copy MONGO_URI again from MongoDB Atlas
- Make sure to replace `<username>` and `<password>`
- Check MongoDB IP whitelist includes Render server

### Issue: "Frontend is blank"
**Fix:**
- Check browser console (F12)
- Verify VITE_API_URL in frontend env vars
- Verify backend URL is correct

### Issue: "Login doesn't work"
**Fix:**
- Seed database if you have seed script
- Create user via API or MongoDB UI
- Check backend logs for errors

---

## Video Walkthrough (if needed)

The steps above match:
1. Render Getting Started Guide: https://render.com/docs
2. Docker deployment: https://render.com/docs/deploy-docker

---

## After Successfully Deploying

### Celebrate! 🎉
Your inventory management system is now live on the internet!

### Next Steps:
1. Share frontend URL with users
2. Monitor logs in Render dashboard
3. Test all features thoroughly
4. Set up backups for MongoDB
5. Monitor performance

### Scale Later:
1. Upgrade to paid instance type if needed
2. Add more services
3. Set up custom domain
4. Add monitoring/alerting

---

## Time Estimate

| Step | Time |
|------|------|
| Create MongoDB | 5 min |
| Deploy Backend | 5 min |
| Deploy Frontend | 3 min |
| Configure CORS | 2 min |
| Testing | 5 min |
| **Total** | **20 minutes** |

---

## You're Ready! 🚀

Go fill in that Render form and deploy your system!

**Questions?** Refer to:
- `DEPLOYMENT_GUIDE_RENDER.md` - Full deployment guide
- `README.md` - Project overview
- GitHub Issues - Report problems
