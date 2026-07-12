import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { PriorityReorderQueueService } from '../services/priorityReorderQueueService.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * GET /api/reorders/priority
 * Get prioritized reorder queue using Min-Heap
 * Ranked by urgency: days to stockout, demand, lead time
 */
router.get('/priority', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    // Fetch all active products low on stock
    const products = await Product.find({
      deletedAt: null,
      stock: { $lte: { $multiply: ['$lowStockThreshold', 2] } } // At or below 2x threshold
    })
      .populate('supplier', 'name leadTime rating')
      .populate('warehouse', 'name location')
      .lean();

    // Build historical demand map (last 30 days)
    const historicalDemandMap = {};

    const orders = await Order.find({
      type: 'SALES',
      status: 'COMPLETED',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).lean();

    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.product.toString();
        if (!historicalDemandMap[productId]) {
          historicalDemandMap[productId] = [];
        }
        historicalDemandMap[productId].push(item.quantity);
      }
    }

    // Build priority queue
    const priorityQueue = PriorityReorderQueueService.buildPriorityQueue(products, historicalDemandMap);

    // Get paginated results
    const result = PriorityReorderQueueService.getPaginatedUrgentItems(priorityQueue, parseInt(page), parseInt(limit));

    logger.info('Priority reorder queue fetched', {
      totalItems: result.pagination.total,
      userId: req.user.id
    });

    res.json({
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Priority reorder queue error', { error: error.message });
    res.status(500).json({
      message: 'Error fetching priority reorder queue',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/reorders/priority/summary
 * Get summary of reorder urgency (CRITICAL, HIGH, MEDIUM)
 */
router.get('/priority/summary', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const products = await Product.find({
      deletedAt: null,
      stock: { $lte: { $multiply: ['$lowStockThreshold', 2] } }
    })
      .populate('supplier', 'name leadTime rating')
      .lean();

    // Build historical demand
    const historicalDemandMap = {};
    const orders = await Order.find({
      type: 'SALES',
      status: 'COMPLETED',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).lean();

    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.product.toString();
        if (!historicalDemandMap[productId]) {
          historicalDemandMap[productId] = [];
        }
        historicalDemandMap[productId].push(item.quantity);
      }
    }

    const priorityQueue = PriorityReorderQueueService.buildPriorityQueue(products, historicalDemandMap);
    const summary = PriorityReorderQueueService.getSummary(priorityQueue);

    res.json({
      data: summary,
      pagination: null
    });
  } catch (error) {
    logger.error('Reorder summary error', { error: error.message });
    res.status(500).json({
      message: 'Error fetching reorder summary',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/reorders/priority/product/:productId
 * Get urgency score for a specific product
 */
router.get('/priority/product/:productId', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate('supplier', 'name leadTime rating')
      .lean();

    if (!product || product.deletedAt) {
      return res.status(404).json({
        message: 'Product not found',
        status: 404
      });
    }

    // Get historical demand for this product
    const orders = await Order.find({
      'items.product': req.params.productId,
      type: 'SALES',
      status: 'COMPLETED',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).lean();

    const historicalDemand = [];
    for (const order of orders) {
      for (const item of order.items) {
        if (item.product.toString() === req.params.productId) {
          historicalDemand.push(item.quantity);
        }
      }
    }

    const urgencyMetrics = PriorityReorderQueueService.calculateUrgencyScore(product, historicalDemand);

    res.json({
      data: {
        productId: product._id,
        sku: product.sku,
        name: product.name,
        currentStock: product.stock,
        lowStockThreshold: product.lowStockThreshold,
        ...urgencyMetrics
      },
      pagination: null
    });
  } catch (error) {
    logger.error('Product urgency score error', { error: error.message });
    res.status(500).json({
      message: 'Error calculating urgency score',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/reorders/priority/auto-order
 * Auto-create purchase orders for all CRITICAL items
 * (Admin only - safety feature)
 */
router.post('/priority/auto-order', protect, authorize('ADMIN'), async (req, res) => {
  try {
    const products = await Product.find({
      deletedAt: null,
      autoReorder: true,
      stock: { $lte: { $multiply: ['$lowStockThreshold', 1.5] } } // Only CRITICAL
    })
      .populate('supplier', 'name _id minimumOrderQuantity')
      .lean();

    const createdOrders = [];

    for (const product of products) {
      if (!product.supplier) continue;

      const reorderQuantity = product.reorderQuantity || (product.lowStockThreshold * 3);

      const order = new (await import('../models/Order.js')).default({
        type: 'PURCHASE',
        status: 'PENDING',
        items: [
          {
            product: product._id,
            quantity: reorderQuantity,
            priceAtTime: product.cost || product.price
          }
        ],
        totalAmount: reorderQuantity * (product.cost || product.price),
        createdBy: req.user.id,
        notes: `Auto-generated priority reorder for ${product.name}`
      });

      await order.save();
      createdOrders.push(order);
    }

    logger.info('Auto-orders created', {
      count: createdOrders.length,
      userId: req.user.id
    });

    res.status(201).json({
      data: createdOrders,
      pagination: {
        total: createdOrders.length
      }
    });
  } catch (error) {
    logger.error('Auto-order error', { error: error.message });
    res.status(500).json({
      message: 'Error creating auto-orders',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/reorders/analytics
 * Analytics on reorder performance
 */
router.get('/analytics', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    // Products that had low stock in past
    const lowStockHistory = await Product.find({
      deletedAt: null
    })
      .select('sku name stock lowStockThreshold salesVelocity')
      .lean();

    const analytics = {
      totalProducts: lowStockHistory.length,
      productsNeedingReorder: lowStockHistory.filter(p => p.stock <= (p.lowStockThreshold * 1.5)).length,
      averageTurnover: lowStockHistory.reduce((sum, p) => sum + (p.salesVelocity || 0), 0) / lowStockHistory.length,
      stockoutRiskProducts: lowStockHistory.filter(p => p.stock === 0).length
    };

    res.json({
      data: analytics,
      pagination: null
    });
  } catch (error) {
    logger.error('Reorder analytics error', { error: error.message });
    res.status(500).json({
      message: 'Error fetching reorder analytics',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/reorders/predictive
 * Calculate statistical ROP and safety stock for each product
 */
router.get('/predictive', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const products = await Product.find({ deletedAt: null }).populate('supplier').lean();
    const suggestions = [];

    // Calculate ROP for each product based on historical demand
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const orders = await Order.find({
      type: 'SALES',
      status: 'COMPLETED',
      createdAt: { $gte: ninetyDaysAgo }
    }).lean();

    const historicalDemandMap = {};
    for (const order of orders) {
      for (const item of order.items) {
        const pId = item.product.toString();
        const dateStr = new Date(order.createdAt).toDateString();
        if (!historicalDemandMap[pId]) historicalDemandMap[pId] = {};
        if (!historicalDemandMap[pId][dateStr]) historicalDemandMap[pId][dateStr] = 0;
        historicalDemandMap[pId][dateStr] += item.quantity;
      }
    }

    const simpleStats = (await import('simple-statistics')).default;

    for (const product of products) {
      const dailySales = [];
      const demandData = historicalDemandMap[product._id.toString()] || {};
      
      // Build 90-day time series of daily sales
      for (let i = 0; i < 90; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dailySales.push(demandData[d.toDateString()] || 0);
      }

      const avgDailyDemand = simpleStats.mean(dailySales);
      const stdDevDemand = simpleStats.standardDeviation(dailySales);

      const L = product.avgLeadTimeDays || (product.supplier?.leadTime || 14);
      const sigmaL = product.leadTimeStdDev || 2.1;
      const Z = 1.65; // 95% service level factor

      // Safety Stock = Z * sqrt( L * (stdDevDemand^2) + (avgDailyDemand^2) * (sigmaL^2) )
      const demandComponent = L * Math.pow(stdDevDemand, 2);
      const leadTimeComponent = Math.pow(avgDailyDemand, 2) * Math.pow(sigmaL, 2);
      const safetyStock = Z * Math.sqrt(demandComponent + leadTimeComponent);
      const reorderPoint = (avgDailyDemand * L) + safetyStock;

      const isBelowReorder = product.stock <= reorderPoint;

      suggestions.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        avgDailyDemand: parseFloat(avgDailyDemand.toFixed(2)),
        safetyStock: Math.ceil(safetyStock),
        reorderPoint: Math.ceil(reorderPoint),
        suggestedQuantity: product.reorderQuantity || Math.ceil(avgDailyDemand * 30),
        isBelowReorder,
        supplierName: product.supplier?.name || 'Unknown'
      });
    }

    res.json({
      data: suggestions,
      pagination: null
    });
  } catch (error) {
    logger.error('Predictive reorder error', { error: error.message });
    res.status(500).json({
      message: 'Error computing predictive reorders',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/reorders/purchase-orders
 * Bulk generate approved purchase orders for specified reorder recommendations
 */
router.post('/purchase-orders', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { items } = req.body; // Array of { productId, quantity, supplierId }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    const createdOrders = [];

    // Group items by supplier to create one PO per supplier
    const supplierGroupMap = {};
    for (const item of items) {
      const productObj = await Product.findById(item.productId);
      if (!productObj) continue;
      
      const supplierId = productObj.supplier?.toString() || 'unknown';
      if (!supplierGroupMap[supplierId]) {
        supplierGroupMap[supplierId] = [];
      }
      supplierGroupMap[supplierId].push({
        product: productObj._id,
        quantity: item.quantity,
        priceAtTime: productObj.cost || productObj.price
      });
    }

    for (const supplierId of Object.keys(supplierGroupMap)) {
      const orderItems = supplierGroupMap[supplierId];
      const totalAmount = orderItems.reduce((acc, curr) => acc + (curr.quantity * curr.priceAtTime), 0);

      const order = new (await import('../models/Order.js')).default({
        type: 'PURCHASE',
        status: 'PENDING',
        items: orderItems,
        totalAmount,
        createdBy: req.user.id,
        notes: `Predictive reorder generated PO for supplier: ${supplierId}`
      });

      await order.save();
      createdOrders.push(order);
    }

    logger.info('Predictive reorder POs created', { count: createdOrders.length });
    res.status(201).json({
      message: 'Purchase orders successfully generated',
      data: createdOrders
    });
  } catch (error) {
    logger.error('PO generation error', { error: error.message });
    res.status(500).json({
      message: 'Error generating purchase orders',
      error: error.message,
      status: 500
    });
  }
});

export default router;
