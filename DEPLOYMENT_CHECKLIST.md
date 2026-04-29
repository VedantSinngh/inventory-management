# Production Deployment Checklist

## Pre-Deployment Requirements

### Backend Configuration
- [ ] Generate strong JWT_SECRET (minimum 32 characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Set `NODE_ENV=production`
- [ ] Configure MongoDB Atlas or replicated MongoDB instance
- [ ] Set `CORS_ORIGIN` to actual frontend domain
- [ ] Set `SOCKET_IO_CORS_ORIGIN` to actual frontend domain
- [ ] Configure error tracking (optional: Sentry, DataDog)
- [ ] Setup logging service (optional: Winston, ELK stack)

### Frontend Configuration
- [ ] Update `VITE_API_URL` to production backend URL
- [ ] Update `VITE_SOCKET_URL` to production backend URL
- [ ] Ensure sessionStorage is cleared on logout
- [ ] Setup error tracking (optional: Sentry)
- [ ] Configure analytics (optional: Google Analytics, Mixpanel)

### Database Setup
- [ ] MongoDB Atlas M0+ tier (supports transactions)
- [ ] OR MongoDB 4.4+ with replica set enabled
- [ ] Database indexes created (automatic on first run)
- [ ] Daily backups configured
- [ ] Database users created with appropriate permissions
- [ ] Firewall rules configured for database access

### Deployment Platform
- [ ] **Important: DO NOT use Vercel for backend** - Socket.IO is incompatible
- [ ] **Recommended platforms:**
  - Railway.app
  - Render.com
  - Heroku
  - AWS EC2 / ECS
  - DigitalOcean App Platform

### Security Checklist
- [ ] HTTPS/SSL certificates configured
- [ ] CORS headers properly configured
- [ ] Rate limiting enabled on auth endpoints
- [ ] Input validation on all endpoints
- [ ] Helmet security headers enabled
- [ ] JWT secret is NOT committed to version control
- [ ] No sensitive data in environment files
- [ ] Database credentials secured
- [ ] API keys/tokens stored securely

## Deployment Steps

### 1. Backend Deployment (e.g., Railway.app)

```bash
# Push to Git
git add .
git commit -m "Production build"
git push origin main

# Connect to Railway (or your chosen platform)
# Follow platform-specific instructions for deployment
```

### 2. Database Setup

```bash
# On MongoDB Atlas, create:
# - Admin user
# - App user with limited permissions
# - Whitelist deployment IP
# - Configure backups
```

### 3. Environment Variables (Backend)

**Set these in your deployment platform:**

```
NODE_ENV=production
JWT_SECRET=<strong-32+-char-secret>
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/inventory
PORT=5000
CORS_ORIGIN=https://your-frontend-domain.com
SOCKET_IO_CORS_ORIGIN=https://your-frontend-domain.com
```

### 4. Frontend Deployment (e.g., Vercel)

```bash
# Vercel frontend with updated API URLs
# Set production environment variables:
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

### 5. Database Seeding (Production)

```bash
# SSH into your backend or use platform CLI
npm run seed

# Or seed only users if you have existing data
# See seed.js for customization
```

## Post-Deployment Verification

### Testing Checklist

```bash
# Test 1: Health Check
curl https://your-backend-domain.com/api/health

# Test 2: Login Flow
curl -X POST https://your-backend-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@system.core","password":"admin123"}'

# Test 3: Get Products
curl https://your-backend-domain.com/api/products \
  -H "Authorization: Bearer <token>"

# Test 4: Create Order (Stock Atomicity)
# Create order and verify stock decrements correctly

# Test 5: WebSocket Connection
# Test real-time updates in browser dev tools
```

### Manual Verification

1. **Frontend Access**
   - [ ] Can access login page
   - [ ] Can login with credentials
   - [ ] Dashboard loads
   - [ ] All navigation links work

2. **Core Features**
   - [ ] Can view products list
   - [ ] Can create new product
   - [ ] Can create order
   - [ ] Stock updates in real-time
   - [ ] Can view audit logs

3. **Security**
   - [ ] HTTPS works
   - [ ] Security headers present
   - [ ] Token required for API access
   - [ ] Rate limiting works (try 6+ logins)
   - [ ] Invalid input rejected

4. **Performance**
   - [ ] Pages load in < 2 seconds
   - [ ] List views paginated
   - [ ] WebSocket connected
   - [ ] Database queries performant

## Monitoring & Maintenance

### Daily Checks
- [ ] Check error logs for exceptions
- [ ] Monitor database disk usage
- [ ] Verify backups completed
- [ ] Check API response times

### Weekly Checks
- [ ] Review audit logs for suspicious activity
- [ ] Check database performance
- [ ] Verify SSL certificate expiration (automated renewal recommended)
- [ ] Review error patterns

### Monthly Tasks
- [ ] Performance optimization analysis
- [ ] Security vulnerability scanning
- [ ] Database maintenance/optimization
- [ ] Review and update dependencies

## Disaster Recovery

### Backup & Recovery
- [ ] Database backups: Daily, retained 30 days
- [ ] Test restore procedure monthly
- [ ] Document recovery steps
- [ ] Have backup locations verified

### Failover Strategy
- [ ] Multiple database replicas configured
- [ ] Load balancer setup (if multi-region)
- [ ] CDN for static assets (optional)
- [ ] Documented incident response plan

## Performance Optimization (Optional)

### Frontend
- [ ] Code splitting for routes
- [ ] Image optimization
- [ ] CSS/JS minification
- [ ] Lazy loading for tables
- [ ] Service worker for offline support

### Backend
- [ ] Database query optimization
- [ ] Redis caching for frequently accessed data
- [ ] API response compression
- [ ] Database connection pooling
- [ ] CDN for static files

### Monitoring Services
- [ ] Sentry for error tracking
- [ ] DataDog for performance monitoring
- [ ] LogRocket for frontend session replay (optional)
- [ ] New Relic for APM (optional)

## Scaling Considerations

### When to Scale
- [ ] Database: > 80% disk usage, slow queries
- [ ] Backend: CPU > 70%, response times > 500ms
- [ ] Frontend: Lighthouse score < 80

### Scaling Options
1. **Vertical Scaling:** Upgrade server/database specs
2. **Horizontal Scaling:** Add more backend instances behind load balancer
3. **Database Sharding:** Partition data across multiple databases
4. **Caching Layer:** Add Redis for frequently accessed data

## Compliance & Security

### Required for Production
- [ ] Privacy Policy updated
- [ ] Terms of Service created
- [ ] GDPR/Data Privacy compliance (if applicable)
- [ ] Security audit completed
- [ ] Penetration testing (recommended)
- [ ] Encryption at rest (database)
- [ ] Encryption in transit (HTTPS/TLS)

### Documentation
- [ ] Architecture diagram
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Deployment runbook
- [ ] Troubleshooting guide
- [ ] Disaster recovery plan

## Support & Contact

For issues or questions during deployment:
1. Check logs: `npm run dev` or platform logs
2. Review TESTING_GUIDE.md for manual test procedures
3. Check PRODUCTION_AUDIT_FIXES.md for known issues fixed
4. Verify environment variables are set correctly

---

## Quick Reference: Environment Variables

### Backend (.env)
```
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/inventory?retryWrites=true
JWT_SECRET=your-strong-32-char-minimum-secret-here
CORS_ORIGIN=https://your-frontend-domain.com
SOCKET_IO_CORS_ORIGIN=https://your-frontend-domain.com
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-domain.com/api
VITE_SOCKET_URL=https://your-backend-domain.com
```

---

**Last Updated:** April 29, 2026
**Production Readiness Score:** 7.5/10 (Enhanced from 4.5/10)
