import express from 'express';
import Alert from '../models/Alert.js';
import { protect } from '../middleware/auth.js';
import AnomalyDetectionService from '../services/anomalyDetectionService.js';

const router = express.Router();

// Get all alerts
router.get('/', protect, async (req, res) => {
  try {
    const {
      status = 'ACTIVE',
      severity,
      type,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (severity) query.severity = severity;
    if (type) query.type = type;

    const alerts = await Alert.find(query)
      .populate('relatedEntities.product', 'name sku')
      .populate('relatedEntities.shipment', 'trackingNumber status')
      .populate('relatedEntities.batch', 'batchNumber')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Alert.countDocuments(query);

    res.json({
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alerts', error: error.message });
  }
});

// Get alert by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('relatedEntities.product', 'name sku')
      .populate('relatedEntities.shipment', 'trackingNumber status')
      .populate('relatedEntities.batch', 'batchNumber')
      .populate('createdBy', 'name')
      .populate('acknowledgedBy', 'name')
      .populate('resolvedBy', 'name');

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alert', error: error.message });
  }
});

// Acknowledge alert
router.put('/:id/acknowledge', protect, async (req, res) => {
  try {
    const { notes } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedBy = req.user.id;
    alert.acknowledgedAt = new Date();

    if (notes) {
      alert.actions.push({
        action: 'ACKNOWLEDGE',
        description: notes,
        completed: true,
        completedAt: new Date(),
        completedBy: req.user.id
      });
    }

    await alert.save();

    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Error acknowledging alert', error: error.message });
  }
});

// Resolve alert
router.put('/:id/resolve', protect, async (req, res) => {
  try {
    const { resolution } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.status = 'RESOLVED';
    alert.resolvedBy = req.user.id;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;

    await alert.save();

    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Error resolving alert', error: error.message });
  }
});

// Complete alert action
router.put('/:id/actions/:actionIndex/complete', protect, async (req, res) => {
  try {
    const { actionIndex } = req.params;
    const { notes } = req.body;

    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    if (!alert.actions[actionIndex]) {
      return res.status(404).json({ message: 'Action not found' });
    }

    alert.actions[actionIndex].completed = true;
    alert.actions[actionIndex].completedAt = new Date();
    alert.actions[actionIndex].completedBy = req.user.id;

    if (notes) {
      alert.actions[actionIndex].description += ` - ${notes}`;
    }

    await alert.save();

    res.json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Error completing action', error: error.message });
  }
});

// Run anomaly detection
router.post('/detect-anomalies', protect, async (req, res) => {
  try {
    const { productId, timeRangeHours, sensitivity } = req.body;

    const results = await AnomalyDetectionService.detectStockAnomalies(
      productId,
      {
        timeRangeHours: timeRangeHours || 24,
        sensitivity: sensitivity || 'MEDIUM'
      }
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error detecting anomalies', error: error.message });
  }
});

// Detect dead stock
router.post('/detect-dead-stock', protect, async (req, res) => {
  try {
    const { noMovementDays } = req.body;

    const results = await AnomalyDetectionService.detectDeadStock({
      noMovementDays: noMovementDays || 90
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error detecting dead stock', error: error.message });
  }
});

// Run comprehensive anomaly analysis
router.post('/comprehensive-analysis', protect, async (req, res) => {
  try {
    const results = await AnomalyDetectionService.runComprehensiveAnalysis();

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error running comprehensive analysis', error: error.message });
  }
});

// Get alert analytics
router.get('/analytics/overview', protect, async (req, res) => {
  try {
    const totalAlerts = await Alert.countDocuments();
    const activeAlerts = await Alert.countDocuments({ status: 'ACTIVE' });
    const criticalAlerts = await Alert.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE' });
    const resolvedToday = await Alert.countDocuments({
      status: 'RESOLVED',
      resolvedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    // Alert type distribution
    const typeDistribution = await Alert.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Severity distribution
    const severityDistribution = await Alert.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    res.json({
      totalAlerts,
      activeAlerts,
      criticalAlerts,
      resolvedToday,
      typeDistribution,
      severityDistribution,
      resolutionRate: totalAlerts > 0 ? ((totalAlerts - activeAlerts) / totalAlerts * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alert analytics', error: error.message });
  }
});

// Create manual alert
router.post('/manual', protect, async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      createdBy: req.user.id,
      autoGenerated: false
    };

    const alert = new Alert(alertData);
    await alert.save();

    res.status(201).json(alert);
  } catch (error) {
    res.status(500).json({ message: 'Error creating manual alert', error: error.message });
  }
});

// Get alerts for specific entity
router.get('/entity/:entityType/:entityId', protect, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const alerts = await Alert.find({
      [`relatedEntities.${entityType}`]: entityId
    })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('acknowledgedBy', 'name')
      .populate('resolvedBy', 'name');

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching entity alerts', error: error.message });
  }
});

export default router;