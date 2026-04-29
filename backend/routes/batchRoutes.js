import express from 'express';
import Batch from '../models/Batch.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/auth.js';
import BatchTrackingService from '../services/batchTrackingService.js';

const router = express.Router();

// Get batches for a product
router.get('/product/:productId', protect, async (req, res) => {
  try {
    const { strategy = 'FIFO', includeExpired = false } = req.query;

    const batches = await BatchTrackingService.getBatchesForProduct(
      req.params.productId,
      strategy,
      { includeExpired: includeExpired === 'true' }
    );

    res.json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batches', error: error.message });
  }
});

// Get batch by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('product', 'name sku')
      .populate('supplier', 'name code');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batch', error: error.message });
  }
});

// Create new batch
router.post('/', protect, async (req, res) => {
  try {
    const batch = await BatchTrackingService.createBatch({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Error creating batch', error: error.message });
  }
});

// Allocate stock from batches
router.post('/allocate', protect, async (req, res) => {
  try {
    const { productId, quantity, strategy = 'FIFO' } = req.body;

    const allocation = await BatchTrackingService.allocateStock(productId, quantity, strategy);

    res.json({
      allocation,
      totalAllocated: allocation.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get batch expiry alerts
router.get('/alerts/expiry', protect, async (req, res) => {
  try {
    const alerts = await BatchTrackingService.checkExpiryAlerts();

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error checking expiry alerts', error: error.message });
  }
});

// Get batch rotation recommendations
router.get('/rotation/:productId', protect, async (req, res) => {
  try {
    const recommendations = await BatchTrackingService.getRotationRecommendations(req.params.productId);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: 'Error getting rotation recommendations', error: error.message });
  }
});

// Get batch traceability
router.get('/:id/traceability', protect, async (req, res) => {
  try {
    const traceability = await BatchTrackingService.getBatchTraceability(req.params.id);

    res.json(traceability);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Quarantine batch
router.put('/:id/quarantine', protect, async (req, res) => {
  try {
    const { reason } = req.body;

    const batch = await BatchTrackingService.quarantineBatch(req.params.id, reason, req.user.id);

    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update batch quality status
router.put('/:id/quality', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    batch.qualityStatus = status;
    if (notes) {
      batch.alerts.push({
        type: 'QUALITY_UPDATE',
        message: `Quality status changed to ${status}`,
        severity: 'MEDIUM',
        acknowledgedBy: req.user.id,
        acknowledgedAt: new Date(),
        createdAt: new Date()
      });
    }

    await batch.save();

    res.json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Error updating batch quality', error: error.message });
  }
});

// Process expired batches
router.post('/process-expired', protect, async (req, res) => {
  try {
    const result = await BatchTrackingService.processExpiredBatches();

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error processing expired batches', error: error.message });
  }
});

// Get batch analytics
router.get('/analytics/overview', protect, async (req, res) => {
  try {
    const totalBatches = await Batch.countDocuments();
    const activeBatches = await Batch.countDocuments({ quantityAvailable: { $gt: 0 } });
    const expiredBatches = await Batch.countDocuments({
      expiryDate: { $lt: new Date() },
      quantityAvailable: { $gt: 0 }
    });

    const expiringSoon = await Batch.countDocuments({
      expiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      quantityAvailable: { $gt: 0 }
    });

    const quarantinedBatches = await Batch.countDocuments({ qualityStatus: 'QUARANTINED' });

    res.json({
      totalBatches,
      activeBatches,
      expiredBatches,
      expiringSoon,
      quarantinedBatches,
      healthyPercentage: totalBatches > 0 ? ((activeBatches - expiredBatches - quarantinedBatches) / totalBatches * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batch analytics', error: error.message });
  }
});

export default router;