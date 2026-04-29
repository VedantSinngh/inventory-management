import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Product from './models/Product.js';
import Warehouse from './models/Warehouse.js';
import Order from './models/Order.js';
import AuditLog from './models/AuditLog.js';

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
      AuditLog.deleteMany({})
    ]);

    console.log('👤 Creating users...');
    const users = await User.create([
      {
        name: 'System Admin',
        email: 'admin@system.core',
        password: 'admin123',
        role: 'ADMIN'
      },
      {
        name: 'Manager User',
        email: 'manager@system.core',
        password: 'manager123',
        role: 'MANAGER'
      },
      {
        name: 'Staff User',
        email: 'staff@system.core',
        password: 'staff123',
        role: 'STAFF'
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
        supplier: 'TechCorp Inc',
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
        supplier: 'Peripherals Ltd',
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
        supplier: 'Cable Manufacturers',
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
        supplier: 'Display Tech',
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
        supplier: 'Input Devices Co',
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
        supplier: 'Lighting Solutions',
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
        supplier: 'Audio Expert',
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
        supplier: 'Vision Tech',
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

    // Update product stock based on orders
    await Product.findByIdAndUpdate(products[0]._id, { stock: 43 });
    await Product.findByIdAndUpdate(products[1]._id, { stock: 145 });
    await Product.findByIdAndUpdate(products[2]._id, { stock: 400 });
    await Product.findByIdAndUpdate(products[3]._id, { stock: 24 });
    await Product.findByIdAndUpdate(products[5]._id, { stock: 57 });
    await Product.findByIdAndUpdate(products[6]._id, { stock: 34 });

    console.log('\n✅ Seeding completed successfully!\n');
    console.log('📊 Seed Statistics:');
    console.log(`   Users: ${users.length}`);
    console.log(`   Warehouses: ${warehouses.length}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Orders: ${orders.length}`);
    console.log('\n👤 Test User Credentials:');
    console.log('   Admin:');
    console.log('   - Email: admin@system.core');
    console.log('   - Password: admin123');
    console.log('   - Role: ADMIN');
    console.log('\n   Manager:');
    console.log('   - Email: manager@system.core');
    console.log('   - Password: manager123');
    console.log('   - Role: MANAGER');
    console.log('\n   Staff:');
    console.log('   - Email: staff@system.core');
    console.log('   - Password: staff123');
    console.log('   - Role: STAFF');
    console.log('\n📦 Sample Products:');
    products.slice(0, 3).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} (SKU: ${p.sku})`);
    });
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seed();
