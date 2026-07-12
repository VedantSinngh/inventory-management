import express from 'express';
import CycleCount from '../models/CycleCount.js';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get all cycle counts with pagination and filters
router.get('/', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, warehouse, type } = req.query;
    
    const filters = {};
    if (status) filters.status = status;
    if (warehouse) filters.warehouse = warehouse;
    if (type) filters.type = type;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const cycleCounts = await CycleCount.find(filters)
      .populate('warehouse', 'name code')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await CycleCount.countDocuments(filters);

    res.json({
      data: cycleCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cycle counts', error: error.message });
  }
});

// Get cycle count by ID
router.get('/:id', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const cycleCount = await CycleCount.findById(req.params.id)
      .populate('warehouse', 'name code')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('items.product', 'name sku')
      .populate('items.batch', 'batchNumber')
      .populate('items.countedBy', 'name')
      .populate('items.verifiedBy', 'name');

    if (!cycleCount) {
      return res.status(404).json({ message: 'Cycle count not found' });
    }

    res.json(cycleCount);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cycle count', error: error.message });
  }
});

// Create new cycle count
router.post('/', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const {
      warehouse,
      status = 'PLANNED',
      type = 'PARTIAL',
      scope,
      scheduledDate,
      assignedTo,
      priority = 'MEDIUM',
      recurrence
    } = req.body;

    // Generate unique cycle count ID
    const cycleCountId = `CC-${Date.now()}`;

    const cycleCount = new CycleCount({
      cycleCountId,
      warehouse,
      status,
      type,
      scope,
      scheduledDate,
      assignedTo: assignedTo || [],
      priority,
      recurrence,
      createdBy: req.user.id
    });

    await cycleCount.save();
    await cycleCount.populate('warehouse', 'name code');
    await cycleCount.populate('assignedTo', 'name email');
    await cycleCount.populate('createdBy', 'name email');

    res.status(201).json(cycleCount);
  } catch (error) {
    res.status(400).json({ message: 'Error creating cycle count', error: error.message });
  }
});

// Update cycle count
router.put('/:id', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const { status, assignedTo, priority, recurrence, completedDate } = req.body;

    const cycleCount = await CycleCount.findById(req.params.id);
    if (!cycleCount) {
      return res.status(404).json({ message: 'Cycle count not found' });
    }

    if (status) cycleCount.status = status;
    if (assignedTo !== undefined) cycleCount.assignedTo = assignedTo;
    if (priority) cycleCount.priority = priority;
    if (recurrence) cycleCount.recurrence = recurrence;
    if (completedDate) cycleCount.completedDate = completedDate;

    await cycleCount.save();
    await cycleCount.populate('warehouse', 'name code');
    await cycleCount.populate('assignedTo', 'name email');
    await cycleCount.populate('createdBy', 'name email');

    res.json(cycleCount);
  } catch (error) {
    res.status(400).json({ message: 'Error updating cycle count', error: error.message });
  }
});

// Add item to cycle count
router.post('/:id/items', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const { product, batch, location, systemQuantity } = req.body;

    const cycleCount = await CycleCount.findById(req.params.id);
    if (!cycleCount) {
      return res.status(404).json({ message: 'Cycle count not found' });
    }

    cycleCount.items.push({
      product,
      batch,
      location,
      systemQuantity
    });

    cycleCount.summary.totalItems = cycleCount.items.length;

    await cycleCount.save();
    await cycleCount.populate('items.product', 'name sku');
    await cycleCount.populate('items.batch', 'batchNumber');

    res.json(cycleCount);
  } catch (error) {
    res.status(400).json({ message: 'Error adding item to cycle count', error: error.message });
  }
});

// Update item count
router.put('/:id/items/:itemIndex', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const { countedQuantity, discrepancyReason, notes } = req.body;
    const { id, itemIndex } = req.params;

    const cycleCount = await CycleCount.findById(id);
    if (!cycleCount) {
      return res.status(404).json({ message: 'Cycle count not found' });
    }

    const item = cycleCount.items[itemIndex];
    if (!item) {
      return res.status(404).json({ message: 'Item not found in cycle count' });
    }

    item.countedQuantity = countedQuantity;
    item.discrepancy = countedQuantity - item.systemQuantity;
    item.discrepancyReason = discrepancyReason;
    item.notes = notes;
    item.countedBy = req.user.id;
    item.countedAt = new Date();

    // Update summary
    const discrepanciesFound = cycleCount.items.filter(i => i.discrepancy !== 0).length;
    cycleCount.summary.countedItems = cycleCount.items.filter(i => i.countedQuantity !== undefined).length;
    cycleCount.summary.discrepanciesFound = discrepanciesFound;
    cycleCount.summary.totalDiscrepancyValue = cycleCount.items.reduce((sum, i) => sum + (i.discrepancy || 0), 0);
    cycleCount.summary.accuracyPercentage = cycleCount.summary.countedItems > 0
      ? ((cycleCount.summary.countedItems - discrepanciesFound) / cycleCount.summary.countedItems * 100)
      : 0;

    await cycleCount.save();
    res.json(cycleCount);
  } catch (error) {
    res.status(400).json({ message: 'Error updating item count', error: error.message });
  }
});

// Complete cycle count
router.post('/:id/complete', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const cycleCount = await CycleCount.findById(req.params.id);
    if (!cycleCount) {
      return res.status(404).json({ message: 'Cycle count not found' });
    }

    cycleCount.status = 'COMPLETED';
    cycleCount.completedDate = new Date();

    // Calculate final accuracy
    const discrepanciesFound = cycleCount.items.filter(i => i.discrepancy !== 0).length;
    cycleCount.summary.discrepanciesFound = discrepanciesFound;
    cycleCount.summary.accuracyPercentage = cycleCount.summary.countedItems > 0
      ? ((cycleCount.summary.countedItems - discrepanciesFound) / cycleCount.summary.countedItems * 100)
      : 0;

    await cycleCount.save();
    await cycleCount.populate('warehouse', 'name code');
    await cycleCount.populate('assignedTo', 'name email');

    res.json(cycleCount);
  } catch (error) {
    res.status(400).json({ message: 'Error completing cycle count', error: error.message });
  }
});

// Delete cycle count
router.delete('/:id', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const cycleCount = await CycleCount.findByIdAndDelete(req.params.id);
    if (!cycleCount) {
      return res.status(404).json({ message: 'Cycle count not found' });
    }

    res.json({ message: 'Cycle count deleted successfully', cycleCountId: cycleCount.cycleCountId });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting cycle count', error: error.message });
  }
});

// Get cycle count statistics
router.get('/stats/summary', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const stats = await CycleCount.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgAccuracy: { $avg: '$summary.accuracyPercentage' }
        }
      }
    ]);

    const total = await CycleCount.countDocuments();

    res.json({
      stats,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
});

export default router;
