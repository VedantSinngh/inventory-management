# Inventory Management System - Testing Guide

## Installation & Setup

### Prerequisites
- Node.js 16+
- MongoDB 4.4+ (or MongoDB Atlas)
- npm or yarn

### Step 1: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Step 2: Configure Environment

**Backend (.env)**
```bash
cd backend
cp .env.example .env
# Edit .env with your settings:
# - Generate a strong JWT_SECRET (min 32 characters)
# - Set MONGO_URI to your MongoDB connection string
# - Update CORS_ORIGIN and SOCKET_IO_CORS_ORIGIN
```

**Frontend (.env)**
```bash
cd ../frontend
cp .env.example .env
# Edit .env:
# - VITE_API_URL=http://localhost:5000/api
# - VITE_SOCKET_URL=http://localhost:5000
```

### Step 3: Seed Database

```bash
cd backend
npm run seed
# Creates admin user: admin@system.core / admin123
```

---

## Testing Critical Fixes

### Test 1: Server Starts Without ReferenceError ✅
```bash
cd backend
npm run dev

# Expected: Server starts and listens on port 5000
# Error to watch for: "ReferenceError: allowedOrigins is not defined"
```

### Test 2: Environment Validation ✅
```bash
# Test missing JWT_SECRET
cd backend
JWT_SECRET="" npm run dev

# Expected: Error message: "Missing required environment variables: JWT_SECRET"
# Should NOT start the server
```

### Test 3: Input Validation ✅

**Invalid Product Creation:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Test",
    "sku": "TEST-001",
    "category": "Electronics",
    "price": -100,
    "stock": 0
  }'

# Expected: 400 error - "Price must be a non-negative number"
```

**Valid Product Creation:**
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "Laptop",
    "sku": "LAPTOP-001",
    "category": "Electronics",
    "price": 999.99,
    "stock": 10,
    "lowStockThreshold": 5
  }'

# Expected: 201 Created with product data
```

### Test 4: Rate Limiting on Login ✅
```bash
# Make 6 login attempts within 15 minutes
for i in {1..6}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@system.core","password":"wrongpassword"}'
  echo "Attempt $i"
done

# Expected: 5th attempt succeeds, 6th returns 429 Too Many Requests
```

### Test 5: JWT Secret Validation ✅

**Attempt to forge token with default secret:**
```javascript
const jwt = require('jsonwebtoken');
const forgedToken = jwt.sign({ id: 'someid' }, 'secret', { expiresIn: '30d' });

// This token will NOT be accepted by the server
// Server expects JWT_SECRET from environment
```

### Test 6: Socket.IO Authentication ✅

**Test in browser console:**
```javascript
const socket = io('http://localhost:5000', {
  // Without token - should be rejected
});

socket.on('connect_error', (error) => {
  console.log('Connection error:', error.message);
  // Expected: "Authentication error: No token provided"
});

// With token - should connect
const socket2 = io('http://localhost:5000', {
  auth: {
    token: '<valid-jwt-token>'
  }
});

socket2.on('connect', () => {
  console.log('Connected successfully');
});
```

### Test 7: Atomic Stock Update (Race Condition Fix) ✅

**Scenario: Concurrent orders on same product**

```bash
# Create product with stock 10
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Phone","sku":"PHONE-001","category":"Electronics","price":500,"stock":10}'

# Save the product ID

# Make 2 concurrent sales orders for 6 units each
# Without transactions, stock would go to -2
# With transactions, second order should fail

curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type":"SALES",
    "items":[{"product":"<id>","quantity":6,"priceAtTime":500}],
    "totalAmount":3000
  }' &

curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type":"SALES",
    "items":[{"product":"<id>","quantity":6,"priceAtTime":500}],
    "totalAmount":3000
  }' &

wait

# Expected: One succeeds, other fails with "Insufficient stock"
# Stock should be exactly 4 (not negative)
```

### Test 8: Product Stock Cannot Be Modified Directly ✅

```bash
# Try to update product with direct stock change
curl -X PUT http://localhost:5000/api/products/<product-id> \
  -H "Authorization: Bearer <token>" \
  -d '{"stock": 1000}'

# Expected: 400 error - "Cannot directly modify stock. Use order creation instead"
```

### Test 9: Soft Delete Functionality ✅

```bash
# Delete a product
curl -X DELETE http://localhost:5000/api/products/<product-id> \
  -H "Authorization: Bearer <token>" \
  -d '{"reason":"Out of stock permanently"}'

# Expected: 200 OK, product marked with deletedAt

# Try to fetch product - should not appear in list
curl -X GET http://localhost:5000/api/products \
  -H "Authorization: Bearer <token>"

# Expected: Product not in results (filtered by deletedAt: null)
```

### Test 10: Audit Logging ✅

```bash
# View your own audit logs
curl -X GET http://localhost:5000/api/audit \
  -H "Authorization: Bearer <token>"

# Expected: Array of audit log entries with your actions

# View entity history (as admin)
curl -X GET "http://localhost:5000/api/audit/entity/Product/<product-id>" \
  -H "Authorization: Bearer <admin-token>"

# Expected: All CREATE/UPDATE/DELETE actions for this product
```

### Test 11: RBAC Implementation ✅

**Test MANAGER can create products:**
```bash
# Create manager user first (as admin)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "name":"John Manager",
    "email":"manager@system.core",
    "password":"SecurePass123",
    "role":"MANAGER"
  }'

# Manager can create products
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <manager-token>" \
  -d '{...}'
# Expected: 201 Created

# Staff cannot create products
curl -X POST http://localhost:5000/api/products \
  -H "Authorization: Bearer <staff-token>" \
  -d '{...}'
# Expected: 403 Forbidden
```

### Test 12: Pagination ✅

```bash
# Get products with pagination
curl -X GET "http://localhost:5000/api/products?page=1&limit=10" \
  -H "Authorization: Bearer <token>"

# Expected response structure:
# {
#   "data": [...],
#   "pagination": {
#     "page": 1,
#     "limit": 10,
#     "total": <total-count>,
#     "pages": <total-pages>
#   }
# }
```

### Test 13: Order Cancellation with Stock Reversal ✅

```bash
# Create order
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer <token>" \
  -d '{...}'

# Save order ID

# Note current stock

# Cancel order
curl -X POST http://localhost:5000/api/orders/<order-id>/cancel \
  -H "Authorization: Bearer <token>"

# Expected: Stock is restored

# Verify stock
curl -X GET http://localhost:5000/api/products/<product-id> \
  -H "Authorization: Bearer <token>"
# Expected: Stock increased by order quantity
```

---

## Frontend Testing

### Test 1: Auth Flow ✅

1. Navigate to login page
2. Enter admin credentials: `admin@system.core` / `admin123`
3. Expected: Redirected to dashboard
4. Refresh page
5. Expected: Still logged in (sessionStorage persists)
6. Close all browser tabs and reopen
7. Expected: Logged out (sessionStorage cleared)

### Test 2: Protected Routes ✅

1. While logged in, navigate to `/login`
2. Expected: Redirected to `/` (dashboard)
3. Logout
4. Navigate to `/products`
5. Expected: Redirected to `/login`
6. Check console: Should NOT see ReferenceError

### Test 3: Product Creation with Validation ✅

1. Go to Products page
2. Click "ADD NEW PRODUCT"
3. Try to submit empty form
4. Expected: Validation errors shown inline
5. Enter:
   - Name: "Test Product"
   - SKU: "test-001"
   - Category: "Test"
   - Price: -100
6. Click Save
7. Expected: Price error shown
8. Fix price to 100
9. Click Save
10. Expected: Product created and visible in table

### Test 4: Real-time Updates ✅

1. Open app in two browser windows side-by-side
2. In window 1: Create a new product
3. In window 2: Check if it appears automatically
4. Expected: Yes, via WebSocket

### Test 5: Error Handling ✅

1. Try to create product with duplicate SKU
2. Expected: 409 error message shown (not a crash)
3. Check browser console: Should show error but no red exceptions

### Test 6: Loading States ✅

1. Monitor Network tab in DevTools
2. Navigate between pages
3. Expected: Visual feedback during load (or at least no hang)

---

## API Endpoint Reference

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (admin only)
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List products (paginated)
- `POST /api/products` - Create product (manager+)
- `GET /api/products/:id` - Get product
- `PUT /api/products/:id` - Update product (manager+)
- `DELETE /api/products/:id` - Soft delete (admin only)

### Orders
- `GET /api/orders` - List orders (paginated)
- `POST /api/orders` - Create order (auth)
- `GET /api/orders/:id` - Get order
- `PUT /api/orders/:id` - Update order status (manager+)
- `POST /api/orders/:id/cancel` - Cancel order (manager+)

### Warehouses
- `GET /api/warehouses` - List warehouses
- `POST /api/warehouses` - Create warehouse (admin)
- `GET /api/warehouses/:id` - Get warehouse with stock
- `GET /api/warehouses/:id/stock` - Get warehouse products
- `PUT /api/warehouses/:id` - Update warehouse (admin)
- `DELETE /api/warehouses/:id` - Soft delete (admin)

### Audit
- `GET /api/audit` - List audit logs (own/admin all)
- `GET /api/audit/entity/:type/:id` - Entity history
- `GET /api/audit/summary/stats` - Audit summary (admin)

### Analytics
- `GET /api/analytics/reorder-suggestions` - Low stock items

---

## Troubleshooting

### Issue: "JWT_SECRET is weak or using default value"
**Solution:** Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Issue: "Cannot connect to WebSocket"
**Solution:** 
1. Check if backend is running
2. Verify CORS and WebSocket CORS origins in .env
3. Check browser console for auth errors
4. Ensure token is being sent in auth

### Issue: "Insufficient stock" on valid order
**Solution:**
1. Check product stock with GET /api/products/:id
2. Check for concurrent orders
3. Review audit log for stock changes

### Issue: "Too many login attempts"
**Solution:**
1. Wait 15 minutes for rate limit to reset
2. Or use a different IP address

---

## Performance Notes

- Indexes are automatically created on startup
- First query may be slow due to index creation
- Pagination defaults to 20 items per page
- Consider increasing limit for large datasets

---

## Production Deployment Checklist

- [ ] Database backups configured
- [ ] JWT_SECRET is cryptographically secure (32+ chars)
- [ ] CORS_ORIGIN points to real frontend domain
- [ ] MONGO_URI uses MongoDB Atlas or replicated instance
- [ ] Backend deployed to platform supporting WebSockets (not Vercel)
- [ ] Rate limiting tested
- [ ] HTTPS enforced (via reverse proxy)
- [ ] Logs monitored
- [ ] Error tracking configured (Sentry, DataDog, etc)
- [ ] Database indexes created
- [ ] SSL certificates configured
- [ ] Environment variables secured (not in code)
