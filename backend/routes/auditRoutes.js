import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

/**
 * Get audit logs with pagination, filtering, and sorting
 * ADMIN can view all, others can only view their own actions
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    // If not admin, only show logs created by current user
    if (req.user.role !== 'ADMIN') {
      filter.user = req.user._id;
    }

    // Optional filters
    if (req.query.action) {
      filter.action = req.query.action;
    }

    if (req.query.entityType) {
      filter.entityType = req.query.entityType;
    }

    if (req.query.entityId) {
      filter.entityId = req.query.entityId;
    }

    if (req.query.userId && req.user.role === 'ADMIN') {
      filter.user = req.query.userId;
    }

    // Date range filtering
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching audit logs', error: error.message });
  }
});

/**
 * Get audit logs for a specific entity
 */
router.get('/entity/:entityType/:entityId', protect, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter = { entityType, entityId };

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      data: logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching entity logs', error: error.message });
  }
});

/**
 * Get audit summary (ADMIN only)
 */
router.get('/summary/stats', protect, authorize('ADMIN'), async (req, res) => {
  try {
    // Count by action
    const actionStats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    // Count by entity type
    const entityStats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$entityType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Recent actions
    const recentLogs = await AuditLog.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      actionStats,
      entityStats,
      recentLogs,
      total: await AuditLog.countDocuments()
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching audit summary', error: error.message });
  }
});

export default router;
