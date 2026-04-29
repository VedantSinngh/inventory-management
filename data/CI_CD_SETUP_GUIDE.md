# CI/CD Setup Guide

This guide explains how to configure and use the GitHub Actions CI/CD pipeline for the Inventory Management System.

## Overview

The CI/CD pipeline automates:
- **Testing** - Unit tests, linting, security audits
- **Building** - Docker image creation, frontend bundle
- **Deploying** - Production deployment to Railway & Vercel
- **Monitoring** - Health checks, notifications

**Current Setup:** 4 GitHub Actions workflows, ~10 minutes per full run

---

## Prerequisites

- GitHub repository with Actions enabled
- Railway account (backend deployment)
- Vercel account (frontend deployment)
- SendGrid API key (for email in production)
- (Optional) Slack workspace for notifications

---

## Step 1: Configure GitHub Secrets

GitHub secrets are encrypted environment variables used in workflows without exposing them in code.

### 1.1 Go to Repository Settings

1. Navigate to your GitHub repository
2. Click **Settings** (top menu)
3. Expand **Secrets and variables** (left sidebar)
4. Click **Actions**

### 1.2 Add Required Secrets

Click **New repository secret** for each:

#### For Railway Backend Deployment

**RAILWAY_TOKEN**
1. Go to https://railway.app
2. Click your profile (top right) → Account
3. Scroll to "API Tokens"
4. Click "Create Token"
5. Copy the token
6. Paste into GitHub secret

**RAILWAY_BACKEND_PROJECT_ID**
1. In Railway, open your backend project
2. Click **Settings** (top right)
3. Copy the **Project ID**
4. Paste into GitHub secret

#### For Vercel Frontend Deployment

**VERCEL_TOKEN**
1. Go to https://vercel.com
2. Click your profile (top right) → Settings
3. Click **Tokens** (left menu)
4. Click **Create** (under API Tokens)
5. Name it "GitHub Actions"
6. Copy the token
7. Paste into GitHub secret

**VERCEL_PROJECT_ID**
1. In Vercel, open your frontend project
2. Click **Settings** (top right)
3. Look for **Project ID** (copy entire value)
4. Paste into GitHub secret

**VERCEL_ORG_ID**
1. Click your profile (top right) → Settings
2. Go to **Teams** section
3. Find your organization/team name
4. Copy the ID from the URL or "Team ID" field
5. Paste into GitHub secret

#### For Health Checks

**BACKEND_URL**
```
https://inventory-system-prod.railway.app
```
(Update with your actual Railway backend URL)

#### For Notifications (Optional)

**SLACK_WEBHOOK**
1. Go to https://api.slack.com/messaging/webhooks
2. Click **Create your app** or select existing app
3. Enable Incoming Webhooks
4. Click **Add New Webhook to Workspace**
5. Select your channel
6. Copy the Webhook URL
7. Paste into GitHub secret

### 1.3 Verify Secrets Added

```bash
# View all secrets (without values)
# Go to Settings → Secrets and variables → Actions
```

---

## Step 2: Add Docker Credentials (Optional for Private Registry)

If pushing to a private container registry instead of GitHub Container Registry:

```bash
# Add these secrets
DOCKER_USERNAME
DOCKER_PASSWORD
DOCKER_REGISTRY  # e.g., docker.io or your private registry
```

---

## Step 3: Configure Branch Protection

Prevent deploying without passing tests:

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Apply to branch: `full` (or your main production branch)
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
5. Select required status checks:
   - ✅ Backend Tests
   - ✅ Frontend Tests
   - ✅ (Optional) Docker Build
6. Click **Create**

---

## Step 4: Deploy Workflow Files

The workflow files are already in `.github/workflows/`:

```
.github/workflows/
├── backend-tests.yml       # Backend testing
├── frontend-tests.yml      # Frontend testing
├── docker-build.yml        # Docker image building
└── deploy.yml             # Production deployment
```

Commit and push these files:

```bash
git add .github/workflows/
git commit -m "Add GitHub Actions CI/CD workflows"
git push origin full
```

---

## Step 5: Test the Pipeline

### Test Backend Workflow

1. Make a change to `backend/` directory:
   ```bash
   # Edit backend/server.js or any file
   git add backend/
   git commit -m "Test backend workflow"
   git push origin develop
   ```

2. Go to GitHub → **Actions** tab
3. Select "Backend Tests & Linting" workflow
4. Watch it run (should take ~3-5 minutes)
5. Verify all checks pass ✅

### Test Frontend Workflow

1. Make a change to `frontend/` directory:
   ```bash
   # Edit frontend/src/App.jsx or any file
   git add frontend/
   git commit -m "Test frontend workflow"
   git push origin develop
   ```

2. Go to GitHub → **Actions** tab
3. Select "Frontend Tests & Linting" workflow
4. Watch it run (should take ~3-5 minutes)
5. Verify all checks pass ✅

### Test Deployment Workflow

1. Push to `full` branch (requires changes to pass tests first):
   ```bash
   git checkout full
   git merge develop
   git push origin full
   ```

2. Go to GitHub → **Actions** tab
3. Select "Deploy to Production" workflow
4. Watch deployment progress
5. Check Railway and Vercel dashboards for successful deployment
6. Test backend health: `curl https://[BACKEND_URL]/api/health`

---

## Step 6: Monitor Workflows

### View Workflow Runs

1. Go to GitHub → **Actions** tab
2. Click any workflow to see runs
3. Click a run to see detailed logs
4. Each job can be expanded to see step outputs

### Check Test Coverage

1. Go to https://codecov.io
2. Sign in with GitHub
3. Select your repository
4. View coverage reports from recent commits

### View Deployment Status

Check deployment status in multiple places:

**GitHub Actions:**
- Go to **Actions** → **Deploy to Production**
- See latest deployment status and logs

**Railway:**
- Log in to railway.app
- Open your project
- Click **Deployments** tab
- See all deployments with status

**Vercel:**
- Log in to vercel.com
- Open your project
- Click **Deployments** tab
- See all deployments with status

---

## Workflow Configuration Details

### Backend Tests Workflow

**What it does:**
- Installs Node.js and dependencies
- Spins up MongoDB test container
- Runs ESLint
- Runs unit tests (if `npm test` is configured)
- Uploads coverage to Codecov
- Runs security audit

**Triggers:**
- Push to `main`, `full`, or `develop` branches (if `backend/` changed)
- PR to `main`, `full`, or `develop` (if `backend/` changed)

**Skip workflow:**
```bash
git commit -m "Update docs [skip ci]"
```

### Frontend Tests Workflow

**What it does:**
- Installs Node.js and dependencies
- Runs ESLint
- Builds production bundle
- Runs unit tests
- Checks bundle size (<5MB)
- Runs Lighthouse audit
- Uploads build artifact

**Triggers:**
- Push to `main`, `full`, or `develop` branches (if `frontend/` changed)
- PR to `main`, `full`, or `develop` (if `frontend/` changed)

**Build artifacts available for 5 days:**
- Download from Actions → Artifacts → `frontend-build`

### Docker Build Workflow

**What it does:**
- Builds backend Docker image
- Builds frontend Docker image
- Pushes to GitHub Container Registry
- Runs Trivy security scanning

**Triggers:**
- Push tag like `v1.0.0`
- Manual trigger (Actions tab → Docker Build → Run workflow)

**Docker images published to:**
```
ghcr.io/[username]/inventory-management-system/backend:v1.0.0
ghcr.io/[username]/inventory-management-system/frontend:v1.0.0
```

### Deploy Workflow

**What it does:**
- Deploys backend to Railway
- Deploys frontend to Vercel
- Waits 30 seconds for services to start
- Runs health check: `GET /api/health`
- Notifies Slack on success/failure

**Triggers:**
- Push to `full` branch
- Manual trigger (Actions tab → Deploy to Production → Run workflow)

**Requires these secrets:**
- `RAILWAY_TOKEN`
- `RAILWAY_BACKEND_PROJECT_ID`
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`
- `BACKEND_URL`
- `SLACK_WEBHOOK` (optional)

---

## Troubleshooting

### Workflow doesn't trigger on push

**Problem:** You pushed to `full` branch but workflow didn't run

**Solutions:**
1. Check workflow file syntax: `.github/workflows/deploy.yml` must be valid YAML
2. Verify branch name matches exactly (case-sensitive)
3. Check "on:" section in workflow file
4. For path filters, ensure files changed match pattern

**Debug:**
```bash
# Verify workflow files are in correct location
git ls-files .github/workflows/

# Push again with explicit branch
git push origin full
```

### Backend tests fail with "MongoDB connection error"

**Problem:** MongoDB test container failed to start

**Solutions:**
1. Clear Docker cache: `docker system prune`
2. Ensure port 27017 is available
3. Check Docker daemon is running
4. Verify GitHub Actions runner has Docker access

**Debug in Actions log:**
- Click failed job → "Run tests" step
- Look for MongoDB startup errors

### Frontend build exceeds size limit

**Problem:** Build size > 5MB

**Solutions:**
1. Check for large dependencies: `npm ls --depth=1`
2. Use dynamic imports: `import('./Component').then(m => m.default)`
3. Remove unused dependencies
4. Enable tree-shaking in vite.config.js

**Debug:**
```bash
npm run build
# Then analyze:
npm install -g vite-plugin-visualizer
# Rebuild with visualizer enabled
```

### Deployment fails with "Token invalid"

**Problem:** Railway/Vercel deployment fails with auth error

**Solutions:**
1. Verify token in GitHub secret is current (not expired)
2. Regenerate token and update GitHub secret
3. Verify project IDs are correct
4. Check GitHub secret names match workflow (case-sensitive)

**Debug:**
1. Go to Railway.app → Account → Check token status
2. Go to Vercel → Settings → Tokens → Check token status
3. In GitHub Actions log, verify secret names are interpolated correctly

### Health check fails

**Problem:** Smoke tests fail: "Backend health check failed with status 502"

**Solutions:**
1. Verify `BACKEND_URL` secret is correct in GitHub
2. Check Railway deployment succeeded (go to Railway dashboard)
3. Verify environment variables set in Railway (MONGO_URI, JWT_SECRET, etc.)
4. Check MongoDB is running: Log into Railway, click Database service
5. Wait longer: Add delay before health check (default is 30 seconds)

**Debug:**
```bash
# Manually test health endpoint
curl -v https://[BACKEND_URL]/api/health
```

### Slack notification doesn't send

**Problem:** Deployment completes but Slack notification not received

**Solutions:**
1. Verify `SLACK_WEBHOOK` secret is set
2. Check webhook URL is still valid (can expire)
3. Regenerate webhook URL and update GitHub secret
4. Verify Slack channel exists and bot has permission

**Debug:**
1. Check Actions log for Slack step errors
2. Test webhook manually:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test"}' \
     [SLACK_WEBHOOK_URL]
   ```

---

## Best Practices

### 1. Always Push to Develop First

```bash
git commit -m "Feature: add new page"
git push origin develop
# Wait for tests to pass
# Then merge to full for production deployment
```

### 2. Use Descriptive Commit Messages

```bash
# Good
git commit -m "Fix: resolve race condition in stock update"

# Bad
git commit -m "fix bug"
```

### 3. Review Workflow Logs Before Pushing to Production

1. Push to `develop`
2. Wait for all workflows to pass
3. Create PR to `full`
4. Review workflow runs in PR
5. Merge to `full` when confident

### 4. Test Locally Before Pushing

```bash
# Backend
cd backend
npm run lint
npm test

# Frontend
cd ../frontend
npm run lint
npm test
npm run build
```

### 5. Monitor Workflows After Merge

1. After pushing to `full`, check Actions tab
2. Wait for deployment to complete
3. Check Slack notification
4. Verify health endpoint returns 200
5. Do smoke test in Vercel frontend

---

## Maintenance

### Weekly
- [ ] Check workflow runs for failures
- [ ] Review security audit results
- [ ] Check test coverage trends in Codecov

### Monthly
- [ ] Update GitHub Actions to latest versions
- [ ] Refresh Railway/Vercel tokens (if approaching expiry)
- [ ] Review and update workflow files
- [ ] Archive old workflow artifacts

### Quarterly
- [ ] Audit GitHub secrets (remove unused ones)
- [ ] Review and update dependencies
- [ ] Performance optimization based on metrics
- [ ] Update documentation

---

## Next Steps

1. ✅ Configure GitHub secrets (all required)
2. ✅ Test each workflow (backend, frontend, docker)
3. ✅ Enable branch protection rules
4. ✅ First production deployment
5. Monitor workflows and iterate

---

**Setup Time:** ~15-20 minutes  
**First Deployment:** ~10-15 minutes  
**Regular Deployments:** ~5-10 minutes each

---

Last Updated: April 29, 2026
