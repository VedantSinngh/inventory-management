import express from 'express';
import { body, validationResult } from 'express-validator';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const validateWarehouseCreate = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Warehouse name must be between 2 and 255 characters'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Location must be between 2 and 255 characters'),
  body('capacity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Capacity must be a non-negative integer')
];

// Get all warehouses
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = { deletedAt: null };

    const total = await Warehouse.countDocuments(filter);
    const warehouses = await Warehouse.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: warehouses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching warehouses', error: error.message });
  }
});

// Create warehouse (ADMIN only)
router.post('/', protect, authorize('ADMIN'), validateWarehouseCreate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }

  try {
    const warehouse = new Warehouse(req.body);
    const createdWarehouse = await warehouse.save();

    await AuditLog.create({
      action: 'CREATE',
      entityType: 'Warehouse',
      entityId: createdWarehouse._id,
      user: req.user._id,
      details: { name: createdWarehouse.name, location: createdWarehouse.location }
    });

    res.status(201).json(createdWarehouse);
  } catch (error) {
    res.status(500).json({ message: 'Error creating warehouse', error: error.message });
  }
});

// Get single warehouse with stock summary
router.get('/:id', protect, async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ _id: req.params.id, deletedAt: null });

    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Get products in this warehouse
    const products = await Product.find({
      warehouse: req.params.id,
      deletedAt: null
    });

    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => p.stock <= p.lowStockThreshold).length;

    res.json({
      warehouse,
      inventory: {
        products,
        totalStock,
        totalProducts,
        lowStockCount
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching warehouse', error: error.message });
  }
});

// Get stock in warehouse
router.get('/:id/stock', protect, async (req, res) => {
  try {
    const products = await Product.find({
      warehouse: req.params.id,
      deletedAt: null
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching warehouse stock', error: error.message });
  }
});

// Update warehouse (ADMIN only)
router.put('/:id', protect, authorize('ADMIN'), validateWarehouseCreate, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: 'Validation error', errors: errors.array() });
  }

  try {
    const warehouse = await Warehouse.findOne({ _id: req.params.id, deletedAt: null });

    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    Object.assign(warehouse, req.body);
    const updatedWarehouse = await warehouse.save();

    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Warehouse',
      entityId: updatedWarehouse._id,
      user: req.user._id,
      details: { updates: req.body }
    });

    res.json(updatedWarehouse);
  } catch (error) {
    res.status(500).json({ message: 'Error updating warehouse', error: error.message });
  }
});

// Soft delete warehouse (ADMIN only)
router.delete('/:id', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const warehouse = await Warehouse.findOne({ _id: req.params.id, deletedAt: null });

    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check if warehouse has active products
    const productsInWarehouse = await Product.countDocuments({
      warehouse: req.params.id,
      deletedAt: null
    });

    if (productsInWarehouse > 0) {
      return res.status(409).json({
        message: `Cannot delete warehouse with active products. Found ${productsInWarehouse} products.`
      });
    }

    // Soft delete
    warehouse.deletedAt = new Date();
    await warehouse.save();

    await AuditLog.create({
      action: 'DELETE',
      entityType: 'Warehouse',
      entityId: warehouse._id,
      user: req.user._id,
      details: { warehouseName: warehouse.name, reason: req.body.reason || 'No reason provided' }
    });

    res.json({ message: 'Warehouse deleted successfully', warehouse });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting warehouse', error: error.message });
  }
});

export default router;
