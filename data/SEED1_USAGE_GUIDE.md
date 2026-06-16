# 🌱 Seed1.js - Complete Database Population Guide

## Overview
`seed1.js` is a comprehensive database seeding script that populates your entire inventory management system with realistic demo data across all 11 major collections:

✅ Users (5)  
✅ Suppliers (5)  
✅ Warehouses (3)  
✅ Products (8)  
✅ Batches (5)  
✅ Orders (5)  
✅ Shipments (3)  
✅ Alerts (6)  
✅ CycleCounts (2)  
✅ AuditLogs (9)  
✅ Forecasts (4)  

**Total: 56 demo records with realistic relationships and interconnections**

---

## What's Included

### 1. **Users (5 records)**
- 1 Admin user
- 2 Manager users
- 2 Staff users
- All with verified emails and login timestamps
- **Demo Credentials:**
  - Admin: `admin@inventory.com` / `admin@123`
  - Manager: `manager@inventory.com` / `manager@123`
  - Staff: `staff1@inventory.com` / `staff@123`

### 2. **Suppliers (5 records)**
- TechCorp Electronics
- GlobalParts Distribution
- Premium Components Ltd
- Budget Parts Supply
- International Electronics Co
- Each with: contact info, payment terms, lead times, ratings, performance metrics

### 3. **Warehouses (3 records)**
- Main Warehouse - Central (Atlanta)
- Secondary Warehouse - West (Los Angeles)
- Express Warehouse - East (New York)
- Each with: capacity, zones, equipment, temperature controls, operating hours, manager assignments

### 4. **Products (8 records)**
- Laptop Pro 15 (Premium, A-class)
- USB-C Cable 2M (Accessory, B-class)
- Monitor 4K 27" (Premium, A-class)
- Wireless Mouse (Accessory, B-class)
- Mechanical Keyboard RGB (Accessory, B-class)
- Laptop Stand Aluminum (Accessory, C-class)
- SSD 1TB NVMe (Storage, A-class)
- USB Hub 7-Port (Accessory, C-class)
- All with: pricing, stock levels, ABC classification, sales velocity, reorder settings

### 5. **Batches (5 records)**
- Links products to suppliers with traceability
- Manufacturing and expiry dates
- FIFO positioning for inventory rotation
- Quality status tracking
- 1 batch with expiry warning for demo alerts

### 6. **Orders (5 records)**
- 2 Purchase Orders (from suppliers)
- 3 Sales Orders (to customers)
- Various statuses: PENDING, APPROVED, PROCESSING, DELIVERED, READY_FOR_SHIPMENT
- Line items with product references
- Complete shipping & billing addresses

### 7. **Shipments (3 records)**
- Linked to orders with full tracking
- Multiple carriers: FedEx, UPS, DHL
- Real routing with origin/destination coordinates
- Current location tracking
- Driver and vehicle information
- Weather impact data
- Shipping costs breakdown

### 8. **Alerts (6 records)**
- STOCK_LOW (acknowledged)
- SHIPMENT_DELAYED (active with action items)
- EXPIRY_WARNING (high severity)
- ANOMALY_DETECTED (resolved - demonstrates analytics)
- QUALITY_ISSUE (active with quarantine action)
- FORECAST_DEVIATION (low severity)
- Demonstrates alert lifecycle: active → acknowledged/resolved

### 9. **Cycle Counts (2 records)**
- CC-2024-001 (COMPLETED) - Manual cycle count with discrepancies
- CC-2024-002 (IN_PROGRESS) - ABC analysis in progress
- Shows inventory counting discrepancies, reasons, and accuracy metrics
- Dashboard data for physical inventory verification

### 10. **Audit Logs (9 records)**
- Documents all inventory transactions
- Actions: CREATE, STOCK_IN, STOCK_OUT, UPDATE, TRANSFER
- Entity types: Product, Order, Shipment
- User tracking for compliance and analytics
- **Feeds Dashboard Analytics**

### 11. **Forecasts (4 records)**
- Demand forecasting for multiple products
- Forecasting methods: SIMPLE_MOVING_AVERAGE, EXPONENTIAL_SMOOTHING, LINEAR_REGRESSION, WEIGHTED_MOVING_AVERAGE
- Historical data with sales trends
- Confidence intervals and accuracy metrics
- External & internal impact factors
- Recommendations for safety stock & reorder points
- Statuses: GENERATED, REVIEWED, APPROVED, IMPLEMENTED
- **Feeds Dashboard Analytics & LL Analytics (ML/LLM features)**

---

## How to Run

### Prerequisites
- Node.js installed
- MongoDB running (locally or via Docker)
- Backend dependencies installed

### Steps

#### 1. Install dependencies (if not already done)
```bash
cd backend
npm install
```

#### 2. Ensure MongoDB is running
```bash
# Option A: Local MongoDB
# Make sure MongoDB service is running on your machine

# Option B: Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

#### 3. Configure environment variables
```bash
# Copy .env.example to .env (if not already done)
cp .env.example .env

# Edit .env and ensure:
MONGO_URI=mongodb://localhost:27017/inventorySystem
# or your actual MongoDB connection string
```

#### 4. Run the seed script
```bash
# From backend directory
node seed1.js
```

#### 5. Expected output
```
🔗 Connecting to MongoDB...
✅ Connected to MongoDB
🗑️  Clearing existing data...
✅ Data cleared

👤 Creating users...
✅ 5 users created

🏢 Creating suppliers...
✅ 5 suppliers created

🏭 Creating warehouses...
✅ 3 warehouses created

📦 Creating products...
✅ 8 products created

... (more collections)

============================================================
✅ SEED1.JS - FULL DATABASE POPULATION COMPLETE!
============================================================

📊 SUMMARY OF CREATED DATA:
   👤 Users: 5
   🏢 Suppliers: 5
   🏭 Warehouses: 3
   📦 Products: 8
   📋 Batches: 5
   📄 Orders: 5
   🚚 Shipments: 3
   🚨 Alerts: 6
   📊 Cycle Counts: 2
   📜 Audit Logs: 9
   📈 Forecasts: 4

✨ All collections populated successfully!
✨ Dashboard, Analytics, and LL Analytics data ready!

🔐 Test Credentials:
   Admin: admin@inventory.com / admin@123
   Manager: manager@inventory.com / manager@123
   Staff: staff1@inventory.com / staff@123
```

---

## Data Relationships

The seed data is carefully interconnected to simulate real-world scenarios:

```
Suppliers
    ├── Products (each has a supplier)
    ├── Batches (received from suppliers)
    └── Orders (PURCHASE type)

Warehouses
    ├── Products (stored in warehouse)
    ├── Batches (locations tracked)
    └── Cycle Counts (inventory audits)

Products
    ├── Batches (stock tracking by batch)
    ├── Orders (Sales/Purchase lines)
    ├── Shipments (items being delivered)
    ├── Alerts (stock, expiry, anomaly alerts)
    └── Forecasts (demand predictions)

Orders
    ├── Shipments (fulfillment)
    ├── Audit Logs (transaction records)
    └── Alerts (shipment delays)

Users
    ├── Created/Approved Orders
    ├── Created/Verified Cycle Counts
    ├── Acknowledged/Resolved Alerts
    ├── Reviewed Forecasts
    └── Audit Log entries

Audit Logs
    └── Dashboard Analytics (transaction history)

Alerts
    └── Dashboard Analytics (critical events)

Forecasts
    └── Dashboard Analytics & LL Analytics (ML/predictions)
```

---

## Dashboard Data Coverage

All dashboard components will have data:

✅ **Overview Widgets**
- Total products, orders, shipments, alerts

✅ **Analytics**
- Sales trends (from Orders)
- Inventory levels (from Products & Batches)
- Shipment status (from Shipments)
- Alert metrics (from Alerts)

✅ **Charts & Visualizations**
- Sales velocity trends
- Stock distribution by warehouse
- Supplier performance ratings
- ABC inventory classification
- Order status breakdown
- Shipment carrier performance

✅ **LL Analytics (ML/LLM Features)**
- Forecast accuracy metrics
- Anomaly detection records (Alerts)
- Demand predictions (Forecasts)
- Quality assurance patterns (CycleCounts, Alerts)

✅ **Reports**
- Audit trails (AuditLogs)
- Inventory discrepancies (CycleCounts)
- Supplier performance (Suppliers in Orders)
- Forecast vs. actual (Forecasts vs. Orders)

---

## Modifying the Seed Data

To customize the seed data, edit `seed1.js`:

### Add more products
```javascript
const products = await Product.create([
  // ... existing products ...
  {
    name: 'Your New Product',
    sku: 'NEW-SKU-001',
    category: 'Electronics',
    supplier: suppliers[0]._id,
    price: 99.99,
    cost: 50.00,
    stock: 100,
    // ... more fields
  }
]);
```

### Add more users
```javascript
const users = await User.create([
  // ... existing users ...
  {
    name: 'New User',
    email: 'newuser@inventory.com',
    password: 'password123',
    role: 'MANAGER',
    // ... more fields
  }
]);
```

### Adjust quantities, dates, or locations
Edit any of the data objects to match your test scenarios.

---

## Resetting Data

To clear all data and start fresh:

```bash
# Option 1: Run seed1.js again (clears and repopulates)
node seed1.js

# Option 2: Manual MongoDB reset
mongo
> use inventorySystem
> db.dropDatabase()
> exit
```

---

## Testing After Seed

### 1. Login to frontend
```
Email: admin@inventory.com
Password: admin@123
```

### 2. Verify data in Dashboard
- Check product counts
- View orders and shipments
- Review alerts
- Check analytics

### 3. Test API endpoints
```bash
# Get all products
curl http://localhost:5000/api/products \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get alerts
curl http://localhost:5000/api/alerts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get forecasts
curl http://localhost:5000/api/forecasts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Troubleshooting

### "Cannot find module 'mongoose'"
```bash
cd backend
npm install mongoose
```

### "connection refused"
- Ensure MongoDB is running
- Check MONGO_URI in .env
- Verify MongoDB port (default: 27017)

### "Duplicate key error"
- May happen if running seed1.js twice without clearing first
- Solution: Delete MongoDB database or edit seed data to use unique SKUs/codes

### "timeout exceeded"
- MongoDB connection too slow
- Increase timeout or check network

---

## File Info
- **Location**: `backend/seed1.js`
- **Lines**: 1,633
- **Execution Time**: ~5-10 seconds
- **Total Records Created**: 56+
- **Size**: ~80KB

---

## Summary

✨ **seed1.js provides everything you need to:**
1. ✅ Populate all 11 collections with realistic data
2. ✅ Test Dashboard, Analytics, and LL Analytics features
3. ✅ Verify API endpoints with live data
4. ✅ Demonstrate alert lifecycle, forecasting, and tracking
5. ✅ Showcase data relationships and workflow
6. ✅ Have multiple test users with different roles
7. ✅ Support integration testing and UAT

**Happy seeding! 🌱**
