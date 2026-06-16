import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * GET /api/inventory/dead-stock
 * Detect items with zero movement > 90 days and calculate liquidation options
 */
router.get('/dead-stock', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Get product IDs with sales/stock-out movements in past 90 days
    const activeProductIds = await AuditLog.distinct('entityId', {
      entityType: 'Product',
      action: { $in: ['STOCK_OUT', 'TRANSFER'] },
      createdAt: { $gte: ninetyDaysAgo }
    });

    // Fetch products that are not active, have stock > 0, and not deleted
    const deadStockProducts = await Product.find({
      _id: { $nin: activeProductIds },
      stock: { $gt: 0 },
      deletedAt: null
    }).populate('supplier').lean();

    const data = deadStockProducts.map(product => {
      const costBasis = product.stock * (product.cost || product.price * 0.6);
      
      const suggestions = [
        {
          strategy: 'DISCOUNT_BUNDLE',
          description: 'Mark down price by 40% and bundle with high-velocity items.',
          recoveryRate: 60,
          estimatedRecoveryValue: parseFloat((costBasis * 0.60).toFixed(2))
        },
        {
          strategy: 'SUPPLIER_RETURN',
          description: 'Return to supplier for credit (subject to a standard 15% restocking fee).',
          recoveryRate: 85,
          estimatedRecoveryValue: product.supplier ? parseFloat((costBasis * 0.85).toFixed(2)) : 0
        },
        {
          strategy: 'WRITE_OFF',
          description: 'Write-off stock to deduct from taxable corporate income.',
          recoveryRate: 20,
          estimatedRecoveryValue: parseFloat((costBasis * 0.20).toFixed(2))
        }
      ].sort((a, b) => b.estimatedRecoveryValue - a.estimatedRecoveryValue);

      return {
        product: {
          _id: product._id,
          sku: product.sku,
          name: product.name,
          stock: product.stock,
          cost: product.cost || 0,
          price: product.price
        },
        costBasis: parseFloat(costBasis.toFixed(2)),
        supplierName: product.supplier?.name || 'No Vendor Linked',
        suggestions
      };
    });

    res.json({ data });
  } catch (error) {
    logger.error('Dead stock evaluation error', { error: error.message });
    res.status(500).json({ message: 'Error checking dead stock', error: error.message });
  }
});

export default router;
