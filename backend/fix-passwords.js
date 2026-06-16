import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const fixPasswordsDirectly = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventorySystem');
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Finding users and fixing passwords...');
    
    // Delete all existing users first
    await User.deleteMany({});
    console.log('✅ Cleared existing users');

    // Create users with PROPER hashing
    console.log('\n👤 Creating users with hashed passwords...');
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

    console.log(`✅ Created ${users.length} users with properly hashed passwords`);

    // Verify passwords work
    console.log('\n🧪 Testing password verification...');
    const testUser = await User.findOne({ email: 'admin@inventory.com' });
    if (testUser) {
      const isMatch = await testUser.matchPassword('admin@123');
      console.log(`   ✅ admin@inventory.com password match: ${isMatch}`);
      
      if (!isMatch) {
        console.error('   ❌ PASSWORD VERIFICATION FAILED!');
        process.exit(1);
      }
    }

    console.log('\n✅ SUCCESS! All users created with properly hashed passwords');
    console.log('\nYou can now login with:');
    console.log('  Email: admin@inventory.com');
    console.log('  Password: admin@123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

fixPasswordsDirectly();
