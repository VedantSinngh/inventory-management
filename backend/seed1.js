import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Supplier from './models/Supplier.js';
import Warehouse from './models/Warehouse.js';
import Product from './models/Product.js';
import Batch from './models/Batch.js';
import Order from './models/Order.js';
import Shipment from './models/Shipment.js';
import Alert from './models/Alert.js';
import CycleCount from './models/CycleCount.js';
import AuditLog from './models/AuditLog.js';
import Forecast from './models/Forecast.js';

dotenv.config();

const seed1 = async () => {
  try {
    // ================================
    // 1. CONNECT TO MONGODB
    // ================================
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventorySystem');
    console.log('✅ Connected to MongoDB');

    // ================================
    // 2. CLEAR EXISTING DATA
    // ================================
    console.log('\n🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Supplier.deleteMany({}),
      Warehouse.deleteMany({}),
      Product.deleteMany({}),
      Batch.deleteMany({}),
      Order.deleteMany({}),
      Shipment.deleteMany({}),
      Alert.deleteMany({}),
      CycleCount.deleteMany({}),
      AuditLog.deleteMany({}),
      Forecast.deleteMany({})
    ]);
    console.log('✅ Data cleared');

    // ================================
    // 3. CREATE USERS
    // ================================
    console.log('\n👤 Creating users...');
    const users = await User.create([
      {
        name: 'Admin User',
        email: 'admin@inventory.com',
        password: 'admin@123',
        role: 'ADMIN',
        isVerified: true,
        status: 'ACTIVE',
        lastLogin: new Date()
      },
      {
        name: 'Manager - John Smith',
        email: 'manager@inventory.com',
        password: 'manager@123',
        role: 'MANAGER',
        isVerified: true,
        status: 'ACTIVE',
        lastLogin: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        name: 'Manager - Sarah Johnson',
        email: 'manager2@inventory.com',
        password: 'manager@123',
        role: 'MANAGER',
        isVerified: true,
        status: 'ACTIVE',
        lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        name: 'Staff - Mike Davis',
        email: 'staff1@inventory.com',
        password: 'staff@123',
        role: 'STAFF',
        isVerified: true,
        status: 'ACTIVE',
        lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000)
      },
      {
        name: 'Staff - Emily Brown',
        email: 'staff2@inventory.com',
        password: 'staff@123',
        role: 'STAFF',
        isVerified: true,
        status: 'ACTIVE',
        lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000)
      }
    ]);
    console.log(`✅ ${users.length} users created`);

    // ================================
    // 4. CREATE SUPPLIERS
    // ================================
    console.log('\n🏢 Creating suppliers...');
    const suppliers = await Supplier.create([
      {
        name: 'TechCorp Electronics',
        code: 'SUP001',
        contactInfo: {
          email: 'contact@techcorp.com',
          phone: '1-800-TECH-001',
          website: 'www.techcorp.com',
          address: {
            street: '123 Tech Street',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'USA'
          }
        },
        primaryContact: {
          name: 'Robert Williams',
          title: 'Sales Manager',
          email: 'robert@techcorp.com',
          phone: '415-123-4567'
        },
        paymentTerms: 'NET_30',
        leadTime: 7,
        minimumOrderQuantity: 50,
        rating: 4.8,
        status: 'ACTIVE',
        categories: ['Electronics', 'Computers', 'Accessories'],
        performance: {
          onTimeDelivery: 98,
          qualityRating: 95,
          averageOrderValue: 50000
        },
        createdBy: users[0]._id
      },
      {
        name: 'GlobalParts Distribution',
        code: 'SUP002',
        contactInfo: {
          email: 'info@globalparts.com',
          phone: '1-800-PARTS-02',
          website: 'www.globalparts.com',
          address: {
            street: '456 Industrial Blvd',
            city: 'Chicago',
            state: 'IL',
            zipCode: '60601',
            country: 'USA'
          }
        },
        primaryContact: {
          name: 'Lisa Martinez',
          title: 'Account Executive',
          email: 'lisa@globalparts.com',
          phone: '312-456-7890'
        },
        paymentTerms: 'NET_45',
        leadTime: 5,
        minimumOrderQuantity: 100,
        rating: 4.5,
        status: 'ACTIVE',
        categories: ['Parts', 'Components', 'Hardware'],
        performance: {
          onTimeDelivery: 96,
          qualityRating: 92,
          averageOrderValue: 35000
        },
        createdBy: users[0]._id
      },
      {
        name: 'Premium Components Ltd',
        code: 'SUP003',
        contactInfo: {
          email: 'sales@premiumcomponents.com',
          phone: '1-888-PREMIUM',
          website: 'www.premiumcomponents.com',
          address: {
            street: '789 Quality Lane',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          }
        },
        primaryContact: {
          name: 'James Anderson',
          title: 'Supply Director',
          email: 'james@premiumcomponents.com',
          phone: '212-789-0123'
        },
        paymentTerms: 'NET_60',
        leadTime: 10,
        minimumOrderQuantity: 25,
        rating: 4.9,
        status: 'ACTIVE',
        categories: ['Premium Components', 'High-End Electronics'],
        performance: {
          onTimeDelivery: 99,
          qualityRating: 98,
          averageOrderValue: 75000
        },
        createdBy: users[0]._id
      },
      {
        name: 'Budget Parts Supply',
        code: 'SUP004',
        contactInfo: {
          email: 'support@budgetparts.com',
          phone: '1-877-BUDGET',
          website: 'www.budgetparts.com',
          address: {
            street: '321 Economy Ave',
            city: 'Houston',
            state: 'TX',
            zipCode: '77001',
            country: 'USA'
          }
        },
        primaryContact: {
          name: 'David Chen',
          title: 'Customer Service',
          email: 'david@budgetparts.com',
          phone: '713-234-5678'
        },
        paymentTerms: 'NET_15',
        leadTime: 3,
        minimumOrderQuantity: 200,
        rating: 3.8,
        status: 'ACTIVE',
        categories: ['Budget', 'Standard Parts'],
        performance: {
          onTimeDelivery: 92,
          qualityRating: 85,
          averageOrderValue: 20000
        },
        createdBy: users[0]._id
      },
      {
        name: 'International Electronics Co',
        code: 'SUP005',
        contactInfo: {
          email: 'export@intelectronics.com',
          phone: '+1-206-888-9999',
          website: 'www.intelectronics.com',
          address: {
            street: '999 Global Court',
            city: 'Seattle',
            state: 'WA',
            zipCode: '98101',
            country: 'USA'
          }
        },
        primaryContact: {
          name: 'Priya Singh',
          title: 'Export Manager',
          email: 'priya@intelectronics.com',
          phone: '206-555-1111'
        },
        paymentTerms: 'COD',
        leadTime: 14,
        minimumOrderQuantity: 500,
        rating: 4.2,
        status: 'ACTIVE',
        categories: ['Electronics', 'International'],
        performance: {
          onTimeDelivery: 90,
          qualityRating: 88,
          averageOrderValue: 100000
        },
        createdBy: users[0]._id
      }
    ]);
    console.log(`✅ ${suppliers.length} suppliers created`);

    // ================================
    // 5. CREATE WAREHOUSES
    // ================================
    console.log('\n🏭 Creating warehouses...');
    const warehouses = await Warehouse.create([
      {
        name: 'Main Warehouse - Central',
        location: 'Downtown Distribution Center',
        address: {
          street: '100 Warehouse Blvd',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30303',
          country: 'USA',
          latitude: 33.749,
          longitude: -84.388
        },
        capacity: 100000,
        operatingHours: {
          monday: { open: '06:00', close: '22:00' },
          tuesday: { open: '06:00', close: '22:00' },
          wednesday: { open: '06:00', close: '22:00' },
          thursday: { open: '06:00', close: '22:00' },
          friday: { open: '06:00', close: '22:00' },
          saturday: { open: '08:00', close: '18:00' },
          sunday: { open: '08:00', close: '18:00' }
        },
        equipment: [
          { type: 'FORKLIFT', count: 5, status: 'AVAILABLE' },
          { type: 'PALLET_JACK', count: 10, status: 'AVAILABLE' },
          { type: 'CONVEYOR', count: 2, status: 'AVAILABLE' },
          { type: 'SCANNER', count: 15, status: 'AVAILABLE' }
        ],
        temperature: {
          min: 15,
          max: 25,
          zones: [
            { name: 'Zone A', temperature: { min: 18, max: 24 }, products: [] },
            { name: 'Zone B', temperature: { min: 15, max: 25 }, products: [] }
          ]
        },
        securityLevel: 'HIGH',
        manager: users[1]._id
      },
      {
        name: 'Secondary Warehouse - West',
        location: 'West Coast Regional Hub',
        address: {
          street: '200 Pacific Drive',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90001',
          country: 'USA',
          latitude: 34.0522,
          longitude: -118.2437
        },
        capacity: 75000,
        operatingHours: {
          monday: { open: '07:00', close: '21:00' },
          tuesday: { open: '07:00', close: '21:00' },
          wednesday: { open: '07:00', close: '21:00' },
          thursday: { open: '07:00', close: '21:00' },
          friday: { open: '07:00', close: '21:00' },
          saturday: { open: '09:00', close: '17:00' },
          sunday: { open: '09:00', close: '17:00' }
        },
        equipment: [
          { type: 'FORKLIFT', count: 4, status: 'AVAILABLE' },
          { type: 'PALLET_JACK', count: 8, status: 'AVAILABLE' },
          { type: 'SCANNER', count: 12, status: 'AVAILABLE' }
        ],
        temperature: {
          min: 16,
          max: 26,
          zones: [
            { name: 'Zone A', temperature: { min: 18, max: 24 }, products: [] }
          ]
        },
        securityLevel: 'MEDIUM',
        manager: users[2]._id
      },
      {
        name: 'Express Warehouse - East',
        location: 'East Coast Quick Distribution',
        address: {
          street: '300 Express Way',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA',
          latitude: 40.7128,
          longitude: -74.0060
        },
        capacity: 50000,
        operatingHours: {
          monday: { open: '05:00', close: '23:00' },
          tuesday: { open: '05:00', close: '23:00' },
          wednesday: { open: '05:00', close: '23:00' },
          thursday: { open: '05:00', close: '23:00' },
          friday: { open: '05:00', close: '23:00' },
          saturday: { open: '07:00', close: '20:00' },
          sunday: { open: '07:00', close: '20:00' }
        },
        equipment: [
          { type: 'FORKLIFT', count: 3, status: 'AVAILABLE' },
          { type: 'PALLET_JACK', count: 6, status: 'AVAILABLE' },
          { type: 'CONVEYOR', count: 1, status: 'MAINTENANCE' },
          { type: 'SCANNER', count: 10, status: 'AVAILABLE' }
        ],
        temperature: {
          min: 14,
          max: 26,
          zones: [
            { name: 'Zone A', temperature: { min: 18, max: 24 }, products: [] },
            { name: 'Zone B', temperature: { min: 14, max: 20 }, products: [] }
          ]
        },
        securityLevel: 'HIGH',
        manager: users[1]._id
      }
    ]);
    console.log(`✅ ${warehouses.length} warehouses created`);

    // ================================
    // 6. CREATE PRODUCTS
    // ================================
    console.log('\n📦 Creating products...');
    const products = await Product.create([
      {
        name: 'Laptop Pro 15',
        sku: 'LPTOP-PRO-15-001',
        category: 'Computers',
        supplier: suppliers[0]._id,
        description: 'High-performance laptop with 15-inch display',
        price: 1299.99,
        cost: 900.00,
        stock: 150,
        lowStockThreshold: 20,
        warehouse: warehouses[0]._id,
        hasExpiry: false,
        dimensions: { length: 35, width: 24, height: 1.8 },
        weight: 2.1,
        abcClassification: 'A',
        turnoverRate: 12,
        lastSold: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        salesVelocity: 5,
        deadStock: false,
        certifications: ['CE', 'FCC'],
        qualityStandards: ['ISO_9001', 'RoHS'],
        autoReorder: true,
        reorderPoint: 30,
        reorderQuantity: 50,
        tags: ['electronics', 'laptop', 'premium']
      },
      {
        name: 'USB-C Cable 2M',
        sku: 'CABLE-USB-C-2M',
        category: 'Accessories',
        supplier: suppliers[1]._id,
        description: 'High-speed USB-C charging cable 2 meters',
        price: 12.99,
        cost: 4.50,
        stock: 5000,
        lowStockThreshold: 500,
        warehouse: warehouses[0]._id,
        hasExpiry: false,
        dimensions: { length: 200, width: 0.8, height: 0.8 },
        weight: 0.05,
        abcClassification: 'B',
        turnoverRate: 48,
        lastSold: new Date(Date.now() - 2 * 60 * 60 * 1000),
        salesVelocity: 25,
        deadStock: false,
        certifications: ['CE', 'UL'],
        qualityStandards: ['ISO_9001'],
        autoReorder: true,
        reorderPoint: 1000,
        reorderQuantity: 2000,
        tags: ['cables', 'accessories', 'popular']
      },
      {
        name: 'Monitor 4K 27"',
        sku: 'MON-4K-27-002',
        category: 'Displays',
        supplier: suppliers[2]._id,
        description: '4K Ultra HD 27-inch monitor',
        price: 449.99,
        cost: 280.00,
        stock: 45,
        lowStockThreshold: 10,
        warehouse: warehouses[1]._id,
        hasExpiry: false,
        dimensions: { length: 61, width: 22, height: 45 },
        weight: 6.8,
        abcClassification: 'A',
        turnoverRate: 8,
        lastSold: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        salesVelocity: 2,
        deadStock: false,
        certifications: ['CE', 'FCC'],
        qualityStandards: ['ISO_9001'],
        autoReorder: true,
        reorderPoint: 15,
        reorderQuantity: 25,
        tags: ['monitors', 'displays', 'premium']
      },
      {
        name: 'Wireless Mouse',
        sku: 'MOUSE-WIRELESS-001',
        category: 'Accessories',
        supplier: suppliers[1]._id,
        description: 'Ergonomic wireless mouse with 2.4GHz receiver',
        price: 24.99,
        cost: 8.00,
        stock: 2000,
        lowStockThreshold: 200,
        warehouse: warehouses[0]._id,
        hasExpiry: false,
        dimensions: { length: 12, width: 7, height: 4 },
        weight: 0.15,
        abcClassification: 'B',
        turnoverRate: 36,
        lastSold: new Date(Date.now() - 5 * 60 * 60 * 1000),
        salesVelocity: 12,
        deadStock: false,
        certifications: ['CE'],
        qualityStandards: ['ISO_9001'],
        autoReorder: true,
        reorderPoint: 400,
        reorderQuantity: 800,
        tags: ['mice', 'accessories', 'wireless']
      },
      {
        name: 'Mechanical Keyboard RGB',
        sku: 'KEYBRD-RGB-MECH-001',
        category: 'Accessories',
        supplier: suppliers[0]._id,
        description: 'Professional mechanical keyboard with RGB lighting',
        price: 129.99,
        cost: 65.00,
        stock: 320,
        lowStockThreshold: 50,
        warehouse: warehouses[1]._id,
        hasExpiry: false,
        dimensions: { length: 45, width: 15, height: 3 },
        weight: 0.95,
        abcClassification: 'B',
        turnoverRate: 24,
        lastSold: new Date(Date.now() - 6 * 60 * 60 * 1000),
        salesVelocity: 4,
        deadStock: false,
        certifications: ['CE'],
        qualityStandards: ['ISO_9001'],
        autoReorder: true,
        reorderPoint: 100,
        reorderQuantity: 200,
        tags: ['keyboards', 'gaming', 'rgb']
      },
      {
        name: 'Laptop Stand Aluminum',
        sku: 'STAND-LAPTOP-ALU-001',
        category: 'Accessories',
        supplier: suppliers[3]._id,
        description: 'Portable aluminum laptop stand for ergonomic viewing',
        price: 39.99,
        cost: 15.00,
        stock: 800,
        lowStockThreshold: 100,
        warehouse: warehouses[2]._id,
        hasExpiry: false,
        dimensions: { length: 30, width: 25, height: 10 },
        weight: 0.6,
        abcClassification: 'C',
        turnoverRate: 18,
        lastSold: new Date(Date.now() - 8 * 60 * 60 * 1000),
        salesVelocity: 3,
        deadStock: false,
        certifications: ['CE'],
        qualityStandards: ['ISO_9001'],
        autoReorder: true,
        reorderPoint: 150,
        reorderQuantity: 300,
        tags: ['stands', 'accessories', 'ergonomic']
      },
      {
        name: 'SSD 1TB NVMe',
        sku: 'SSD-NVME-1TB-001',
        category: 'Storage',
        supplier: suppliers[0]._id,
        description: '1TB NVMe SSD with high-speed performance',
        price: 89.99,
        cost: 45.00,
        stock: 1200,
        lowStockThreshold: 150,
        warehouse: warehouses[0]._id,
        hasExpiry: false,
        dimensions: { length: 8, width: 2.4, height: 0.35 },
        weight: 0.08,
        abcClassification: 'A',
        turnoverRate: 30,
        lastSold: new Date(Date.now() - 1 * 60 * 60 * 1000),
        salesVelocity: 8,
        deadStock: false,
        certifications: ['CE'],
        qualityStandards: ['ISO_9001'],
        autoReorder: true,
        reorderPoint: 300,
        reorderQuantity: 600,
        tags: ['storage', 'ssd', 'performance']
      },
      {
        name: 'USB Hub 7-Port',
        sku: 'USBHUB-7PORT-001',
        category: 'Accessories',
        supplier: suppliers[1]._id,
        description: '7-port USB hub with power adapter',
        price: 34.99,
        cost: 12.00,
        stock: 450,
        lowStockThreshold: 75,
        warehouse: warehouses[0]._id,
        hasExpiry: false,
        dimensions: { length: 25, width: 8, height: 3 },
        weight: 0.3,
        abcClassification: 'C',
        turnoverRate: 22,
        lastSold: new Date(Date.now() - 4 * 60 * 60 * 1000),
        salesVelocity: 5,
        deadStock: false,
        certifications: ['CE', 'FCC'],
        qualityStandards: ['ISO_9001'],
        autoReorder: true,
        reorderPoint: 100,
        reorderQuantity: 200,
        tags: ['hubs', 'accessories', 'usb']
      }
    ]);
    console.log(`✅ ${products.length} products created`);

    // ================================
    // 7. CREATE BATCHES
    // ================================
    console.log('\n📋 Creating batches...');
    const batches = await Batch.create([
      {
        batchNumber: 'BATCH-20240501-001',
        product: products[0]._id,
        supplier: suppliers[0]._id,
        manufacturingDate: new Date(2024, 4, 1),
        expiryDate: new Date(2026, 4, 1),
        quantityReceived: 100,
        quantityAvailable: 95,
        unitCost: 900.00,
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'A1',
          shelf: '3',
          bin: 'B01'
        },
        qualityStatus: 'APPROVED',
        serialNumbers: ['LTP-2024-001', 'LTP-2024-002', 'LTP-2024-003'],
        certifications: ['ISO_9001', 'RoHS'],
        fifoPosition: 1,
        createdBy: users[0]._id
      },
      {
        batchNumber: 'BATCH-20240502-001',
        product: products[1]._id,
        supplier: suppliers[1]._id,
        manufacturingDate: new Date(2024, 4, 2),
        expiryDate: new Date(2026, 4, 2),
        quantityReceived: 5000,
        quantityAvailable: 4850,
        unitCost: 4.50,
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'B2',
          shelf: '1',
          bin: 'C02'
        },
        qualityStatus: 'APPROVED',
        serialNumbers: [],
        certifications: ['CE'],
        fifoPosition: 1,
        createdBy: users[0]._id
      },
      {
        batchNumber: 'BATCH-20240503-002',
        product: products[2]._id,
        supplier: suppliers[2]._id,
        manufacturingDate: new Date(2024, 4, 3),
        expiryDate: new Date(2027, 4, 3),
        quantityReceived: 50,
        quantityAvailable: 45,
        unitCost: 280.00,
        location: {
          warehouse: warehouses[1]._id,
          aisle: 'A3',
          shelf: '2',
          bin: 'A05'
        },
        qualityStatus: 'APPROVED',
        serialNumbers: ['MON-4K-2024-001'],
        certifications: ['ISO_9001'],
        fifoPosition: 1,
        createdBy: users[1]._id
      },
      {
        batchNumber: 'BATCH-20240504-001',
        product: products[3]._id,
        supplier: suppliers[1]._id,
        manufacturingDate: new Date(2024, 4, 4),
        expiryDate: new Date(2026, 4, 4),
        quantityReceived: 2000,
        quantityAvailable: 1950,
        unitCost: 8.00,
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'C1',
          shelf: '4',
          bin: 'B03'
        },
        qualityStatus: 'APPROVED',
        serialNumbers: [],
        certifications: ['CE'],
        fifoPosition: 1,
        createdBy: users[1]._id
      },
      {
        batchNumber: 'BATCH-20240505-WARN',
        product: products[6]._id,
        supplier: suppliers[0]._id,
        manufacturingDate: new Date(2024, 3, 15),
        expiryDate: new Date(2024, 6, 15),
        quantityReceived: 1000,
        quantityAvailable: 950,
        unitCost: 45.00,
        location: {
          warehouse: warehouses[0]._id,
          aisle: 'D2',
          shelf: '1',
          bin: 'C05'
        },
        qualityStatus: 'APPROVED',
        serialNumbers: [],
        certifications: ['CE'],
        fifoPosition: 1,
        alerts: [
          {
            type: 'EXPIRY_WARNING',
            message: 'SSD batch expiring in 60 days',
            severity: 'MEDIUM',
            acknowledged: false
          }
        ],
        createdBy: users[0]._id
      }
    ]);
    console.log(`✅ ${batches.length} batches created`);

    // ================================
    // 8. CREATE ORDERS (Purchase & Sales)
    // ================================
    console.log('\n📄 Creating orders...');
    const orders = await Order.create([
      {
        type: 'PURCHASE',
        status: 'APPROVED',
        items: [
          {
            product: products[0]._id,
            batch: batches[0]._id,
            quantity: 50,
            priceAtTime: 900.00
          }
        ],
        totalAmount: 45000.00,
        paymentStatus: 'PAID',
        paymentMethod: 'Wire Transfer',
        priority: 'NORMAL',
        createdBy: users[1]._id,
        approvedBy: users[0]._id,
        approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'SALES',
        status: 'DELIVERED',
        items: [
          {
            product: products[0]._id,
            quantity: 3,
            priceAtTime: 1299.99
          },
          {
            product: products[3]._id,
            quantity: 5,
            priceAtTime: 24.99
          }
        ],
        totalAmount: 4174.42,
        shippingAddress: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          country: 'USA',
          latitude: 42.3601,
          longitude: -71.0589
        },
        paymentStatus: 'PAID',
        paymentMethod: 'Credit Card',
        priority: 'HIGH',
        createdBy: users[3]._id,
        approvedBy: users[1]._id,
        approvedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'SALES',
        status: 'READY_FOR_SHIPMENT',
        items: [
          {
            product: products[1]._id,
            quantity: 100,
            priceAtTime: 12.99
          },
          {
            product: products[2]._id,
            quantity: 2,
            priceAtTime: 449.99
          }
        ],
        totalAmount: 2299.80,
        shippingAddress: {
          street: '456 Tech Ave',
          city: 'San Jose',
          state: 'CA',
          zipCode: '95110',
          country: 'USA',
          latitude: 37.3382,
          longitude: -121.8863
        },
        paymentStatus: 'PARTIAL',
        paymentMethod: 'Invoice',
        priority: 'NORMAL',
        createdBy: users[4]._id,
        approvedBy: users[1]._id,
        approvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'PURCHASE',
        status: 'PROCESSING',
        items: [
          {
            product: products[4]._id,
            quantity: 200,
            priceAtTime: 65.00
          },
          {
            product: products[5]._id,
            quantity: 300,
            priceAtTime: 15.00
          }
        ],
        totalAmount: 17500.00,
        paymentStatus: 'PENDING',
        paymentMethod: 'Bank Transfer',
        priority: 'URGENT',
        createdBy: users[1]._id,
        approvedBy: users[0]._id,
        approvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        type: 'SALES',
        status: 'PENDING',
        items: [
          {
            product: products[6]._id,
            quantity: 50,
            priceAtTime: 89.99
          }
        ],
        totalAmount: 4499.50,
        shippingAddress: {
          street: '789 Electronics Blvd',
          city: 'Austin',
          state: 'TX',
          zipCode: '78701',
          country: 'USA',
          latitude: 30.2672,
          longitude: -97.7431
        },
        paymentStatus: 'PENDING',
        paymentMethod: 'Purchase Order',
        priority: 'NORMAL',
        createdBy: users[3]._id
      }
    ]);
    console.log(`✅ ${orders.length} orders created`);

    // ================================
    // 9. CREATE SHIPMENTS
    // ================================
    console.log('\n🚚 Creating shipments...');
    const shipments = await Shipment.create([
      {
        order: orders[1]._id,
        trackingNumber: 'TRK-2024-001-001',
        status: 'DELIVERED',
        carrier: 'FedEx',
        carrierTrackingUrl: 'https://tracking.fedex.com/tracking-2024-001',
        originAddress: {
          street: '100 Warehouse Blvd',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30303',
          country: 'USA',
          latitude: 33.749,
          longitude: -84.388
        },
        destinationAddress: {
          street: '123 Main St',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          country: 'USA',
          latitude: 42.3601,
          longitude: -71.0589
        },
        currentLocation: {
          latitude: 42.3601,
          longitude: -71.0589,
          timestamp: new Date(),
          address: 'Boston, MA'
        },
        estimatedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        actualDeliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        weatherImpact: { hasImpact: false },
        assignedVehicle: 'FDX-2024-001',
        driverInfo: {
          name: 'John Driver',
          phone: '555-0001',
          vehicleNumber: 'FDX-VAN-001'
        },
        weight: 8.5,
        dimensions: { length: 40, width: 30, height: 20 },
        items: [
          {
            product: products[0]._id,
            quantity: 3
          },
          {
            product: products[3]._id,
            quantity: 5
          }
        ],
        cost: {
          shipping: 45.00,
          handling: 10.00,
          insurance: 5.00,
          total: 60.00
        },
        createdBy: users[1]._id,
        updatedBy: users[1]._id
      },
      {
        order: orders[2]._id,
        trackingNumber: 'TRK-2024-002-001',
        status: 'IN_TRANSIT',
        carrier: 'UPS',
        carrierTrackingUrl: 'https://tracking.ups.com/tracking-2024-002',
        originAddress: {
          street: '100 Warehouse Blvd',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30303',
          country: 'USA',
          latitude: 33.749,
          longitude: -84.388
        },
        destinationAddress: {
          street: '456 Tech Ave',
          city: 'San Jose',
          state: 'CA',
          zipCode: '95110',
          country: 'USA',
          latitude: 37.3382,
          longitude: -121.8863
        },
        currentLocation: {
          latitude: 36.5,
          longitude: -116.8,
          timestamp: new Date(),
          address: 'Nevada'
        },
        estimatedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        weatherImpact: {
          hasImpact: true,
          condition: 'Clear',
          severity: 'LOW',
          estimatedDelayHours: 0
        },
        assignedVehicle: 'UPS-2024-002',
        driverInfo: {
          name: 'Maria Rodriguez',
          phone: '555-0002',
          vehicleNumber: 'UPS-TRUCK-002'
        },
        weight: 25.5,
        dimensions: { length: 60, width: 40, height: 30 },
        items: [
          {
            product: products[1]._id,
            quantity: 100
          },
          {
            product: products[2]._id,
            quantity: 2
          }
        ],
        cost: {
          shipping: 120.00,
          handling: 20.00,
          insurance: 15.00,
          total: 155.00
        },
        createdBy: users[1]._id,
        updatedBy: users[1]._id
      },
      {
        order: orders[0]._id,
        trackingNumber: 'TRK-2024-003-001',
        status: 'READY_FOR_PICKUP',
        carrier: 'DHL',
        originAddress: {
          street: '123 Tech Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA',
          latitude: 37.7749,
          longitude: -122.4194
        },
        destinationAddress: {
          street: '100 Warehouse Blvd',
          city: 'Atlanta',
          state: 'GA',
          zipCode: '30303',
          country: 'USA',
          latitude: 33.749,
          longitude: -84.388
        },
        currentLocation: {
          latitude: 37.7749,
          longitude: -122.4194,
          timestamp: new Date(),
          address: 'San Francisco, CA'
        },
        estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        weatherImpact: { hasImpact: false },
        weight: 45.0,
        dimensions: { length: 100, width: 80, height: 50 },
        items: [
          {
            product: products[0]._id,
            quantity: 50
          }
        ],
        cost: {
          shipping: 250.00,
          handling: 50.00,
          insurance: 30.00,
          total: 330.00
        },
        createdBy: users[0]._id,
        updatedBy: users[0]._id
      }
    ]);
    console.log(`✅ ${shipments.length} shipments created`);

    // ================================
    // 10. CREATE ALERTS
    // ================================
    console.log('\n🚨 Creating alerts...');
    const alerts = await Alert.create([
      {
        type: 'STOCK_LOW',
        severity: 'MEDIUM',
        title: 'Low Stock Alert - USB-C Cable',
        message: 'USB-C Cable stock falling below threshold',
        description: 'Current stock: 4500 units. Threshold: 500 units. Recommend reordering.',
        relatedEntities: { product: products[1]._id },
        metrics: {
          currentValue: 4500,
          thresholdValue: 500,
          deviation: -4000,
          percentageChange: -80
        },
        status: 'ACKNOWLEDGED',
        autoGenerated: true,
        acknowledgedBy: users[1]._id,
        acknowledgedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        createdBy: users[0]._id
      },
      {
        type: 'SHIPMENT_DELAYED',
        severity: 'HIGH',
        title: 'Shipment Delay - Order TRK-2024-002',
        message: 'Shipment TRK-2024-002 experiencing weather-related delay',
        description: 'UPS shipment to San Jose delayed due to traffic. Expected 2-hour delay.',
        relatedEntities: { shipment: shipments[1]._id, order: orders[2]._id },
        metrics: {
          currentValue: 2,
          thresholdValue: 0,
          deviation: 2,
          percentageChange: 100
        },
        status: 'ACTIVE',
        actions: [
          {
            action: 'NOTIFY_SUPPLIER',
            description: 'Notify customer about delay',
            assignedTo: users[1]._id,
            dueDate: new Date(Date.now() + 1 * 60 * 60 * 1000),
            completed: false
          }
        ],
        autoGenerated: true,
        createdBy: users[0]._id
      },
      {
        type: 'EXPIRY_WARNING',
        severity: 'HIGH',
        title: 'Batch Expiry Warning - SSD',
        message: 'SSD batch expiring in 60 days',
        description: 'Batch BATCH-20240505-WARN expires on 2024-07-15. Current quantity: 950 units',
        relatedEntities: { batch: batches[4]._id, product: products[6]._id },
        metrics: {
          currentValue: 60,
          thresholdValue: 90,
          deviation: -30,
          percentageChange: -33
        },
        status: 'ACTIVE',
        autoGenerated: true,
        createdBy: users[0]._id
      },
      {
        type: 'ANOMALY_DETECTED',
        severity: 'CRITICAL',
        title: 'Anomaly Detected - Unusual Sales Pattern',
        message: 'Unusual spike in Laptop Pro sales detected',
        description: 'Sales velocity for Laptop Pro 15 increased 300% in last 24 hours',
        relatedEntities: { product: products[0]._id },
        metrics: {
          currentValue: 15,
          thresholdValue: 5,
          deviation: 10,
          percentageChange: 300
        },
        status: 'RESOLVED',
        autoGenerated: true,
        resolvedBy: users[1]._id,
        resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        resolution: 'Marketing campaign identified as cause. Expected pattern.',
        createdBy: users[0]._id
      },
      {
        type: 'QUALITY_ISSUE',
        severity: 'MEDIUM',
        title: 'Quality Issue - Monitor Batch',
        message: 'Dead pixels detected in Monitor batch',
        description: '2 units from batch MON-4K-27-002 returned with dead pixel issues',
        relatedEntities: { batch: batches[2]._id, product: products[2]._id },
        metrics: {
          currentValue: 2,
          thresholdValue: 0,
          deviation: 2,
          percentageChange: 100
        },
        status: 'ACTIVE',
        actions: [
          {
            action: 'QUARANTINE',
            description: 'Quarantine affected units for inspection',
            assignedTo: users[3]._id,
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            completed: false
          }
        ],
        autoGenerated: true,
        createdBy: users[0]._id
      },
      {
        type: 'FORECAST_DEVIATION',
        severity: 'LOW',
        title: 'Forecast Deviation - Keyboard Sales',
        message: 'Actual sales lower than forecasted',
        description: 'Mechanical Keyboard RGB actual sales 15% below forecast',
        relatedEntities: { product: products[4]._id },
        metrics: {
          currentValue: 85,
          thresholdValue: 100,
          deviation: -15,
          percentageChange: -15
        },
        status: 'ACKNOWLEDGED',
        autoGenerated: true,
        acknowledgedBy: users[2]._id,
        acknowledgedAt: new Date(),
        createdBy: users[0]._id
      }
    ]);
    console.log(`✅ ${alerts.length} alerts created`);

    // ================================
    // 11. CREATE CYCLE COUNTS
    // ================================
    console.log('\n📊 Creating cycle counts...');
    const cycleCounts = await CycleCount.create([
      {
        cycleCountId: 'CC-2024-001',
        warehouse: warehouses[0]._id,
        status: 'COMPLETED',
        type: 'PARTIAL',
        scope: {
          categories: ['Electronics', 'Accessories'],
          locations: ['A1', 'B2', 'C1'],
          products: [products[0]._id, products[1]._id, products[3]._id]
        },
        scheduledDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        completedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        assignedTo: [users[3]._id, users[4]._id],
        items: [
          {
            product: products[0]._id,
            batch: batches[0]._id,
            location: { aisle: 'A1', shelf: '3', bin: 'B01' },
            systemQuantity: 95,
            countedQuantity: 93,
            discrepancy: -2,
            discrepancyReason: 'MISSING',
            notes: 'Units not found in bin',
            countedBy: users[3]._id,
            countedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            verifiedBy: users[1]._id,
            verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
          },
          {
            product: products[1]._id,
            batch: batches[1]._id,
            location: { aisle: 'B2', shelf: '1', bin: 'C02' },
            systemQuantity: 4850,
            countedQuantity: 4850,
            discrepancy: 0,
            notes: 'Count matches perfectly',
            countedBy: users[4]._id,
            countedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            verifiedBy: users[1]._id,
            verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
          },
          {
            product: products[3]._id,
            batch: batches[3]._id,
            location: { aisle: 'C1', shelf: '4', bin: 'B03' },
            systemQuantity: 1950,
            countedQuantity: 1955,
            discrepancy: 5,
            discrepancyReason: 'EXTRA',
            notes: 'Extra units found during count',
            countedBy: users[3]._id,
            countedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            verifiedBy: users[1]._id,
            verifiedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
          }
        ],
        summary: {
          totalItems: 3,
          countedItems: 3,
          discrepanciesFound: 2,
          totalDiscrepancyValue: 3,
          accuracyPercentage: 99.87
        },
        priority: 'HIGH',
        recurrence: {
          frequency: 'MONTHLY',
          nextScheduledDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
        },
        createdBy: users[1]._id
      },
      {
        cycleCountId: 'CC-2024-002',
        warehouse: warehouses[1]._id,
        status: 'IN_PROGRESS',
        type: 'ABC_ANALYSIS',
        scope: {
          categories: ['Displays'],
          locations: ['A3'],
          products: [products[2]._id]
        },
        scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        assignedTo: [users[4]._id],
        items: [
          {
            product: products[2]._id,
            batch: batches[2]._id,
            location: { aisle: 'A3', shelf: '2', bin: 'A05' },
            systemQuantity: 45,
            countedQuantity: 43,
            discrepancy: -2,
            discrepancyReason: 'DAMAGED',
            notes: 'Physical damage found on 2 units',
            countedBy: users[4]._id,
            countedAt: new Date(),
            verifiedBy: null
          }
        ],
        summary: {
          totalItems: 1,
          countedItems: 1,
          discrepanciesFound: 1,
          totalDiscrepancyValue: 2,
          accuracyPercentage: 95.56
        },
        priority: 'MEDIUM',
        createdBy: users[2]._id
      }
    ]);
    console.log(`✅ ${cycleCounts.length} cycle counts created`);

    // ================================
    // 12. CREATE AUDIT LOGS (Analytics)
    // ================================
    console.log('\n📜 Creating audit logs...');
    const auditLogs = await AuditLog.create([
      {
        action: 'CREATE',
        entityType: 'Product',
        entityId: products[0]._id,
        user: users[0]._id,
        details: {
          name: 'Laptop Pro 15',
          sku: 'LPTOP-PRO-15-001',
          initialStock: 150,
          price: 1299.99
        }
      },
      {
        action: 'STOCK_IN',
        entityType: 'Product',
        entityId: products[1]._id,
        user: users[1]._id,
        details: {
          quantity: 5000,
          batchNumber: 'BATCH-20240502-001',
          warehouse: warehouses[0]._id
        }
      },
      {
        action: 'STOCK_OUT',
        entityType: 'Product',
        entityId: products[0]._id,
        user: users[3]._id,
        details: {
          quantity: 3,
          orderNumber: orders[1]._id,
          reason: 'Sales Order'
        }
      },
      {
        action: 'UPDATE',
        entityType: 'Product',
        entityId: products[2]._id,
        user: users[1]._id,
        details: {
          updatedFields: ['price', 'stock'],
          oldPrice: 429.99,
          newPrice: 449.99,
          oldStock: 50,
          newStock: 45
        }
      },
      {
        action: 'TRANSFER',
        entityType: 'Product',
        entityId: products[3]._id,
        user: users[1]._id,
        details: {
          quantity: 500,
          fromWarehouse: warehouses[0]._id,
          toWarehouse: warehouses[1]._id,
          reason: 'Rebalancing inventory'
        }
      },
      {
        action: 'CREATE',
        entityType: 'Order',
        entityId: orders[1]._id,
        user: users[3]._id,
        details: {
          orderType: 'SALES',
          totalAmount: 4174.42,
          itemCount: 2
        }
      },
      {
        action: 'UPDATE',
        entityType: 'Order',
        entityId: orders[1]._id,
        user: users[1]._id,
        details: {
          status: 'PENDING',
          newStatus: 'DELIVERED',
          updatedAt: new Date()
        }
      },
      {
        action: 'CREATE',
        entityType: 'Shipment',
        entityId: shipments[0]._id,
        user: users[1]._id,
        details: {
          trackingNumber: 'TRK-2024-001-001',
          carrier: 'FedEx',
          destination: 'Boston, MA'
        }
      },
      {
        action: 'UPDATE',
        entityType: 'Shipment',
        entityId: shipments[0]._id,
        user: users[1]._id,
        details: {
          status: 'IN_TRANSIT',
          newStatus: 'DELIVERED',
          deliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
        }
      }
    ]);
    console.log(`✅ ${auditLogs.length} audit logs created`);

    // ================================
    // 13. CREATE FORECASTS (Analytics & ML)
    // ================================
    console.log('\n📈 Creating forecasts...');
    const now = new Date();
    const forecasts = await Forecast.create([
      {
        product: products[0]._id,
        forecastDate: now,
        period: 'MONTHLY',
        method: 'SIMPLE_MOVING_AVERAGE',
        historicalData: {
          periodStart: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000),
          periodEnd: now,
          salesData: [
            { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), quantity: 15, value: 19499.85 },
            { date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), quantity: 18, value: 23399.82 },
            { date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), quantity: 22, value: 28599.78 }
          ],
          averageDemand: 18.3,
          demandVariance: 2.1,
          trend: 1.5
        },
        forecast: {
          predictedDemand: 24,
          confidenceInterval: {
            lower: 20,
            upper: 28,
            confidence: 0.95
          },
          accuracy: 8.5,
          seasonalFactors: [1.0, 1.1, 0.95]
        },
        factors: {
          external: [
            { name: 'Marketing Campaign', impact: 15, description: 'Q2 promotional campaign' }
          ],
          internal: [
            { name: 'Price Reduction', impact: 8, description: '5% promotional discount' }
          ]
        },
        recommendations: {
          safetyStock: 15,
          reorderPoint: 40,
          reorderQuantity: 50,
          suggestedPrice: 1249.99
        },
        status: 'APPROVED',
        createdBy: users[1]._id,
        reviewedBy: users[0]._id,
        reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        product: products[1]._id,
        forecastDate: now,
        period: 'MONTHLY',
        method: 'EXPONENTIAL_SMOOTHING',
        historicalData: {
          periodStart: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000),
          periodEnd: now,
          salesData: [
            { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), quantity: 750, value: 9742.50 },
            { date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), quantity: 920, value: 11951.08 },
            { date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), quantity: 1100, value: 14289.00 }
          ],
          averageDemand: 923.3,
          demandVariance: 175.2,
          trend: 150.0
        },
        forecast: {
          predictedDemand: 1250,
          confidenceInterval: {
            lower: 1100,
            upper: 1400,
            confidence: 0.95
          },
          accuracy: 5.2,
          seasonalFactors: [0.95, 1.0, 1.05, 1.1]
        },
        factors: {
          external: [],
          internal: []
        },
        recommendations: {
          safetyStock: 200,
          reorderPoint: 500,
          reorderQuantity: 2000,
          suggestedPrice: 12.49
        },
        status: 'GENERATED',
        createdBy: users[1]._id
      },
      {
        product: products[2]._id,
        forecastDate: now,
        period: 'MONTHLY',
        method: 'LINEAR_REGRESSION',
        historicalData: {
          periodStart: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000),
          periodEnd: now,
          salesData: [
            { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), quantity: 3, value: 1349.97 },
            { date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), quantity: 4, value: 1799.96 },
            { date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), quantity: 5, value: 2249.95 }
          ],
          averageDemand: 4.0,
          demandVariance: 0.8,
          trend: 1.0
        },
        forecast: {
          predictedDemand: 6,
          confidenceInterval: {
            lower: 4,
            upper: 8,
            confidence: 0.95
          },
          accuracy: 12.3,
          seasonalFactors: [0.8, 0.9, 1.0, 1.2, 1.3]
        },
        factors: {
          external: [
            { name: 'Seasonal Demand', impact: 20, description: 'Summer tech upgrade season' }
          ],
          internal: []
        },
        recommendations: {
          safetyStock: 5,
          reorderPoint: 15,
          reorderQuantity: 25,
          suggestedPrice: 449.99
        },
        status: 'REVIEWED',
        createdBy: users[2]._id,
        reviewedBy: users[0]._id,
        reviewedAt: new Date()
      },
      {
        product: products[6]._id,
        forecastDate: now,
        period: 'MONTHLY',
        method: 'WEIGHTED_MOVING_AVERAGE',
        historicalData: {
          periodStart: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000),
          periodEnd: now,
          salesData: [
            { date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), quantity: 150, value: 13498.50 },
            { date: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000), quantity: 200, value: 17998.00 },
            { date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), quantity: 250, value: 22497.50 }
          ],
          averageDemand: 200.0,
          demandVariance: 50.0,
          trend: 50.0
        },
        forecast: {
          predictedDemand: 300,
          confidenceInterval: {
            lower: 250,
            upper: 350,
            confidence: 0.95
          },
          accuracy: 7.8,
          seasonalFactors: [0.9, 1.0, 1.1, 1.2]
        },
        factors: {
          external: [],
          internal: [
            { name: 'Tech Refresh Cycle', impact: 25, description: 'Corporate upgrades Q2-Q3' }
          ]
        },
        recommendations: {
          safetyStock: 50,
          reorderPoint: 150,
          reorderQuantity: 600,
          suggestedPrice: 89.99
        },
        status: 'IMPLEMENTED',
        createdBy: users[1]._id,
        reviewedBy: users[0]._id,
        reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ]);
    console.log(`✅ ${forecasts.length} forecasts created`);

    // ================================
    // 14. SUMMARY & EXIT
    // ================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ SEED1.JS - FULL DATABASE POPULATION COMPLETE!');
    console.log('='.repeat(60));
    console.log('\n📊 SUMMARY OF CREATED DATA:');
    console.log(`   👤 Users: ${users.length}`);
    console.log(`   🏢 Suppliers: ${suppliers.length}`);
    console.log(`   🏭 Warehouses: ${warehouses.length}`);
    console.log(`   📦 Products: ${products.length}`);
    console.log(`   📋 Batches: ${batches.length}`);
    console.log(`   📄 Orders: ${orders.length}`);
    console.log(`   🚚 Shipments: ${shipments.length}`);
    console.log(`   🚨 Alerts: ${alerts.length}`);
    console.log(`   📊 Cycle Counts: ${cycleCounts.length}`);
    console.log(`   📜 Audit Logs: ${auditLogs.length}`);
    console.log(`   📈 Forecasts: ${forecasts.length}`);
    console.log('\n✨ All collections populated successfully!');
    console.log('✨ Dashboard, Analytics, and LL Analytics data ready!');
    console.log('\n🔐 Test Credentials:');
    console.log('   Admin: admin@inventory.com / admin@123');
    console.log('   Manager: manager@inventory.com / manager@123');
    console.log('   Staff: staff1@inventory.com / staff@123\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

seed1();
