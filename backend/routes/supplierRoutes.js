import express from 'express';
import Supplier from '../models/Supplier.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get all suppliers
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;

    const query = { deletedAt: null };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) query.status = status;

    const suppliers = await Supplier.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Supplier.countDocuments(query);

    res.json({
      suppliers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers', error: error.message });
  }
});

// Get supplier by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deletedAt: null });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supplier', error: error.message });
  }
});

// Create new supplier
router.post('/', protect, async (req, res) => {
  try {
    const supplierData = { ...req.body, createdBy: req.user.id };

    // Generate supplier code if not provided
    if (!supplierData.code) {
      const lastSupplier = await Supplier.findOne({}, {}, { sort: { createdAt: -1 } });
      const nextId = lastSupplier ? parseInt(lastSupplier.code.replace('SUP', '')) + 1 : 1;
      supplierData.code = `SUP${nextId.toString().padStart(4, '0')}`;
    }

    const supplier = new Supplier(supplierData);
    await supplier.save();

    res.status(201).json(supplier);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Supplier code already exists' });
    } else {
      res.status(500).json({ message: 'Error creating supplier', error: error.message });
    }
  }
});

// Update supplier
router.put('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deletedAt: null });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    Object.assign(supplier, req.body);
    await supplier.save();

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error updating supplier', error: error.message });
  }
});

// Soft delete supplier
router.delete('/:id', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    supplier.deletedAt = new Date();
    await supplier.save();

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting supplier', error: error.message });
  }
});

// Get supplier performance metrics
router.get('/:id/performance', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deletedAt: null });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // This would typically aggregate from orders and shipments
    // For now, return stored performance data
    res.json({
      supplierId: supplier._id,
      performance: supplier.performance,
      rating: supplier.rating,
      leadTime: supplier.leadTime
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supplier performance', error: error.message });
  }
});

// Update supplier rating
router.put('/:id/rating', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const supplier = await Supplier.findOne({ _id: req.params.id, deletedAt: null });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    supplier.rating = rating;
    supplier.notes.push({
      type: 'RATING_UPDATE',
      message: `Rating updated to ${rating}/5`,
      details: comment,
      timestamp: new Date()
    });

    await supplier.save();

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ message: 'Error updating supplier rating', error: error.message });
  }
});

// Sync with supplier API (if available)
router.post('/:id/sync', protect, async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ _id: req.params.id, deletedAt: null });

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    if (!supplier.apiCredentials.hasApiAccess) {
      return res.status(400).json({ message: 'Supplier does not have API access configured' });
    }

    // Simulate API sync (would implement actual API calls)
    supplier.apiCredentials.lastSync = new Date();
    await supplier.save();

    res.json({
      message: 'Supplier data synchronized successfully',
      lastSync: supplier.apiCredentials.lastSync
    });
  } catch (error) {
    res.status(500).json({ message: 'Error synchronizing supplier data', error: error.message });
  }
});

export default router;