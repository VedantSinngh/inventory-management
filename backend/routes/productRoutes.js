import express from 'express';
import { validationResult } from 'express-validator';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';
import { validateProductCreate, validateProductUpdate } from '../middleware/validators.js';

const router = express.Router();

// Get all products with pagination and filtering
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const warehouse = req.query.warehouse;
    const search = req.query.search;

    // Build filter
    const filter = { deletedAt: null }; // Exclude soft-deleted products

    if (category) {
      filter.category = category;
    }

    if (warehouse) {
      filter.warehouse = warehouse;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('warehouse', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Create product
router.post('/', protect, authorize('ADMIN', 'MANAGER'), validateProductCreate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }

  try {
    // Check if SKU already exists
    const existingSku = await Product.findOne({ sku: req.body.sku, deletedAt: null });
    if (existingSku) {
      return res.status(409).json({ message: 'Product with this SKU already exists' });
    }

    const product = new Product(req.body);
    const createdProduct = await product.save();

    await AuditLog.create({
      action: 'CREATE',
      entityType: 'Product',
      entityId: createdProduct._id,
      user: req.user._id,
      details: { name: createdProduct.name, initialStock: createdProduct.stock }
    });

    const io = req.app.get('io');
    if (io) io.emit('product-created', createdProduct);

    const populatedProduct = await Product.findById(createdProduct._id).populate('warehouse');
    res.status(201).json(populatedProduct);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'SKU must be unique' });
    }
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// Get single product
router.get('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, deletedAt: null })
      .populate('warehouse');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// Update product (prevent direct stock modification via PUT - stock changes only via orders)
router.put('/:id', protect, authorize('ADMIN', 'MANAGER'), validateProductUpdate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }

  try {
    // Prevent direct stock manipulation
    if (req.body.hasOwnProperty('stock')) {
      return res.status(400).json({
        message: 'Cannot directly modify stock. Use order creation/cancellation instead.'
      });
    }

    const product = await Product.findOne({ _id: req.params.id, deletedAt: null });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if SKU is being changed to an existing SKU
    if (req.body.sku && req.body.sku !== product.sku) {
      const existingSku = await Product.findOne({ sku: req.body.sku, deletedAt: null });
      if (existingSku) {
        return res.status(409).json({ message: 'This SKU is already in use' });
      }
    }

    // Update only allowed fields
    const allowedFields = ['name', 'sku', 'category', 'price', 'lowStockThreshold', 'supplier', 'warehouse'];
    allowedFields.forEach(field => {
      if (req.body.hasOwnProperty(field)) {
        product[field] = req.body[field];
      }
    });

    const updatedProduct = await product.save();

    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Product',
      entityId: updatedProduct._id,
      user: req.user._id,
      details: { updates: req.body }
    });

    const io = req.app.get('io');
    if (io) io.emit('product-updated', updatedProduct);

    const populatedProduct = await Product.findById(updatedProduct._id).populate('warehouse');
    res.json(populatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Soft delete product (ADMIN only)
router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, deletedAt: null });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Soft delete
    product.deletedAt = new Date();
    await product.save();

    await AuditLog.create({
      action: 'DELETE',
      entityType: 'Product',
      entityId: product._id,
      user: req.user._id,
      details: { productName: product.name, reason: req.body.reason || 'No reason provided' }
    });

    res.json({ message: 'Product deleted successfully', product });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

export default router;
