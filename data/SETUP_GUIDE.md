# Complete Setup & Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB Atlas account
- Git

### 1. Backend Setup

```bash
cd backend
npm install

# Create .env file with required variables
cp .env.example .env
```

**Required Environment Variables in `.env`:**

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/inventorySystem

# JWT
JWT_SECRET=your_random_32_char_secret_here
JWT_EXPIRY=30d

# CORS
CORS_ORIGIN=http://localhost:5173
SOCKET_IO_CORS_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Email (SendGrid)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@inventory.com

# Maps (Choose one: Mapbox or Google Maps)
MAPBOX_API_KEY=your_mapbox_token
# OR
GOOGLE_MAPS_API_KEY=your_google_maps_key
MAPS_PROVIDER=mapbox

# Weather
OPENWEATHER_API_KEY=your_openweather_key
```

**Start Backend:**
```bash
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
EOF
```

**Start Frontend:**
```bash
npm run dev
```

Visit: `http://localhost:5173`

---

## 🔑 Getting API Keys

### Mapbox (Free Tier Available)
1. Go to https://account.mapbox.com
2. Sign up for free account
3. Create new token with scopes: `maps:read`
4. Copy token to `MAPBOX_API_KEY`

### Google Maps
1. Go to https://console.cloud.google.com
2. Create new project
3. Enable Maps, Directions, Distance Matrix APIs
4. Create API key
5. Copy to `GOOGLE_MAPS_API_KEY`

### OpenWeatherMap
1. Go to https://openweathermap.org/api
2. Sign up for free account
3. Get API key from dashboard
4. Copy to `OPENWEATHER_API_KEY`

### SendGrid
1. Go to https://sendgrid.com
2. Create account
3. Verify sender email
4. Generate API key
5. Copy to `SENDGRID_API_KEY`

---

## 📊 Features Overview

### New Pages Added

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | KPI cards for all systems, quick metrics |
| Shipments | `/shipments` | Live tracking with weather impact |
| Suppliers | `/suppliers` | Management, rating, performance |
| Batches | `/batches` | FIFO/FEFO, expiry calendar |
| Alerts | `/alerts` | Center for all system alerts |
| Analytics | `/analytics` | Advanced charts and forecasting |

### New Backend APIs

```
GET    /api/shipments               - List shipments
POST   /api/shipments               - Create shipment
PUT    /api/shipments/:id/location  - Update live location
GET    /api/shipments/:id/weather   - Get weather impact

GET    /api/suppliers               - List suppliers
POST   /api/suppliers               - Create supplier
GET    /api/suppliers/:id/performance - Performance metrics

GET    /api/batches/product/:id     - Get product batches
POST   /api/batches/allocate        - Allocate using FIFO/FEFO
GET    /api/batches/rotation/:id    - Rotation recommendations
GET    /api/batches/analytics/overview - Batch analytics

POST   /api/forecasts/generate/:id  - Generate forecast
GET    /api/forecasts/product/:id   - Get product forecasts
POST   /api/forecasts/what-if       - What-if analysis

GET    /api/alerts                  - List alerts
POST   /api/alerts/detect-anomalies - Run anomaly detection
POST   /api/alerts/detect-dead-stock - Find dead stock
```

---

## 🔄 Real-time WebSocket Events

### Client → Server
```javascript
// Join shipment tracking
socket.emit('join-shipment', shipmentId);
socket.emit('leave-shipment', shipmentId);

// Join warehouse monitoring
socket.emit('join-warehouse', warehouseId);
socket.emit('leave-warehouse', warehouseId);

// Subscribe to alerts
socket.emit('subscribe-alerts', filters);
socket.emit('unsubscribe-alerts');

// Join dashboard
socket.emit('join-dashboard');
socket.emit('leave-dashboard');
```

### Server → Client
```javascript
// Shipment updates
socket.on('shipment-update', (data) => {
  // { shipmentId, location, status, estimatedDelivery }
});

// Warehouse activity
socket.on('warehouse-activity', (data) => {
  // { warehouseId, activity }
});

// Batch updates
socket.on('batch-update', (data) => {
  // { batchId, status, expiryAlert }
});

// Alert notifications
socket.on('new-alert', (alertData) => {
  // { type, severity, title, message }
});

// Dashboard updates
socket.on('dashboard-update', (data) => {
  // { type, data }
});
```

---

## 🧪 Testing

### Manual API Testing
```bash
# Start backend
cd backend && npm run dev

# In another terminal, test endpoints
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/shipments

# Test WebSocket
npm install -g wscat
wscat -c "ws://localhost:5000"
```

### Frontend Testing
1. Login with test credentials
2. Navigate to each page to verify data loading
3. Check console for WebSocket connection status
4. Test real-time updates by creating/updating records

---

## 📦 Database Models

### Collections Created
- `shipments` - Live tracking data
- `suppliers` - Supplier information
- `batches` - Batch/lot tracking
- `cyclecounts` - Inventory counting
- `forecasts` - Demand predictions
- `alerts` - System alerts

### Key Fields to Note
- Batch: FIFO position, expiry date, quality status
- Shipment: Current location (GPS), route history, weather impact
- Forecast: Predicted demand, confidence intervals
- Alert: Severity, actions, acknowledgment status

---

## 🛡️ Security Checklist

- [ ] JWT_SECRET is randomized (32+ chars)
- [ ] MONGO_URI uses strong database password
- [ ] API keys never committed to git (.env in .gitignore)
- [ ] CORS_ORIGIN set to production domain
- [ ] HTTPS enabled in production
- [ ] Rate limiting configured
- [ ] Input validation on all routes
- [ ] Database backups scheduled

---

## 🚀 Production Deployment

### Option 1: Railway.app
```bash
# Connect GitHub repo
# Set environment variables in dashboard
# Deploy
```

### Option 2: Render.com
```bash
# Create new Web Service
# Connect GitHub
# Set build command: npm install
# Set start command: npm start
# Add environment variables
# Deploy
```

### Option 3: AWS EC2
```bash
# SSH into instance
git clone your-repo
cd inventory-management-system

# Install dependencies
npm install --prefix backend
npm install --prefix frontend

# Build frontend
cd frontend && npm run build

# Start backend with PM2
npm install -g pm2
pm2 start backend/server.js --name inventory-api
```

---

## 📞 Troubleshooting

### WebSocket Connection Failed
- Check SOCKET_IO_CORS_ORIGIN in backend
- Verify frontend can reach backend URL
- Check browser console for specific error

### Maps Not Loading
- Verify Mapbox/Google Maps API key
- Check API key has correct permissions
- Ensure addresses have valid coordinates

### Alerts Not Showing
- Check API response in Network tab
- Verify user has correct permissions
- Check WebSocket connection in Console

### Forecasts Not Generating
- Need 3+ months historical data
- Check date range for sales orders
- Verify products have price and stock data

---

## 📚 Additional Resources

- [Mapbox Documentation](https://docs.mapbox.com)
- [Google Maps API](https://developers.google.com/maps)
- [OpenWeatherMap API](https://openweathermap.org/api)
- [Socket.IO Documentation](https://socket.io/docs)
- [MongoDB Documentation](https://docs.mongodb.com)

---

## ✅ Feature Checklist

Backend Implementation:
- [x] Shipment model with GPS tracking
- [x] Batch tracking with FIFO/FEFO
- [x] Supplier management system
- [x] Demand forecasting engine
- [x] Alert and anomaly detection
- [x] Weather impact analysis
- [x] Route optimization
- [x] WebSocket real-time updates

Frontend Implementation:
- [x] Shipment tracker page with map
- [x] Supplier management UI
- [x] Batch expiry calendar
- [x] Alert center
- [x] Advanced analytics dashboard
- [x] Real-time status indicators
- [x] Dark theme support
- [x] Responsive design

---

## 📊 Expected Dashboard Metrics

**On First Load (No Data):**
- All shipments: 0
- Batch health: 100%
- Active alerts: 0
- Delivery rate: 0%

**After Creating Test Data:**
- Total products visible in Products page
- Orders showing in Orders page
- Shipments appearing in Shipments page
- Alerts triggering for low stock items
- Batch expiry tracking working

---

## 🎯 Next Steps

1. Deploy backend to production
2. Deploy frontend to production
3. Configure domain and SSL
4. Set up monitoring and logging
5. Create backup strategy
6. Train users on new features
7. Monitor performance metrics
8. Gather feedback for iterations

---

Generated: 2024
System: Inventory Management MERN Stack with Advanced Features