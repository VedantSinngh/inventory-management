import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/inventorySystem');
    
    // Clear existing users
    await User.deleteMany({});
    
    // Do NOT pre-hash — the User model's pre('save') hook handles hashing
    await User.create({
      name: 'System Admin',
      email: 'admin@system.core',
      password: 'admin123',
      role: 'ADMIN'
    });

    console.log('User Seeded Successfully!');
    console.log('Email: admin@system.core');
    console.log('Password: admin123');
    
    process.exit();
  } catch (error) {
    console.error('Error seeding user:', error);
    process.exit(1);
  }
};

seed();
