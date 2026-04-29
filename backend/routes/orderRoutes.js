import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Order validation schemas
const validateOrderCreate = [
  body('type')
    .isIn(['PURCHASE', 'SALES'])
    .withMessage('Order type must be PURCHASE or SALES'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Invalid product ID'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),
  body('items.*.priceAtTime')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number')
];

// Get all orders - with pagination and filtering
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = req.query.type; // Filter by SALES or PURCHASE
    const status = req.query.status; // Filter by status

    // Build filter
    const filter = {};
    if (type && ['PURCHASE', 'SALES'].includes(type)) {
      filter.type = type;
    }
    if (status && ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      filter.status = status;
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('items.product')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching orders', error: error.message });
  }
});

/**
 * Create order with atomic stock update using MongoDB transactions
 * Prevents race conditions where concurrent orders can over-deduct stock
 */
router.post('/', protect, validateOrderCreate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }

  const { type, items } = req.body;
  let totalAmount = 0;

  // Start a MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Calculate total and validate items exist
    for (const item of items) {
      const product = await Product.findById(item.product).session(session);
      
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ message: `Product not found: ${item.product}` });
      }

      // For SALES orders, check stock availability
      if (type === 'SALES' && product.stock < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
        });
      }

      totalAmount += item.priceAtTime * item.quantity;
    }

    // Update stock for all items atomically
    for (const item of items) {
      if (type === 'SALES') {
        // Decrement stock for sales with atomic $inc
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity } },
          { session }
        );

        await AuditLog.create([{
          action: 'STOCK_OUT',
          entityType: 'Product',
          entityId: item.product,
          user: req.user._id,
          details: { quantity: item.quantity, orderType: 'SALES' }
        }], { session });
      } else if (type === 'PURCHASE') {
        // Increment stock for purchases with atomic $inc
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { session }
        );

        await AuditLog.create([{
          action: 'STOCK_IN',
          entityType: 'Product',
          entityId: item.product,
          user: req.user._id,
          details: { quantity: item.quantity, orderType: 'PURCHASE' }
        }], { session });
      }
    }

    // Create the order (calculated totalAmount, not from client)
    const order = new Order({
      type,
      items,
      totalAmount,
      createdBy: req.user._id,
      status: 'COMPLETED'
    });

    const createdOrder = await order.save({ session });

    // Log order creation
    await AuditLog.create([{
      action: 'CREATE',
      entityType: 'Order',
      entityId: createdOrder._id,
      user: req.user._id,
      details: { type, totalAmount, itemCount: items.length }
    }], { session });

    // Commit transaction
    await session.commitTransaction();

    // Populate and emit event
    const populatedOrder = await Order.findById(createdOrder._id)
      .populate('items.product')
      .populate('createdBy', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.emit('order-created', populatedOrder);
      io.emit('stock-changed', { timestamp: new Date() });
    }

    res.status(201).json(populatedOrder);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Error creating order', error: error.message });
  } finally {
    await session.endSession();
  }
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching order', error: error.message });
  }
});

// Update order status (MANAGER and ADMIN only)
router.put('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status
    if (!['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('items.product').populate('createdBy', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Audit log the status change
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Order',
      entityId: order._id,
      user: req.user._id,
      details: { newStatus: status }
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Error updating order', error: error.message });
  }
});

// Cancel order (MANAGER and ADMIN only) - with stock reversal
router.post('/:id/cancel', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'CANCELLED') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Order is already cancelled' });
    }

    // Reverse stock changes
    for (const item of order.items) {
      if (order.type === 'SALES') {
        // Reverse stock out (add back)
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: item.quantity } },
          { session }
        );
      } else if (order.type === 'PURCHASE') {
        // Reverse stock in (remove)
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stock: -item.quantity } },
          { session }
        );
      }
    }

    // Update order status
    order.status = 'CANCELLED';
    await order.save({ session });

    // Audit log
    await AuditLog.create([{
      action: 'UPDATE',
      entityType: 'Order',
      entityId: order._id,
      user: req.user._id,
      details: { action: 'CANCELLED', reverseReason: 'Manual cancellation' }
    }], { session });

    await session.commitTransaction();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product')
      .populate('createdBy', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.emit('order-cancelled', populatedOrder);
      io.emit('stock-changed', { timestamp: new Date() });
    }

    res.json(populatedOrder);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Error cancelling order', error: error.message });
  } finally {
    await session.endSession();
  }
});

export default router;
