import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import emailService from '../services/emailService.js';

const router = express.Router();

// Rate limiter for login attempts: max 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '30d' });
};

// Login endpoint with validation and rate limiting
router.post(
  '/login',
  loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }).withMessage('Password is required'),
  async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email, password } = req.body;
    
     try {
       const user = await User.findOne({ email });

       // Check if user exists
       if (!user) {
         return res.status(401).json({ message: 'Invalid email or password' });
       }

       // Check if password matches
       const passwordMatch = await user.matchPassword(password);
       if (!passwordMatch) {
         return res.status(401).json({ message: 'Invalid email or password' });
       }

       // Check if account is active
       if (user.status !== 'ACTIVE') {
         return res.status(403).json({ 
           message: `Your account status is ${user.status}. Please contact support if you believe this is an error.`,
           code: 'ACCOUNT_NOT_ACTIVE',
           status: user.status
         });
       }

       // All checks passed - login successful
       user.lastLogin = new Date();
       await user.save();

       res.json({
         _id: user._id,
         name: user.name || 'User',
         email: user.email,
         role: user.role,
         token: generateToken(user._id)
       });
     } catch (error) {
       res.status(500).json({ message: 'Server error', error: error.message });
     }
  }
);

// Get current user profile
router.get('/me', protect, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public: User self-registration with email verification
router.post(
  '/signup',
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }

      // Create new user with STAFF role by default and active status
      const newUser = await User.create({
        name,
        email,
        password,
        role: 'STAFF',
        isVerified: true,
        status: 'ACTIVE'
      });

       res.status(201).json({
         message: 'User registered successfully. You can now login.',
         user: {
           _id: newUser._id,
           name: newUser.name,
           email: newUser.email,
           role: newUser.role
         }
       });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Public: Verify email with token
router.post(
  '/verify-email',
  body('token').trim().notEmpty().withMessage('Verification token is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { token } = req.body;

    try {
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired verification token' });
      }

      // Mark user as verified
      user.isVerified = true;
      user.verificationToken = null;
      user.verificationTokenExpires = null;
      user.status = 'ACTIVE';
      await user.save();

      res.json({ message: 'Email verified successfully. You can now login.' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Public: Verify email with token (GET request from UI)
router.get('/verify', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ message: 'Verification token is required' });
  }

  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token' });
    }

    // Mark user as verified
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    user.status = 'ACTIVE';
    await user.save();

    res.json({ message: 'Email verified successfully. You can now login.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin only: Create new user (registration endpoint)
router.post(
  '/register',
  protect,
  authorize('ADMIN'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['ADMIN', 'MANAGER', 'STAFF']).withMessage('Invalid role'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }

       // Create new user (admin-created users are verified by default)
       const newUser = await User.create({
         name,
         email,
         password,
         role: role || 'STAFF',
         isVerified: true,
         status: 'ACTIVE'
       });

       // Send welcome email - but don't fail if email service fails
       try {
         const emailResult = await emailService.sendWelcomeEmail(
           newUser.email,
           newUser.name,
           newUser.role
         );

         if (!emailResult || !emailResult.success) {
           console.warn(`Warning: Failed to send welcome email to ${newUser.email}`);
           // Don't delete the user - admin-created users can still login even if email fails
         }
       } catch (emailError) {
         console.error('Email service error for welcome email:', emailError);
         // Don't fail registration - user is already created and verified
       }

       res.status(201).json({
         _id: newUser._id,
         name: newUser.name,
         email: newUser.email,
         role: newUser.role,
         message: `User created successfully as ${role || 'STAFF'}`,
         token: generateToken(newUser._id)
       });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Admin only: Get all users
router.get(
  '/users',
  protect,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const users = await User.find({})
        .select('-password -verificationToken -resetToken')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await User.countDocuments({});

      res.json({
        data: users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Admin only: Update user role or status
router.put(
  '/users/:id',
  protect,
  authorize('ADMIN'),
  body('role').optional().isIn(['ADMIN', 'MANAGER', 'STAFF']),
  body('status').optional().isIn(['ACTIVE', 'INACTIVE', 'PENDING']),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    try {
      const { role, status } = req.body;
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (role) user.role = role;
      if (status) user.status = status;

      await user.save();

      res.json({
        message: 'User updated successfully',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Admin only: Delete user
router.delete(
  '/users/:id',
  protect,
  authorize('ADMIN'),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Prevent deleting the last admin
      if (user.role === 'ADMIN') {
        const adminCount = await User.countDocuments({ role: 'ADMIN' });
        if (adminCount === 1) {
          return res.status(400).json({ message: 'Cannot delete the last admin user' });
        }
      }

      await User.findByIdAndDelete(req.params.id);

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Public: Forgot password - request password reset
router.post(
  '/forgot-password',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { message: 'Too many password reset attempts, please try again later' }
  }),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      // Don't reveal if email exists (security best practice)
      if (!user) {
        return res.json({
          message: 'If an account exists with this email, you will receive a password reset link'
        });
      }

      // Generate reset token (1 hour expiration)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      user.resetToken = resetToken;
      user.resetTokenExpires = resetTokenExpires;
      await user.save();

      // Send reset email
      const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
      await emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken,
        resetLink
      );

      res.json({
        message: 'If an account exists with this email, you will receive a password reset link'
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Public: Reset password with token
router.post(
  '/reset-password',
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').isLength({ min: 8 }).withMessage('Confirm password required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { token, password, confirmPassword } = req.body;

    // Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
      const user = await User.findOne({
        resetToken: token,
        resetTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Update password
      user.password = password;
      user.resetToken = null;
      user.resetTokenExpires = null;
      await user.save();

      res.json({ message: 'Password reset successfully. You can now login.' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Protected: Change password (logged-in user)
router.post(
  '/change-password',
  protect,
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').isLength({ min: 8 }).withMessage('Confirm password required'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation error', errors: errors.array() });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate new passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    try {
      const user = await User.findById(req.user._id);

      // Verify current password
      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Public: Setup endpoint - creates initial admin user if database is empty
// This is for first-time deployment setup only
// Supports both GET (for easy testing/browsers) and POST
const setupHandler = async (req, res) => {
  try {
    const userCount = await User.countDocuments({});
    
    // If users already exist, don't allow setup
    if (userCount > 0) {
      return res.status(409).json({ 
        message: 'Database already initialized with users. Setup not needed.',
        userCount 
      });
    }

    // Create admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@inventory.com',
      password: 'admin@123',
      role: 'ADMIN',
      isVerified: true,
      status: 'ACTIVE',
      lastLogin: new Date()
    });

    // Create additional demo users
    await User.create([
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
        name: 'Staff - Mike Davis',
        email: 'staff1@inventory.com',
        password: 'staff@123',
        role: 'STAFF',
        isVerified: true,
        status: 'ACTIVE',
        lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000)
      }
    ]);

    res.status(201).json({
      message: 'Database initialized successfully',
      admin: {
        email: 'admin@inventory.com',
        password: 'admin@123',
        role: 'ADMIN'
      },
      additionalUsers: [
        { email: 'manager@inventory.com', password: 'manager@123', role: 'MANAGER' },
        { email: 'staff1@inventory.com', password: 'staff@123', role: 'STAFF' }
      ],
      warning: 'IMPORTANT: Delete this endpoint or disable it in production after first setup'
    });
  } catch (error) {
    res.status(500).json({ message: 'Setup error', error: error.message });
  }
};

// Support both GET and POST for setup
router.get('/setup', setupHandler);
router.post('/setup', setupHandler);

// Public: Emergency endpoint to rehash all passwords
// Use this ONLY to fix existing plain text passwords
// WARNING: Remove this endpoint after first use in production
router.post('/rehash-passwords', async (req, res) => {
  try {
    console.log('🔍 Starting emergency password rehashing...');
    const bcryptjs = await import('bcryptjs');
    const users = await User.find({});
    
    let updated = 0;
    let skipped = 0;
    
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2x$)
      const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2x$');
      
      if (!isHashed) {
        console.log(`  Hashing password for: ${user.email}`);
        try {
          // Directly hash the password
          const hashedPassword = await bcryptjs.hash(user.password, 10);
          // Update directly in database to avoid double-hashing from the pre-save hook
          await User.updateOne({ _id: user._id }, { password: hashedPassword });
          updated++;
        } catch (err) {
          console.error(`  Error hashing ${user.email}:`, err.message);
        }
      } else {
        console.log(`  ✓ ${user.email} - already hashed`);
        skipped++;
      }
    }

    console.log(`✅ Rehashing complete: ${updated} updated, ${skipped} already hashed`);
    res.json({
      message: 'Password rehashing completed',
      updated,
      skipped,
      total: users.length,
      warning: 'IMPORTANT: Delete or disable this endpoint immediately after use. It is a security risk.'
    });
  } catch (error) {
    console.error('Rehashing error:', error);
    res.status(500).json({ message: 'Rehashing error', error: error.message });
  }
});

// Admin: Fix password hashing for users with plain text passwords
// This endpoint directly hashes plain text passwords using bcryptjs
// Admin only: Fix password hashing for users with plain text passwords
// Protected endpoint - admin authentication required
router.post('/migrate-passwords', protect, authorize('ADMIN'), async (req, res) => {
  try {
    console.log('🔍 Starting password migration...');
    const bcryptjs = await import('bcryptjs');
    const users = await User.find({});
    
    let updated = 0;
    for (const user of users) {
      // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2x$)
      const isHashed = user.password.startsWith('$2a$') || user.password.startsWith('$2b$') || user.password.startsWith('$2x$');
      
      if (!isHashed) {
        console.log(`  Hashing password for: ${user.email}`);
        // Directly hash the password
        const hashedPassword = await bcryptjs.hash(user.password, 10);
        // Update directly in database to avoid double-hashing from the pre-save hook
        await User.updateOne({ _id: user._id }, { password: hashedPassword });
        updated++;
      }
    }

    console.log(`✅ Updated ${updated} users`);
    res.json({
      message: 'Password migration completed',
      updated,
      total: users.length,
      note: 'This endpoint is now admin-protected'
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Migration error', error: error.message });
  }
});

export default router;
