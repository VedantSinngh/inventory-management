import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve directory name for resolving absolute paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env file from backend
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

// Import mongoose models
import User from '../../backend/models/User.js';
import Warehouse from '../../backend/models/Warehouse.js';
import Supplier from '../../backend/models/Supplier.js';
import Product from '../../backend/models/Product.js';
import Batch from '../../backend/models/Batch.js';
import Order from '../../backend/models/Order.js';
import Shipment from '../../backend/models/Shipment.js';
import Alert from '../../backend/models/Alert.js';
import CycleCount from '../../backend/models/CycleCount.js';
import Return from '../../backend/models/Return.js';
import AuditLog from '../../backend/models/AuditLog.js';

async function main() {
  try {
    const uris = [
      process.env.MONGODB_URI,
      process.env.MONGO_URI,
      'mongodb://mongodb:mongodb_password_dev@localhost:27017/inventorySystem?authSource=admin',
      'mongodb://localhost:27017/inventorySystem'
    ].filter(Boolean);

    let connected = false;
    for (const uri of uris) {
      try {
        // Safe logging of connection URI (obscuring password if present)
        const safeUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
        console.log(`🔗 Trying to connect to MongoDB at: ${safeUri}`);
        await mongoose.connect(uri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 4000
        });
        console.log('✅ Connected to MongoDB');
        connected = true;
        break;
      } catch (err) {
        console.warn(`⚠️ Connection failed for URI. Trying next fallback...`);
      }
    }

    if (!connected) {
      throw new Error('❌ Unable to connect to any MongoDB instance. Please check if your MongoDB service/Docker container is running.');
    }

    const db = mongoose.connection.db;

    // ─────────────────────────────────────────────
    // CLEAR COLLECTIONS
    // ─────────────────────────────────────────────
    console.log('🗑️ Clearing existing data from all collections...');
    await Promise.all([
      User.deleteMany({}),
      Warehouse.deleteMany({}),
      Supplier.deleteMany({}),
      Product.deleteMany({}),
      Batch.deleteMany({}),
      Order.deleteMany({}),
      Shipment.deleteMany({}),
      Alert.deleteMany({}),
      CycleCount.deleteMany({}),
      Return.deleteMany({}),
      AuditLog.deleteMany({}),
      db.collection('inventories').deleteMany({}).catch(() => {}),
      db.collection('reorderrequests').deleteMany({}).catch(() => {}),
      db.collection('deadstocks').deleteMany({}).catch(() => {}),
    ]);
    console.log('✅ All collections cleared successfully');

    // ─────────────────────────────────────────────
    // 1. USERS
    // ─────────────────────────────────────────────
    console.log('👤 Seeding Users...');
    const users = await User.create([
      {
        name: 'Aarav Sharma',
        email: 'admin@logisticshub.in',
        password: 'admin123',
        role: 'ADMIN',
        isVerified: true,
        status: 'ACTIVE'
      },
      {
        name: 'Rajesh Patel',
        email: 'manager@logisticshub.in',
        password: 'manager123',
        role: 'MANAGER',
        isVerified: true,
        status: 'ACTIVE'
      },
      {
        name: 'Amit Kumar',
        email: 'staff@logisticshub.in',
        password: 'staff123',
        role: 'STAFF',
        isVerified: true,
        status: 'ACTIVE'
      }
    ]);
    console.log(`👤 Users seeded: ${users.length}`);

    const adminId = users[0]._id;
    const managerId = users[1]._id;
    const staffId = users[2]._id;

    // ─────────────────────────────────────────────
    // 2. WAREHOUSES
    // ─────────────────────────────────────────────
    console.log('🏢 Seeding Warehouses...');
    const warehouses = await Warehouse.create([
      {
        name: 'Mumbai Central Warehouse',
        location: 'Mumbai, Maharashtra',
        address: {
          street: 'Gala No. 12, Mittal Industrial Estate, Andheri-Kurla Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400059',
          country: 'India',
          latitude: 19.1112,
          longitude: 72.8765
        },
        capacity: 50000,
        zones: [{
          name: 'Zone A',
          type: 'STORAGE',
          capacity: 20000,
          aisles: [{
            name: 'Aisle A1',
            shelves: [{
              name: 'Shelf S1',
              bins: [{
                name: 'Bin B1',
                capacity: 500,
                occupied: 0,
                products: []
              }]
            }]
          }]
        }],
        operatingHours: {
          monday: { open: '09:00', close: '21:00' },
          tuesday: { open: '09:00', close: '21:00' },
          wednesday: { open: '09:00', close: '21:00' },
          thursday: { open: '09:00', close: '21:00' },
          friday: { open: '09:00', close: '21:00' },
          saturday: { open: '10:00', close: '18:00' },
          sunday: { open: '10:00', close: '16:00' }
        },
        equipment: [
          { type: 'FORKLIFT', count: 3, status: 'AVAILABLE' },
          { type: 'SCANNER', count: 10, status: 'AVAILABLE' }
        ],
        temperature: {
          min: 15,
          max: 25,
          zones: [{ name: 'Zone A', temperature: { min: 18, max: 24 }, products: [] }]
        },
        securityLevel: 'HIGH',
        manager: managerId
      },
      {
        name: 'Delhi North Warehouse',
        location: 'Delhi',
        address: {
          street: 'Plot No. 45, Khasra 82, Alipur Industrial Area',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110036',
          country: 'India',
          latitude: 28.8021,
          longitude: 77.1354
        },
        capacity: 40000,
        zones: [{
          name: 'Zone B',
          type: 'STORAGE',
          capacity: 15000,
          aisles: [{
            name: 'Aisle B1',
            shelves: [{
              name: 'Shelf S2',
              bins: [{
                name: 'Bin B2',
                capacity: 400,
                occupied: 0,
                products: []
              }]
            }]
          }]
        }],
        operatingHours: {
          monday: { open: '09:00', close: '21:00' },
          tuesday: { open: '09:00', close: '21:00' },
          wednesday: { open: '09:00', close: '21:00' },
          thursday: { open: '09:00', close: '21:00' },
          friday: { open: '09:00', close: '21:00' },
          saturday: { open: '10:00', close: '18:00' },
          sunday: { open: '10:00', close: '16:00' }
        },
        equipment: [
          { type: 'FORKLIFT', count: 2, status: 'AVAILABLE' },
          { type: 'SCANNER', count: 8, status: 'AVAILABLE' }
        ],
        temperature: {
          min: 15,
          max: 25,
          zones: [{ name: 'Zone B', temperature: { min: 18, max: 24 }, products: [] }]
        },
        securityLevel: 'HIGH',
        manager: managerId
      }
    ]);
    console.log(`🏢 Warehouses seeded: ${warehouses.length}`);

    const mumbaiWarehouseId = warehouses[0]._id;
    const delhiWarehouseId = warehouses[1]._id;

    // ─────────────────────────────────────────────
    // 3. SUPPLIERS
    // ─────────────────────────────────────────────
    console.log('🏭 Seeding Suppliers...');
    const suppliers = await Supplier.create([
      {
        name: 'Reliance Digital Logistics',
        code: 'SUP-REL-DIG',
        contactInfo: {
          email: 'contact@reliancedigital.in',
          phone: '+91-22-6789-0123',
          website: 'www.reliancedigital.in',
          address: {
            street: 'Reliance Centre, Off Western Express Highway, Santacruz East',
            city: 'Mumbai',
            state: 'Maharashtra',
            zipCode: '400055',
            country: 'India'
          }
        },
        primaryContact: {
          name: 'Vikram Mehta',
          title: 'Key Account Manager',
          email: 'vikram.mehta@reliancedigital.in',
          phone: '+91-9876543210'
        },
        paymentTerms: 'NET_30',
        leadTime: 5,
        rating: 5,
        status: 'ACTIVE',
        categories: ['Electronics'],
        notes: ['GSTIN: 27AAACR1203M1ZS'],
        createdBy: adminId
      },
      {
        name: 'Britannia Distribution Ltd',
        code: 'SUP-BRIT-FMCG',
        contactInfo: {
          email: 'sales@britannia.in',
          phone: '+91-80-3768-4500',
          website: 'www.britannia.in',
          address: {
            street: 'Prestige Shantiniketan, Whitefield',
            city: 'Bengaluru',
            state: 'Karnataka',
            zipCode: '560048',
            country: 'India'
          }
        },
        primaryContact: {
          name: 'Anil Murthy',
          title: 'Logistics Lead',
          email: 'anil.murthy@britannia.in',
          phone: '+91-9123456789'
        },
        paymentTerms: 'NET_15',
        leadTime: 3,
        rating: 4,
        status: 'ACTIVE',
        categories: ['FMCG'],
        notes: ['GSTIN: 29AAACB4820K1ZG'],
        createdBy: adminId
      },
      {
        name: 'Aditya Birla Fashion',
        code: 'SUP-ABFRL-APP',
        contactInfo: {
          email: 'info@abfrl.in',
          phone: '+91-11-2345-6789',
          website: 'www.abfrl.com',
          address: {
            street: 'DDA Complex, Okhla Industrial Area Phase 1',
            city: 'Delhi',
            state: 'Delhi',
            zipCode: '110020',
            country: 'India'
          }
        },
        primaryContact: {
          name: 'Neha Sharma',
          title: 'B2B Executive',
          email: 'neha.sharma@abfrl.in',
          phone: '+91-9988776655'
        },
        paymentTerms: 'NET_45',
        leadTime: 7,
        rating: 4,
        status: 'ACTIVE',
        categories: ['Apparel'],
        notes: ['GSTIN: 07AAACA4510B1ZY'],
        createdBy: adminId
      }
    ]);
    console.log(`🏭 Suppliers seeded: ${suppliers.length}`);

    const relSupplierId = suppliers[0]._id;
    const britSupplierId = suppliers[1]._id;
    const abfSupplierId = suppliers[2]._id;

    // ─────────────────────────────────────────────
    // 4. PRODUCTS
    // ─────────────────────────────────────────────
    console.log('📦 Seeding Products...');
    const products = await Product.create([
      {
        name: 'iPhone 15 Pro Max',
        sku: 'APL-IPH15PM-256',
        category: 'Electronics',
        supplier: relSupplierId,
        description: 'Apple iPhone 15 Pro Max 256GB, Blue Titanium',
        price: 159900,
        cost: 130000,
        stock: 25,
        lowStockThreshold: 5,
        warehouse: mumbaiWarehouseId,
        hasExpiry: false,
        abcClassification: 'A',
        turnoverRate: 12,
        salesVelocity: 2,
        autoReorder: true,
        reorderPoint: 7,
        reorderQuantity: 10,
        upc: '190199000018',
        tags: ['electronics', 'premium', 'apple', 'smartphone']
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        sku: 'SAM-S24U-512',
        category: 'Electronics',
        supplier: relSupplierId,
        description: 'Samsung Galaxy S24 Ultra 512GB, Titanium Gray',
        price: 129999,
        cost: 105000,
        stock: 4, // Below reorder point of 12
        lowStockThreshold: 10,
        warehouse: mumbaiWarehouseId,
        hasExpiry: false,
        abcClassification: 'A',
        turnoverRate: 15,
        salesVelocity: 3,
        autoReorder: true,
        reorderPoint: 12,
        reorderQuantity: 15,
        upc: '880609000021',
        tags: ['electronics', 'premium', 'samsung', 'smartphone']
      },
      {
        name: 'Britannia Good Day Cookies Pack of 10',
        sku: 'BRT-GDB-10P',
        category: 'FMCG',
        supplier: britSupplierId,
        description: 'Britannia Good Day Butter Cookies Pack of 10',
        price: 150,
        cost: 110,
        stock: 500,
        lowStockThreshold: 100,
        warehouse: delhiWarehouseId,
        hasExpiry: true,
        shelfLife: 180,
        abcClassification: 'C',
        turnoverRate: 50,
        salesVelocity: 15,
        autoReorder: true,
        reorderPoint: 150,
        reorderQuantity: 300,
        upc: '890106000034',
        tags: ['fmcg', 'cookies', 'britannia', 'food']
      },
      {
        name: 'Louis Philippe Slim Fit Shirt XL',
        sku: 'LP-SFS-SHIRT-XL',
        category: 'Apparel',
        supplier: abfSupplierId,
        description: 'Louis Philippe Slim Fit Formal Cotton Shirt - XL Size',
        price: 2499,
        cost: 1200,
        stock: 80,
        lowStockThreshold: 20,
        warehouse: delhiWarehouseId,
        hasExpiry: false,
        abcClassification: 'B',
        turnoverRate: 8,
        salesVelocity: 1.5,
        autoReorder: true,
        reorderPoint: 30,
        reorderQuantity: 50,
        upc: '890333000045',
        tags: ['apparel', 'formal', 'shirt', 'louis-philippe']
      },
      {
        name: 'Sony WH-1000XM5 Wireless Headphones',
        sku: 'SNY-WH1000XM5-B',
        category: 'Electronics',
        supplier: relSupplierId,
        description: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones - Black',
        price: 29990,
        cost: 22000,
        stock: 2, // Below ROP of 10
        lowStockThreshold: 8,
        warehouse: mumbaiWarehouseId,
        hasExpiry: false,
        abcClassification: 'B',
        turnoverRate: 10,
        salesVelocity: 1.2,
        autoReorder: true,
        reorderPoint: 10,
        reorderQuantity: 15,
        upc: '454873000056',
        tags: ['electronics', 'headphones', 'sony', 'audio']
      }
    ]);
    console.log(`📦 Products seeded: ${products.length}`);

    // Update warehouses to link products in zones/bins
    warehouses[0].zones[0].aisles[0].shelves[0].bins[0].products = [
      { product: products[0]._id, quantity: 25 },
      { product: products[1]._id, quantity: 4 },
      { product: products[4]._id, quantity: 2 }
    ];
    warehouses[0].zones[0].aisles[0].shelves[0].bins[0].occupied = 31;
    await warehouses[0].save();

    warehouses[1].zones[0].aisles[0].shelves[0].bins[0].products = [
      { product: products[2]._id, quantity: 500 },
      { product: products[3]._id, quantity: 80 }
    ];
    warehouses[1].zones[0].aisles[0].shelves[0].bins[0].occupied = 580;
    await warehouses[1].save();
    console.log('✅ Warehouses zones updated with seeded products');

    // ─────────────────────────────────────────────
    // 5. INVENTORY (direct mappings)
    // ─────────────────────────────────────────────
    console.log('🗄️ Seeding Inventory collection (direct mappings)...');
    const inventoryDocs = [
      {
        product: products[0]._id,
        productName: products[0].name,
        sku: products[0].sku,
        warehouse: mumbaiWarehouseId,
        warehouseName: warehouses[0].name,
        quantity: 25,
        bin: 'Bin B1',
        lastUpdated: new Date()
      },
      {
        product: products[1]._id,
        productName: products[1].name,
        sku: products[1].sku,
        warehouse: mumbaiWarehouseId,
        warehouseName: warehouses[0].name,
        quantity: 4,
        bin: 'Bin B1',
        lastUpdated: new Date()
      },
      {
        product: products[2]._id,
        productName: products[2].name,
        sku: products[2].sku,
        warehouse: delhiWarehouseId,
        warehouseName: warehouses[1].name,
        quantity: 500,
        bin: 'Bin B2',
        lastUpdated: new Date()
      },
      {
        product: products[3]._id,
        productName: products[3].name,
        sku: products[3].sku,
        warehouse: delhiWarehouseId,
        warehouseName: warehouses[1].name,
        quantity: 80,
        bin: 'Bin B2',
        lastUpdated: new Date()
      },
      {
        product: products[4]._id,
        productName: products[4].name,
        sku: products[4].sku,
        warehouse: mumbaiWarehouseId,
        warehouseName: warehouses[0].name,
        quantity: 2,
        bin: 'Bin B1',
        lastUpdated: new Date()
      }
    ];
    await db.collection('inventories').insertMany(inventoryDocs);
    console.log(`🗄️ Inventories collection seeded: ${inventoryDocs.length}`);

    // ─────────────────────────────────────────────
    // 6. BATCHES
    // ─────────────────────────────────────────────
    console.log('🔂 Seeding Batches...');
    const now = new Date();
    const expirySoon = new Date();
    expirySoon.setDate(now.getDate() + 90); // 90 days expiry for FMCG

    const batches = await Batch.create([
      {
        batchNumber: 'BAT-APL-202601',
        product: products[0]._id,
        supplier: relSupplierId,
        manufacturingDate: new Date('2026-01-15'),
        expiryDate: new Date('2031-01-15'),
        quantityReceived: 30,
        quantityAvailable: 25,
        unitCost: 130000,
        location: {
          warehouse: mumbaiWarehouseId,
          aisle: 'A1',
          shelf: 'S1',
          bin: 'B1'
        },
        qualityStatus: 'APPROVED',
        createdBy: adminId
      },
      {
        batchNumber: 'BAT-BRT-202605',
        product: products[2]._id,
        supplier: britSupplierId,
        manufacturingDate: new Date('2026-05-10'),
        expiryDate: expirySoon,
        quantityReceived: 600,
        quantityAvailable: 500,
        unitCost: 110,
        location: {
          warehouse: delhiWarehouseId,
          aisle: 'B1',
          shelf: 'S2',
          bin: 'B2'
        },
        qualityStatus: 'APPROVED',
        createdBy: adminId
      }
    ]);
    console.log(`🔂 Batches seeded: ${batches.length}`);

    // Cross link batches to products
    products[0].batches = [batches[0]._id];
    await products[0].save();
    products[2].batches = [batches[1]._id];
    await products[2].save();
    console.log('✅ Products updated with batch references');

    // ─────────────────────────────────────────────
    // 7. ORDERS
    // ─────────────────────────────────────────────
    console.log('📝 Seeding Orders...');
    const orders = await Order.create([
      {
        type: 'PURCHASE',
        status: 'APPROVED',
        items: [{
          product: products[2]._id,
          batch: batches[1]._id,
          quantity: 600,
          priceAtTime: 110
        }],
        totalAmount: 66000,
        paymentStatus: 'PAID',
        paymentMethod: 'Wire Transfer',
        priority: 'NORMAL',
        billingAddress: {
          street: 'Plot No. 45, Khasra 82, Alipur Industrial Area',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110036',
          country: 'India'
        },
        createdBy: managerId,
        approvedBy: adminId,
        approvedAt: now
      },
      {
        type: 'SALES',
        status: 'SHIPPED',
        items: [
          {
            product: products[0]._id,
            batch: batches[0]._id,
            quantity: 5,
            priceAtTime: 159900
          },
          {
            product: products[4]._id,
            quantity: 2,
            priceAtTime: 29990
          }
        ],
        totalAmount: 859480,
        paymentStatus: 'PAID',
        paymentMethod: 'Credit Card',
        priority: 'HIGH',
        shippingAddress: {
          street: 'Flat 402, Sea Breeze Apartments, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400050',
          country: 'India',
          latitude: 19.0544,
          longitude: 72.8402
        },
        createdBy: staffId,
        approvedBy: managerId,
        approvedAt: now
      },
      {
        type: 'PURCHASE',
        status: 'PENDING',
        items: [{
          product: products[1]._id,
          quantity: 15,
          priceAtTime: 105000
        }],
        totalAmount: 1575000,
        paymentStatus: 'PENDING',
        priority: 'URGENT',
        createdBy: managerId
      }
    ]);
    console.log(`📝 Orders seeded: ${orders.length}`);

    // ─────────────────────────────────────────────
    // 8. SHIPMENTS
    // ─────────────────────────────────────────────
    console.log('🚚 Seeding Shipments...');
    const shipments = await Shipment.create([
      {
        order: orders[1]._id,
        trackingNumber: 'DEL-IN-8293021',
        status: 'DELIVERED',
        carrier: 'Delhivery',
        originAddress: {
          street: 'Gala No. 12, Mittal Industrial Estate, Andheri-Kurla Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400059',
          country: 'India',
          latitude: 19.1112,
          longitude: 72.8765
        },
        destinationAddress: {
          street: 'Flat 402, Sea Breeze Apartments, Bandra West',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400050',
          country: 'India',
          latitude: 19.0544,
          longitude: 72.8402
        },
        currentLocation: {
          latitude: 19.0544,
          longitude: 72.8402,
          timestamp: now,
          address: 'Bandra West, Mumbai'
        },
        estimatedDeliveryDate: now,
        actualDeliveryDate: now,
        weatherImpact: { hasImpact: false },
        items: [
          { product: products[0]._id, quantity: 5, batch: batches[0]._id },
          { product: products[4]._id, quantity: 2 }
        ],
        createdBy: staffId
      },
      {
        order: orders[0]._id,
        trackingNumber: 'BD-IN-9081234',
        status: 'IN_TRANSIT',
        carrier: 'BlueDart',
        originAddress: {
          street: 'Prestige Shantiniketan, Whitefield',
          city: 'Bengaluru',
          state: 'Karnataka',
          zipCode: '560048',
          country: 'India',
          latitude: 12.9844,
          longitude: 77.7289
        },
        destinationAddress: {
          street: 'Plot No. 45, Khasra 82, Alipur Industrial Area',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110036',
          country: 'India',
          latitude: 28.8021,
          longitude: 77.1354
        },
        currentLocation: {
          latitude: 17.3850,
          longitude: 78.4867,
          timestamp: now,
          address: 'Hyderabad Hub'
        },
        estimatedDeliveryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        weatherImpact: { hasImpact: false },
        items: [
          { product: products[2]._id, quantity: 600, batch: batches[1]._id }
        ],
        createdBy: managerId
      }
    ]);
    console.log(`🚚 Shipments seeded: ${shipments.length}`);

    // Update orders with shipments references
    orders[0].shipments = [shipments[1]._id];
    await orders[0].save();
    orders[1].shipments = [shipments[0]._id];
    await orders[1].save();
    console.log('✅ Orders updated with shipment references');

    // ─────────────────────────────────────────────
    // 9. ALERTS
    // ─────────────────────────────────────────────
    console.log('🔔 Seeding Alerts...');
    const alerts = await Alert.create([
      {
        type: 'STOCK_LOW',
        severity: 'HIGH',
        title: 'Critical Stock Level: Samsung S24 Ultra',
        message: 'Current stock (4) is below the threshold of 10. Reorder recommended immediately.',
        relatedEntities: {
          product: products[1]._id,
          warehouse: mumbaiWarehouseId
        },
        status: 'ACTIVE',
        createdBy: adminId
      },
      {
        type: 'EXPIRY_WARNING',
        severity: 'MEDIUM',
        title: 'Batch Expiring Soon: Britannia Good Day Pack',
        message: `Batch BAT-BRT-202605 containing Britannia Good Day Cookies expires on ${expirySoon.toLocaleDateString()}.`,
        relatedEntities: {
          product: products[2]._id,
          batch: batches[1]._id,
          warehouse: delhiWarehouseId
        },
        status: 'ACTIVE',
        createdBy: adminId
      },
      {
        type: 'ANOMALY_DETECTED',
        severity: 'HIGH',
        title: 'Abnormal Demand Spike: iPhone 15 Pro Max',
        message: 'Sales velocity spiked by 250% in the last 48 hours.',
        relatedEntities: {
          product: products[0]._id
        },
        status: 'ACTIVE',
        createdBy: adminId
      }
    ]);
    console.log(`🔔 Alerts seeded: ${alerts.length}`);

    // ─────────────────────────────────────────────
    // 10. CYCLE COUNTS
    // ─────────────────────────────────────────────
    console.log('📋 Seeding Cycle Counts...');
    const cycleCounts = await CycleCount.create([
      {
        cycleCountId: 'CC-MUM-001',
        warehouse: mumbaiWarehouseId,
        status: 'COMPLETED',
        type: 'PARTIAL',
        scheduledDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        completedDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        assignedTo: [staffId],
        items: [{
          product: products[0]._id,
          batch: batches[0]._id,
          location: { aisle: 'A1', shelf: 'S1', bin: 'B1' },
          systemQuantity: 25,
          countedQuantity: 25,
          discrepancy: 0,
          countedBy: staffId,
          countedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
        }],
        summary: {
          totalItems: 1,
          countedItems: 1,
          discrepanciesFound: 0,
          totalDiscrepancyValue: 0,
          accuracyPercentage: 100
        },
        createdBy: managerId
      },
      {
        cycleCountId: 'CC-DEL-002',
        warehouse: delhiWarehouseId,
        status: 'IN_PROGRESS',
        type: 'PARTIAL',
        scheduledDate: now,
        assignedTo: [staffId],
        items: [{
          product: products[2]._id,
          batch: batches[1]._id,
          location: { aisle: 'B1', shelf: 'S2', bin: 'B2' },
          systemQuantity: 500,
          notes: 'Counting under progress'
        }],
        createdBy: managerId
      }
    ]);
    console.log(`📋 Cycle Counts seeded: ${cycleCounts.length}`);

    // ─────────────────────────────────────────────
    // 11. REORDER REQUESTS (raw collection)
    // ─────────────────────────────────────────────
    console.log('📥 Seeding Reorder Requests...');
    const reorderReqs = [
      {
        product: products[1]._id,
        productName: products[1].name,
        sku: products[1].sku,
        suggestedQuantity: 15,
        leadTimeDays: 5,
        supplier: relSupplierId,
        supplierName: suppliers[0].name,
        urgency: 'HIGH',
        createdAt: now
      },
      {
        product: products[4]._id,
        productName: products[4].name,
        sku: products[4].sku,
        suggestedQuantity: 15,
        leadTimeDays: 5,
        supplier: relSupplierId,
        supplierName: suppliers[0].name,
        urgency: 'MEDIUM',
        createdAt: now
      }
    ];
    await db.collection('reorderrequests').insertMany(reorderReqs);
    console.log(`📥 Reorder Requests seeded: ${reorderReqs.length}`);

    // ─────────────────────────────────────────────
    // 12. RETURNS
    // ─────────────────────────────────────────────
    console.log('↩️ Seeding Returns...');
    const returns = await Return.create([
      {
        returnNumber: 'RET-2026-001',
        originalOrder: orders[1]._id,
        product: products[0]._id,
        quantity: 1,
        reasonCode: 'DEFECTIVE',
        disposition: 'QUARANTINE',
        inspectedBy: managerId,
        supplierLiable: true,
        notes: 'Touch screen not responding. Returned by customer. Sent to quarantine zone.'
      }
    ]);
    console.log(`↩️ Returns seeded: ${returns.length}`);

    // ─────────────────────────────────────────────
    // 13. DEAD STOCK (raw collection)
    // ─────────────────────────────────────────────
    console.log('💀 Seeding Dead Stock...');
    const deadStocks = [
      {
        product: products[3]._id,
        productName: products[3].name,
        sku: products[3].sku,
        stock: 80,
        costBasis: 96000,
        suggestedAction: 'DISCOUNT',
        estimatedRecoveryValue: 57600,
        daysNoMovement: 95,
        createdAt: now
      }
    ];
    await db.collection('deadstocks').insertMany(deadStocks);
    console.log(`💀 Dead Stock seeded: ${deadStocks.length}`);

    // ─────────────────────────────────────────────
    // 14. AUDIT LOGS
    // ─────────────────────────────────────────────
    console.log('🛡️ Seeding Audit Logs...');
    const auditLogs = await AuditLog.create([
      {
        action: 'UPDATE',
        entityType: 'User',
        entityId: adminId,
        user: adminId,
        details: { event: 'LOGIN', message: 'User logged in successfully from IP 192.168.1.10' }
      },
      {
        action: 'STOCK_IN',
        entityType: 'Product',
        entityId: products[0]._id,
        user: managerId,
        details: { quantity: 30, type: 'RECEIVE', batchNumber: 'BAT-APL-202601' }
      },
      {
        action: 'UPDATE',
        entityType: 'Order',
        entityId: orders[0]._id,
        user: adminId,
        details: { status: 'APPROVED', approvedAt: now }
      }
    ]);
    console.log(`🛡️ Audit Logs seeded: ${auditLogs.length}`);

    // ─────────────────────────────────────────────
    // DISPLAY SUMMARY TABLE
    // ─────────────────────────────────────────────
    console.log('\nCollection       | Documents Inserted');
    console.log('-----------------+-------------------');
    console.log(`Users            | ${users.length}`);
    console.log(`Warehouses       | ${warehouses.length}`);
    console.log(`Suppliers        | ${suppliers.length}`);
    console.log(`Products         | ${products.length}`);
    console.log(`Inventory        | ${inventoryDocs.length}`);
    console.log(`Batches          | ${batches.length}`);
    console.log(`Orders           | ${orders.length}`);
    console.log(`Shipments        | ${shipments.length}`);
    console.log(`Alerts           | ${alerts.length}`);
    console.log(`Cycle Counts     | ${cycleCounts.length}`);
    console.log(`Reorder Requests | ${reorderReqs.length}`);
    console.log(`Returns          | ${returns.length}`);
    console.log(`Dead Stock       | ${deadStocks.length}`);
    console.log(`Audit Logs       | ${auditLogs.length}`);
    console.log('-----------------+-------------------\n');

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

main();
