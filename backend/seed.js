import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Product from './models/Product.js';
import Warehouse from './models/Warehouse.js';
import Order from './models/Order.js';
import AuditLog from './models/AuditLog.js';
import Supplier from './models/Supplier.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventorySystem');

    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Product.deleteMany({}),
      Warehouse.deleteMany({}),
      Order.deleteMany({}),
      AuditLog.deleteMany({}),
      Supplier.deleteMany({})
    ]);

    console.log('👤 Creating users...');
    const users = await User.create([
      {
        name: 'System Admin',
        email: 'admin@system.core',
        password: 'admin123',
        role: 'ADMIN',
        isVerified: true,
        status: 'ACTIVE'
      },
      {
        name: 'Manager User',
        email: 'manager@system.core',
        password: 'manager123',
        role: 'MANAGER',
        isVerified: true,
        status: 'ACTIVE'
      },
      {
        name: 'Staff User',
        email: 'staff@system.core',
        password: 'staff123',
        role: 'STAFF',
        isVerified: true,
        status: 'ACTIVE'
      }
    ]);

    console.log('🏢 Creating suppliers...');
    const suppliers = await Supplier.create([
      {
        name: 'TechCorp Inc',
        code: 'SUP001',
        contactInfo: { email: 'contact@techcorp.com', phone: '123-456-7890' },
        createdBy: users[0]._id
      },
      {
        name: 'Peripherals Ltd',
        code: 'SUP002',
        contactInfo: { email: 'info@peripherals.com', phone: '098-765-4321' },
        createdBy: users[0]._id
      },
      {
        name: 'Cable Manufacturers',
        code: 'SUP003',
        contactInfo: { email: 'sales@cablemans.com', phone: '555-555-5555' },
        createdBy: users[0]._id
      },
      {
        name: 'Display Tech',
        code: 'SUP004',
        contactInfo: { email: 'support@displaytech.com' },
        createdBy: users[0]._id
      },
      {
        name: 'Input Devices Co',
        code: 'SUP005',
        contactInfo: { email: 'orders@inputco.com' },
        createdBy: users[0]._id
      },
      {
        name: 'Lighting Solutions',
        code: 'SUP006',
        contactInfo: { email: 'hello@lightingsol.com' },
        createdBy: users[0]._id
      },
      {
        name: 'Audio Expert',
        code: 'SUP007',
        contactInfo: { email: 'pro@audioexpert.com' },
        createdBy: users[0]._id
      },
      {
        name: 'Vision Tech',
        code: 'SUP008',
        contactInfo: { email: 'sales@visiontech.com' },
        createdBy: users[0]._id
      }
    ]);

    console.log('🏭 Creating warehouses...');
    const warehouses = await Warehouse.create([
      {
        name: 'Main Warehouse',
        location: 'New York, NY',
        capacity: 10000,
        createdBy: users[0]._id
      },
      {
        name: 'Secondary Warehouse',
        location: 'Los Angeles, CA',
        capacity: 5000,
        createdBy: users[0]._id
      },
      {
        name: 'Regional Hub',
        location: 'Chicago, IL',
        capacity: 7500,
        createdBy: users[0]._id
      }
    ]);

    console.log('📦 Creating products...');
    const products = await Product.create([
      {
        name: 'Laptop Pro',
        sku: 'LAPTOP-001',
        category: 'Electronics',
        price: 1299.99,
        stock: 45,
        lowStockThreshold: 10,
        warehouse: warehouses[0]._id,
        supplier: suppliers[0]._id,
        createdBy: users[1]._id
      },
      {
        name: 'Wireless Mouse',
        sku: 'MOUSE-001',
        category: 'Accessories',
        price: 29.99,
        stock: 150,
        lowStockThreshold: 50,
        warehouse: warehouses[0]._id,
        supplier: suppliers[1]._id,
        createdBy: users[1]._id
      },
      {
        name: 'USB-C Cable',
        sku: 'CABLE-001',
        category: 'Cables',
        price: 15.99,
        stock: 300,
        lowStockThreshold: 100,
        warehouse: warehouses[0]._id,
        supplier: suppliers[2]._id,
        createdBy: users[1]._id
      },
      {
        name: 'Monitor 4K',
        sku: 'MONITOR-001',
        category: 'Electronics',
        price: 499.99,
        stock: 25,
        lowStockThreshold: 8,
        warehouse: warehouses[1]._id,
        supplier: suppliers[3]._id,
        createdBy: users[1]._id
      },
      {
        name: 'Mechanical Keyboard',
        sku: 'KEYBOARD-001',
        category: 'Accessories',
        price: 149.99,
        stock: 5,
        lowStockThreshold: 15,
        warehouse: warehouses[1]._id,
        supplier: suppliers[4]._id,
        createdBy: users[1]._id
      },
      {
        name: 'Desk Lamp',
        sku: 'LAMP-001',
        category: 'Office',
        price: 79.99,
        stock: 60,
        lowStockThreshold: 20,
        warehouse: warehouses[2]._id,
        supplier: suppliers[5]._id,
        createdBy: users[1]._id
      },
      {
        name: 'Headphones Pro',
        sku: 'HEADPHONE-001',
        category: 'Audio',
        price: 349.99,
        stock: 35,
        lowStockThreshold: 10,
        warehouse: warehouses[2]._id,
        supplier: suppliers[6]._id,
        createdBy: users[1]._id
      },
      {
        name: 'Webcam HD',
        sku: 'WEBCAM-001',
        category: 'Electronics',
        price: 89.99,
        stock: 2,
        lowStockThreshold: 12,
        warehouse: warehouses[0]._id,
        supplier: suppliers[7]._id,
        createdBy: users[1]._id
      }
    ]);

    console.log('📋 Creating orders...');
    const orders = await Order.create([
      {
        type: 'SALES',
        status: 'COMPLETED',
        items: [
          {
            product: products[0]._id,
            quantity: 2,
            priceAtTime: 1299.99
          },
          {
            product: products[1]._id,
            quantity: 5,
            priceAtTime: 29.99
          }
        ],
        totalAmount: 2749.95,
        createdBy: users[2]._id
      },
      {
        type: 'PURCHASE',
        status: 'COMPLETED',
        items: [
          {
            product: products[2]._id,
            quantity: 100,
            priceAtTime: 12.00
          }
        ],
        totalAmount: 1200.00,
        createdBy: users[1]._id
      },
      {
        type: 'SALES',
        status: 'PENDING',
        items: [
          {
            product: products[3]._id,
            quantity: 1,
            priceAtTime: 499.99
          }
        ],
        totalAmount: 499.99,
        createdBy: users[2]._id
      },
      {
        type: 'SALES',
        status: 'COMPLETED',
        items: [
          {
            product: products[5]._id,
            quantity: 3,
            priceAtTime: 79.99
          },
          {
            product: products[6]._id,
            quantity: 1,
            priceAtTime: 349.99
          }
        ],
        totalAmount: 589.96,
        createdBy: users[2]._id
      },
      {
        type: 'SALES',
        status: 'CANCELLED',
        items: [
          {
            product: products[4]._id,
            quantity: 2,
            priceAtTime: 149.99
          }
        ],
        totalAmount: 299.98,
        createdBy: users[2]._id,
        cancelledAt: new Date(),
        cancellationReason: 'Customer requested cancellation'
      }
    ]);

    console.log('\n✅ Seeding completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seed();
