import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Supplier from '../models/Supplier.js';
import AuditLog from '../models/AuditLog.js';
import { PriorityReorderQueueService } from './priorityReorderQueueService.js';
import forecastingService from './forecastingService.js';
import anomalyDetectionService from './anomalyDetectionService.js';
import batchTrackingService from './batchTrackingService.js';
import logger from './logger.js';

/**
 * STRICTLY READ-ONLY replenishment tool implementations.
 * NONE of these functions write to the database (no Forecast docs, Alerts, or AuditLog entries created).
 */

/**
 * computeMaxQuantity(product, forecast)
 * Formula rationale:
 * Adaptive ceiling calculated as 60 days of projected demand (2 months of inventory)
 * plus 3x lowStockThreshold to absorb lead time spikes and batch variance.
 * Floor of 20 units protects minimum order sizes; capped at 1,000 units.
 */
export function computeMaxQuantity(product = {}, forecast = {}) {
  const threshold = Math.max(1, Number(product.lowStockThreshold) || 10);
  const velocity = Math.max(0, Number(product.salesVelocity) || 0);
  const monthlyDemand = Number(forecast?.predictedMonthlyDemand) || (velocity > 0 ? velocity * 30 : threshold);

  // 60-day demand estimate
  const demand60Days = Math.ceil((monthlyDemand / 30) * 60);

  // Dynamic upper bound: 60-day demand + 3x lowStockThreshold
  const calculatedCeiling = demand60Days + (threshold * 3);

  return Math.min(1000, Math.max(20, calculatedCeiling));
}

export const replenishmentTools = {
  /**
   * 1. Get Top Urgent Items from Min-Heap Priority Reorder Queue
   */
  async getReorderQueue(args = {}) {
    const maxAllowed = parseInt(process.env.REPLENISHMENT_MAX_PRODUCTS || '10', 10);
    const limit = Math.min(Math.max(1, parseInt(args.limit || maxAllowed, 10)), 25);

    // Fetch products needing reordering (stock <= 2x threshold, active)
    // Uses $expr so $multiply operator works correctly inside find()
    const products = await Product.find({
      deletedAt: null,
      $expr: { $lte: ['$stock', { $multiply: ['$lowStockThreshold', 2] }] }
    })
      .populate('supplier', 'name leadTime rating code minimumOrderQuantity')
      .populate('warehouse', 'name location')
      .lean();

    // 30-day historical demand map
    const historicalDemandMap = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await Order.find({
      type: 'SALES',
      status: 'COMPLETED',
      createdAt: { $gte: thirtyDaysAgo }
    }).lean();

    for (const order of orders) {
      if (!Array.isArray(order.items)) continue;
      for (const item of order.items) {
        if (!item.product) continue;
        const productId = item.product.toString();
        if (!historicalDemandMap[productId]) {
          historicalDemandMap[productId] = [];
        }
        historicalDemandMap[productId].push(item.quantity);
      }
    }

    const priorityQueue = PriorityReorderQueueService.buildPriorityQueue(products, historicalDemandMap);
    const urgentItems = PriorityReorderQueueService.getTopUrgentItems(priorityQueue, limit);

    // Compact token-saving payload
    return urgentItems.map(item => ({
      productId: item.productId?.toString(),
      sku: item.sku,
      name: item.name,
      currentStock: item.currentStock,
      lowStockThreshold: item.lowStockThreshold,
      reorderQuantity: item.reorderQuantity,
      priorityScore: item.priority,
      daysToStockout: item.urgencyMetrics?.daysToStockout ?? null,
      demandVelocity: item.urgencyMetrics?.demandVelocity ?? null,
      leadTime: item.urgencyMetrics?.leadTime ?? 7,
      supplier: item.supplier ? {
        id: item.supplier._id?.toString(),
        name: item.supplier.name,
        leadTime: item.supplier.leadTime,
        moq: item.supplier.minimumOrderQuantity || 1
      } : null
    }));
  },

  /**
   * 2. Compute Demand Forecast (READ-ONLY: does not save Forecast document)
   */
  async getProductForecast(args = {}) {
    let product;
    if (args.productId) {
      product = await Product.findOne({ _id: args.productId, deletedAt: null }).lean();
    } else if (args.sku) {
      product = await Product.findOne({ sku: args.sku, deletedAt: null }).lean();
    }

    if (!product) {
      return { error: 'Product not found or soft-deleted' };
    }

    const historicalData = await forecastingService.getHistoricalSalesData(product._id, 12);

    if (historicalData.length >= 3) {
      const forecastResult = forecastingService.exponentialSmoothing(historicalData, 3, 0.3);
      const recommendations = forecastingService.generateRecommendations(forecastResult, historicalData);

      return {
        sku: product.sku,
        currentStock: product.stock,
        predictedMonthlyDemand: forecastResult.predictedDemand,
        recommendedSafetyStock: recommendations.safetyStock,
        recommendedReorderPoint: recommendations.reorderPoint,
        suggestedReorderQuantity: recommendations.reorderQuantity
      };
    }

    // Fallback calculation for low/empty history
    const velocity = product.salesVelocity || 0;
    const estimatedDailyDemand = velocity > 0 ? velocity : Math.max(0.2, (product.lowStockThreshold || 10) / 30);
    const predictedMonthlyDemand = Math.ceil(estimatedDailyDemand * 30);
    const safetyStock = Math.ceil(predictedMonthlyDemand * 0.25);
    const reorderPoint = Math.ceil(predictedMonthlyDemand * 0.5);

    const suggestedReorderQuantity = product.reorderQuantity || (
      velocity > 0 ? Math.ceil(predictedMonthlyDemand * 1.5) : Math.min(Math.max((product.lowStockThreshold || 10) * 2, 5), 30)
    );

    return {
      sku: product.sku,
      currentStock: product.stock,
      predictedMonthlyDemand,
      recommendedSafetyStock: safetyStock,
      recommendedReorderPoint: reorderPoint,
      suggestedReorderQuantity
    };
  },

  /**
   * 3. Analyze Product Movement Anomalies (READ-ONLY: does not create Alert documents)
   */
  async getProductAnomalies(args = {}) {
    let product;
    if (args.productId) {
      product = await Product.findOne({ _id: args.productId, deletedAt: null });
    } else if (args.sku) {
      product = await Product.findOne({ sku: args.sku, deletedAt: null });
    }

    if (!product) {
      return { error: 'Product not found or soft-deleted' };
    }

    const anomalies = await anomalyDetectionService.analyzeProductAnomalies(product, 72, 'MEDIUM');

    return {
      sku: product.sku,
      anomalyCount: anomalies.length,
      anomalies: anomalies.slice(0, 2).map(a => ({
        type: a.type,
        severity: a.severity,
        title: a.title
      }))
    };
  },

  /**
   * 4. Check Expiring Batches / Rotation Recommendations (READ-ONLY: no alerts created)
   */
  async getExpiringBatches(args = {}) {
    let product;
    if (args.productId) {
      product = await Product.findOne({ _id: args.productId, deletedAt: null }).lean();
    } else if (args.sku) {
      product = await Product.findOne({ sku: args.sku, deletedAt: null }).lean();
    }

    if (!product) {
      return { error: 'Product not found or soft-deleted' };
    }

    const recommendations = await batchTrackingService.getRotationRecommendations(product._id);

    return {
      sku: product.sku,
      activeBatchesCount: recommendations.length,
      hasExpiringStockSoon: recommendations.some(r => r.daysUntilExpiry <= 30),
      batches: recommendations.slice(0, 2).map(b => ({
        batchNumber: b.batchNumber,
        daysUntilExpiry: b.daysUntilExpiry,
        quantityAvailable: b.quantityAvailable,
        priority: b.priority
      }))
    };
  },

  /**
   * 5. Check Dead Stock (READ-ONLY: does not create Alert documents)
   */
  async getDeadStock(args = {}) {
    const noMovementDays = Math.max(30, parseInt(args.noMovementDays || '90', 10));
    const cutoffDate = new Date(Date.now() - noMovementDays * 24 * 60 * 60 * 1000);

    const activeProducts = await Product.find({
      deletedAt: null,
      stock: { $gt: 0 }
    }).select('sku stock').lean();

    const deadStockSkus = [];

    for (const product of activeProducts) {
      const lastMovement = await AuditLog.findOne({
        entityType: 'Product',
        entityId: product._id,
        action: { $in: ['STOCK_IN', 'STOCK_OUT', 'TRANSFER'] }
      }).sort({ createdAt: -1 }).select('createdAt').lean();

      if (!lastMovement || lastMovement.createdAt < cutoffDate) {
        deadStockSkus.push(product.sku);
      }
    }

    return {
      deadStockCount: deadStockSkus.length,
      deadStockSkus: deadStockSkus.slice(0, 15)
    };
  },

  /**
   * 6. Query Supplier Info (READ-ONLY: strictly non-sensitive fields only)
   */
  async getSupplierInfo(args = {}) {
    let supplier = null;

    if (args.supplierId) {
      supplier = await Supplier.findOne({ _id: args.supplierId, deletedAt: null }).lean();
    } else if (args.sku) {
      const product = await Product.findOne({ sku: args.sku, deletedAt: null })
        .populate('supplier')
        .lean();
      supplier = product?.supplier;
    }

    if (!supplier) {
      return { found: false, message: 'Supplier not found' };
    }

    return {
      found: true,
      supplierId: supplier._id.toString(),
      name: supplier.name,
      leadTimeDays: supplier.leadTime || 7,
      minimumOrderQuantity: supplier.minimumOrderQuantity || 1
    };
  }
};

/**
 * Tool schemas formatted for Groq / OpenAI Tool Calling
 */
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'getReorderQueue',
      description: 'Fetch urgent products needing replenishment based on Min-Heap priority queue.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Max items to fetch (default: 5)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProductForecast',
      description: 'Compute demand forecast and recommended safety stock for a specific SKU.',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU' }
        },
        required: ['sku']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getProductAnomalies',
      description: 'Check recent stock movement anomalies (Z-score spike) for a product.',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU' }
        },
        required: ['sku']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getExpiringBatches',
      description: 'Check active inventory batches and upcoming expiries for a product.',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string', description: 'Product SKU' }
        },
        required: ['sku']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getDeadStock',
      description: 'Check list of obsolete SKUs with 90+ days of inactivity.',
      parameters: {
        type: 'object',
        properties: {
          noMovementDays: { type: 'integer' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getSupplierInfo',
      description: 'Retrieve supplier lead time and minimum order quantity.',
      parameters: {
        type: 'object',
        properties: {
          sku: { type: 'string' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'submit_plan',
      description: 'Submit the final structured replenishment plan.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sku: { type: 'string' },
                suggestedQuantity: { type: 'integer' },
                supplier: { type: 'string' },
                urgency: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                reason: { type: 'string' },
                evidenceRefs: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tool: { type: 'string' },
                      metric: { type: 'string' },
                      value: {}
                    }
                  }
                }
              },
              required: ['sku', 'suggestedQuantity', 'reason']
            }
          },
          purchaseOrderSummary: { type: 'string' },
          supplierEmailDrafts: { type: 'array' }
        },
        required: ['items']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'json',
      description: 'Submit the final structured replenishment plan in JSON format.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sku: { type: 'string' },
                suggestedQuantity: { type: 'integer' },
                supplier: { type: 'string' },
                urgency: { type: 'string', enum: ['HIGH', 'MEDIUM', 'LOW'] },
                reason: { type: 'string' },
                evidenceRefs: { type: 'array' }
              },
              required: ['sku', 'suggestedQuantity', 'reason']
            }
          },
          purchaseOrderSummary: { type: 'string' },
          supplierEmailDrafts: { type: 'array' }
        },
        required: ['items']
      }
    }
  }
];

/**
 * Tool dispatcher
 */
export async function executeTool(name, args = {}) {
  // Support aliases
  if (name === 'submit_plan' || name === 'json') {
    return { status: 'PLAN_SUBMITTED', plan: args };
  }

  const toolFn = replenishmentTools[name];
  if (!toolFn) {
    logger.warn(`Unknown tool requested by replenishment agent: ${name}`);
    return { error: `Tool '${name}' does not exist` };
  }

  try {
    const result = await toolFn(args);
    return result;
  } catch (err) {
    logger.error(`Error executing replenishment tool ${name}:`, { error: err.message });
    return { error: `Tool execution failed: ${err.message}` };
  }
}
