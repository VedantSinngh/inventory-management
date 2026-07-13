import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const TRANSACTION_UNSUPPORTED_ERRORS = [
  'Transaction numbers are only allowed on a replica set member or mongos',
  'Transactions are not supported',
  'replica set'
];

const isTransactionUnsupportedError = (error) => {
  const message = error?.message || '';
  return TRANSACTION_UNSUPPORTED_ERRORS.some(text => message.includes(text));
};

const runWithOptionalTransaction = async (work) => {
  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        // Ignore abort errors
      }
    }

    if (isTransactionUnsupportedError(error)) {
      return work(null);
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};

const createAuditLogs = (entries, session) => {
  if (session) {
    return AuditLog.create(entries, { session });
  }
  return AuditLog.create(entries);
};

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
router.get('/', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
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
    if (status && ['PENDING', 'APPROVED', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status)) {
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
router.post('/', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), validateOrderCreate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }

  const { type, items } = req.body;
  let totalAmount = 0;
  let totalCogs = 0;

  try {
    const createdOrder = await runWithOptionalTransaction(async (session) => {
      // Calculate total and validate items exist
      for (const item of items) {
        const product = session
          ? await Product.findById(item.product).session(session)
          : await Product.findById(item.product);

        if (!product) {
          const notFoundError = new Error(`Product not found: ${item.product}`);
          notFoundError.status = 404;
          throw notFoundError;
        }

        // For SALES orders, check stock availability
        if (type === 'SALES' && product.stock < item.quantity) {
          const stockError = new Error(
            `Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`
          );
          stockError.status = 400;
          throw stockError;
        }

        totalAmount += item.priceAtTime * item.quantity;
      }

      const sessionOptions = session ? { session } : undefined;

      // Update stock for all items atomically when possible
      for (const item of items) {
        const product = session
          ? await Product.findById(item.product).session(session)
          : await Product.findById(item.product);

        if (type === 'SALES') {
          // Decrement stock for sales with atomic $inc
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } },
            sessionOptions
          );

          // FIFO batch deduction
          const Batch = (await import('../models/Batch.js')).default;
          const activeBatches = session
            ? await Batch.find({ product: item.product, quantityAvailable: { $gt: 0 } }).sort({ fifoPosition: 1 }).session(session)
            : await Batch.find({ product: item.product, quantityAvailable: { $gt: 0 } }).sort({ fifoPosition: 1 });

          let remainingToDeduct = item.quantity;
          let calculatedCogs = 0;

          for (const batch of activeBatches) {
            if (remainingToDeduct <= 0) break;
            const deduct = Math.min(batch.quantityAvailable, remainingToDeduct);
            batch.quantityAvailable -= deduct;
            calculatedCogs += deduct * batch.unitCost;
            remainingToDeduct -= deduct;
            await batch.save(sessionOptions);
          }

          // Fallback to product unit cost if batches run dry
          if (remainingToDeduct > 0) {
            calculatedCogs += remainingToDeduct * (product.cost || 0);
          }

          item.cogs = calculatedCogs;
          item.margin = (item.priceAtTime * item.quantity) - calculatedCogs;
          totalCogs += calculatedCogs;

          await createAuditLogs([{
            action: 'STOCK_OUT',
            entityType: 'Product',
            entityId: item.product,
            user: req.user._id,
            details: { quantity: item.quantity, orderType: 'SALES', cogs: calculatedCogs }
          }], session);
        } else if (type === 'PURCHASE') {
          // Increment stock for purchases with atomic $inc
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } },
            sessionOptions
          );

          // Auto-create a batch for purchases to keep track of new unit costs
          const Batch = (await import('../models/Batch.js')).default;
          const batchNumber = 'BAT-' + Math.floor(100000 + Math.random() * 900000);
          const newBatch = new Batch({
            batchNumber,
            product: item.product,
            supplier: product.supplier || req.user._id, // fallback
            manufacturingDate: new Date(),
            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // default 1 year
            quantityReceived: item.quantity,
            quantityAvailable: item.quantity,
            unitCost: item.priceAtTime,
            qualityStatus: 'APPROVED',
            createdBy: req.user._id
          });
          await newBatch.save(sessionOptions);

          await createAuditLogs([{
            action: 'STOCK_IN',
            entityType: 'Product',
            entityId: item.product,
            user: req.user._id,
            details: { quantity: item.quantity, orderType: 'PURCHASE' }
          }], session);
        }
      }

      // Create the order (calculated totalAmount, not from client)
      const order = new Order({
        type,
        items,
        totalAmount,
        totalCogs,
        totalMargin: type === 'SALES' ? (totalAmount - totalCogs) : 0,
        createdBy: req.user._id,
        status: 'PENDING'
      });

      const savedOrder = await order.save(sessionOptions);

      // Log order creation
      await createAuditLogs([{
        action: 'CREATE',
        entityType: 'Order',
        entityId: savedOrder._id,
        user: req.user._id,
        details: { type, totalAmount, itemCount: items.length, totalCogs }
      }], session);

      return savedOrder;
    });

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
    res.status(error.status || 500).json({ message: error.message || 'Error creating order', error: error.message });
  }
});

// Get single order
router.get('/:id', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
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
    if (!['PENDING', 'APPROVED', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(status)) {
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
  try {
    const cancelledOrder = await runWithOptionalTransaction(async (session) => {
      const order = session
        ? await Order.findById(req.params.id).session(session)
        : await Order.findById(req.params.id);

      if (!order) {
        const notFoundError = new Error('Order not found');
        notFoundError.status = 404;
        throw notFoundError;
      }

      if (order.status === 'CANCELLED') {
        const cancelledError = new Error('Order is already cancelled');
        cancelledError.status = 400;
        throw cancelledError;
      }

      const sessionOptions = session ? { session } : undefined;

      // Reverse stock changes
      for (const item of order.items) {
        if (order.type === 'SALES') {
          // Reverse stock out (add back)
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: item.quantity } },
            sessionOptions
          );
        } else if (order.type === 'PURCHASE') {
          // Reverse stock in (remove)
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stock: -item.quantity } },
            sessionOptions
          );
        }
      }

      // Update order status
      order.status = 'CANCELLED';
      await order.save(sessionOptions);

      // Audit log
      await createAuditLogs([{
        action: 'UPDATE',
        entityType: 'Order',
        entityId: order._id,
        user: req.user._id,
        details: { action: 'CANCELLED', reverseReason: 'Manual cancellation' }
      }], session);

      return order;
    });

    const populatedOrder = await Order.findById(cancelledOrder._id)
      .populate('items.product')
      .populate('createdBy', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.emit('order-cancelled', populatedOrder);
      io.emit('stock-changed', { timestamp: new Date() });
    }

    res.json(populatedOrder);
  } catch (error) {
    res.status(error.status || 500).json({ message: error.message || 'Error cancelling order', error: error.message });
  }
});

export default router;
