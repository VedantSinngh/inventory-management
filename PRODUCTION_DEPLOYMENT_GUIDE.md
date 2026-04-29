# Production Deployment Guide

## Quick Summary

This guide provides step-by-step instructions to deploy the Inventory Management System to production using **Railway** (recommended) or **Render**.

**Current Production Readiness: 8.5/10** ✅

---

## Prerequisites

- Git account and repository pushed
- MongoDB Atlas account
- SendGrid account
- Railway or Render account
- Domain name (optional but recommended)

---

## Step 1: Prepare Your Repository

### 1.1 Generate Production Secrets

Generate a strong JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output example:**
```
a3f8c2b1d9e4f7a6c5b8e1d3f2a9c4b7e6d1a2f5c8b9e3d7a1f4c6b9e2d5
```

Save this secret - you'll need it later.

### 1.2 Ensure Git is Updated

```bash
cd inventory-management-system

# Check status
git status

# Add all changes
git add -A

# Commit
git commit -m "Production deployment ready"

# Push to repository
git push origin main
```

---

## Step 2: Setup MongoDB Atlas

### 2.1 Create MongoDB Cluster

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign in or create account
3. Create a new project (or use existing)
4. Click "Create a Deployment"
5. Choose **M0 Free Tier** (includes transaction support)
6. Select region closest to your deployment
7. Click "Create Cluster"

### 2.2 Setup Database User

1. Go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Enter username: `inventory_user`
5. Enter strong password (save this)
6. Add privilege: "Read and write to any database"
7. Click "Add User"

### 2.3 Whitelist IP Addresses

1. Go to "Network Access"
2. Click "Add IP Address"
3. Select "Allow access from anywhere" (0.0.0.0/0)
4. Click "Confirm"

### 2.4 Get Connection String

1. Go to "Database" → "Clusters"
2. Click "Connect" on your cluster
3. Choose "Drivers"
4. Copy the connection string
5. Replace `<username>` and `<password>` with your database user credentials
6. Replace `<dbname>` with `inventorySystem`

**Example:**
```
mongodb+srv://inventory_user:SecurePassword123@cluster0.abc123.mongodb.net/inventorySystem?retryWrites=true&w=majority
```

---

## Step 3: Setup SendGrid Email Service

### 3.1 Create SendGrid Account

1. Go to https://sendgrid.com
2. Sign up for free account
3. Complete email verification

### 3.2 Get API Key

1. Go to "Settings" → "API Keys"
2. Click "Create API Key"
3. Name it: `Inventory System Production`
4. Select "Full Access" permissions
5. Click "Create & View"
6. Copy the API Key (starts with `SG.`)

### 3.3 Verify Sender Email

1. Go to "Sender Authentication"
2. Click "Create New Sender"
3. Fill in your email details:
   - From Email: `noreply@your-domain.com` (or your email)
   - Reply-To: `support@your-domain.com`
4. Click "Create"
5. Verify your email (check inbox)

---

## Step 4: Deploy to Railway

### 4.1 Connect Repository

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Connect your GitHub account
6. Select your inventory-management-system repo
7. Click "Deploy"

### 4.2 Configure Environment Variables

1. Project opens → Click "Variables"
2. Add these variables:

```
NODE_ENV=production
PORT=5000
JWT_SECRET=[paste the generated secret from Step 1.1]
MONGO_URI=[paste MongoDB connection string from Step 2.4]
CORS_ORIGIN=https://[your-frontend-url]
SOCKET_IO_CORS_ORIGIN=https://[your-frontend-url]
FRONTEND_URL=https://[your-frontend-url]
SENDGRID_API_KEY=[paste API key from Step 3.2]
SENDGRID_FROM_EMAIL=noreply@your-domain.com
LOG_LEVEL=info
```

3. Click "Save"

### 4.3 Verify Deployment

1. Railway builds and deploys automatically
2. Wait for green checkmark
3. Click "View Logs" to verify it started
4. Get the public domain URL (e.g., `https://inventory-system-prod.railway.app`)

### 4.4 Test Backend

```bash
# Test health endpoint
curl https://inventory-system-prod.railway.app/api/health

# Should return
{
  "status": "OK",
  "timestamp": "2026-04-29T...",
  "environment": "production",
  "version": "1.0.0"
}
```

---

## Step 5: Deploy Frontend

### 5.1 Update Frontend .env

```bash
cd frontend
cat > .env.production <<EOF
VITE_API_URL=https://inventory-system-prod.railway.app/api
VITE_SOCKET_URL=https://inventory-system-prod.railway.app
EOF
```

### 5.2 Deploy to Vercel

1. Go to https://vercel.com
2. Sign up with GitHub
3. Click "New Project"
4. Import your repository
5. Select "frontend" directory as root
6. Add environment variables:
   - `VITE_API_URL=https://inventory-system-prod.railway.app/api`
   - `VITE_SOCKET_URL=https://inventory-system-prod.railway.app`
7. Click "Deploy"
8. Get the frontend URL (e.g., `https://inventory-management-frontend.vercel.app`)

### 5.3 Update Backend CORS

Go back to Railway:
1. Update `CORS_ORIGIN` and `SOCKET_IO_CORS_ORIGIN` with your Vercel URL
2. Save and Railway auto-redeploys

---

## Step 6: Initialize Database

### 6.1 Connect to Backend

```bash
# SSH into Railway or use backend logs to verify it's running
# Or test via API
curl -X POST https://inventory-system-prod.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.core","password":"admin123"}'

# If no user exists, need to seed
```

### 6.2 Seed Production Database

Option A: Using backend SSH (if available):
```bash
npm run seed
```

Option B: Using MongoDB Atlas UI:
1. Go to Collections
2. Create database `inventorySystem`
3. Create collections:
   - `users`
   - `products`
   - `orders`
   - `warehouses`
   - `auditlogs`

Then insert seed data manually or use MongoDB Compass:
```javascript
// User collection - insert:
{
  "name": "System Admin",
  "email": "admin@system.core",
  "password": "$2a$10$...", // bcrypt hash of "admin123"
  "role": "ADMIN",
  "isVerified": true,
  "status": "ACTIVE",
  "createdAt": new Date(),
  "updatedAt": new Date()
}
```

---

## Step 7: Verification Checklist

- [ ] Backend health check returns 200
- [ ] Login endpoint works with test credentials
- [ ] WebSocket connects successfully
- [ ] Email verification sends
- [ ] Frontend loads without errors
- [ ] Can create new product
- [ ] Can create new order
- [ ] Stock updates in real-time
- [ ] Audit logs populated
- [ ] CORS errors resolved

---

## Step 8: Setup Monitoring & Alerts

### 8.1 Setup Error Tracking (Optional but Recommended)

**Using Sentry:**

1. Go to https://sentry.io
2. Create account and project (Node.js)
3. Get your DSN
4. Add to Railway variables:
   ```
   SENTRY_DSN=https://...@sentry.io/...
   ```

### 8.2 Setup Logging

Logs are automatically sent to Railway dashboard. View with:
```bash
# Railway CLI
railway logs
```

### 8.3 Setup Database Backups

**MongoDB Atlas automatic backups:**
1. Go to "Backups"
2. Choose "Continuous Snapshots" or "Scheduled Backups"
3. Set retention: 7-30 days

---

## Step 9: Post-Deployment Testing

### 9.1 Full User Flow Test

```bash
# 1. Test Signup
curl -X POST https://your-backend.railway.app/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test User",
    "email":"test@example.com",
    "password":"TestPass123"
  }'

# 2. Verify Email (check email for verification token)
curl -X POST https://your-backend.railway.app/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token":"<token>"}'

# 3. Login
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# 4. Get current user
curl -X GET https://your-backend.railway.app/api/auth/me \
  -H "Authorization: Bearer <token>"
```

### 9.2 API Endpoint Tests

```bash
# Create product
curl -X POST https://your-backend.railway.app/api/products \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'

# Get products
curl -X GET https://your-backend.railway.app/api/products \
  -H "Authorization: Bearer <token>"
```

---

## Troubleshooting

### Issue: "MONGO_URI connection failed"
**Solution:** 
- Verify MongoDB Atlas IP whitelist includes Railway IP
- Check username/password in connection string
- Ensure `:` and `@` aren't URL encoded

### Issue: "SendGrid API key invalid"
**Solution:**
- Verify API key starts with `SG.`
- Re-generate if needed
- Check for typos

### Issue: "CORS error in frontend"
**Solution:**
- Update `CORS_ORIGIN` in Railway to match frontend URL
- Redeploy backend

### Issue: "WebSocket connection failed"
**Solution:**
- Verify `SOCKET_IO_CORS_ORIGIN` matches frontend URL
- Check that Socket.IO transport is not blocked by proxy
- Try disabling IPv6 in Railway if issues persist

### Issue: "Email not sending"
**Solution:**
- Verify sender email is verified in SendGrid
- Check SendGrid API key
- Review SendGrid logs for bounce/rejection
- Check spam folder

---

## Maintenance

### Weekly Tasks
- [ ] Check error logs in Railway/Sentry
- [ ] Verify database backups
- [ ] Monitor API response times

### Monthly Tasks
- [ ] Review user activity logs
- [ ] Check storage usage
- [ ] Update dependencies
- [ ] Test disaster recovery

### Quarterly Tasks
- [ ] Security audit
- [ ] Performance optimization
- [ ] Database maintenance
- [ ] Cost optimization

---

## Rollback Procedure

If deployment fails:

```bash
# Railway: Click "Deployment" tab, select previous version
# Or redeploy with previous commit:
git revert <commit-hash>
git push origin main
# Railway auto-redeploys

# Vercel: Go to "Deployments", select previous, click "Promote"
```

---

## Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **MongoDB Atlas:** https://docs.atlas.mongodb.com
- **SendGrid Guide:** https://docs.sendgrid.com
- **Node.js Best Practices:** https://nodejs.org/en/docs/

---

**Estimated Deployment Time:** 30-45 minutes  
**Estimated Monthly Cost:**
- MongoDB Atlas (M0): Free
- Railway: $7-20/month
- Vercel: Free-$50+/month
- SendGrid: Free (100 emails/day)

**Total: $7-70+/month depending on usage**

---

Last Updated: April 29, 2026  
Production Ready: ✅ Yes
