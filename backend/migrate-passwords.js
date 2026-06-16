import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const migratePasswords = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventorySystem');
    console.log('✅ Connected');

    console.log('\n🔍 Finding users with plain text passwords...');
    const users = await User.find({});
    console.log(`Found ${users.length} users`);

    let updated = 0;
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2x$)
      const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2x$');
      
      if (!isHashed) {
        console.log(`  Hashing password for: ${user.email}`);
        user.password = await bcrypt.hash(user.password, 10);
        await user.save();
        updated++;
      } else {
        console.log(`  ✓ ${user.email} - already hashed`);
      }
    }

    console.log(`\n✅ Updated ${updated} users with hashed passwords`);
    
    // Test login
    console.log('\n🧪 Testing login...');
    const testUser = await User.findOne({ email: 'admin@inventory.com' });
    if (testUser) {
      const isMatch = await testUser.matchPassword('admin@123');
      console.log(`   admin@inventory.com match result: ${isMatch}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

migratePasswords();
