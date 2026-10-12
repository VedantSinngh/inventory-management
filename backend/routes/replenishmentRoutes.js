import express from 'express';
import rateLimit from 'express-rate-limit';
import ReplenishmentPlan from '../models/ReplenishmentPlan.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import ReplenishmentAgentService from '../services/replenishmentAgentService.js';
import { protect, authorize } from '../middleware/auth.js';
import { runWithOptionalTransaction } from './orderRoutes.js';
import logger from '../services/logger.js';

// In-memory per-user run lock to prevent concurrent /run execution
const activeUserRuns = new Set();

// Express rate limiter for replenishment run endpoint: keyed by req.user.id
const replenishmentRunLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 runs per 15 minutes per user
  keyGenerator: (req) => String(req.user?.id || req.user?._id || 'unknown'),
  message: {
    message: 'Too many replenishment requests from this user. Please try again later.',
    status: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Factory function supporting Dependency Injection for testing
 */
export function createReplenishmentRouter({ agentService = ReplenishmentAgentService } = {}) {
  const router = express.Router();

  // Protect all replenishment routes: strictly ADMIN and MANAGER only. STAFF gets 403.
  router.use(protect);
  router.use(authorize('ADMIN', 'MANAGER'));

  /**
   * Helper to emit Socket.io updates to dashboard room
   */
  const emitPlanUpdated = (req, plan, action) => {
    try {
      const io = req.app?.get('io') || global.io;
      if (io) {
        io.to('dashboard').emit('replenishment:plan-updated', {
          planId: plan._id,
          status: plan.status,
          action,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      logger.warn('Failed to emit replenishment socket event', { error: err.message });
    }
  };

  /**
   * Helper to update aggregate plan status based on item statuses
   */
  const recalculatePlanStatus = (plan) => {
    const total = plan.items.length;
    if (total === 0) return 'PENDING_APPROVAL';

    const approved = plan.items.filter(i => i.status === 'APPROVED').length;
    const rejected = plan.items.filter(i => i.status === 'REJECTED').length;
    const pending = plan.items.filter(i => i.status === 'PENDING').length;

    if (pending === 0) {
      if (approved === total) return 'APPROVED';
      if (rejected === total) return 'REJECTED';
      return approved > 0 ? 'PARTIALLY_APPROVED' : 'REJECTED';
    }

    if (approved > 0 || rejected > 0) {
      return 'PARTIALLY_APPROVED';
    }

    return 'PENDING_APPROVAL';
  };

  /**
   * POST /api/replenishment/run
   * Runs the replenishment agent, persists a plan with PENDING_APPROVAL status.
   */
  router.post('/run', replenishmentRunLimiter, async (req, res) => {
    const userId = String(req.user.id || req.user._id);

    // Concurrency lock check
    if (activeUserRuns.has(userId)) {
      return res.status(429).json({
        message: 'A replenishment analysis is already in progress for this user. Please wait for it to complete.',
        status: 429
      });
    }

    activeUserRuns.add(userId);

    try {
      const maxProducts = parseInt(req.body.maxProducts || process.env.REPLENISHMENT_MAX_PRODUCTS || '10', 10);

      // Execute agent pipeline (persists ReplenishmentPlan to DB)
      const plan = await agentService.runPlan({
        userId,
        maxProducts
      });

      // Safe logging only: no sensitive fields
      logger.info('Replenishment plan generated', {
        planId: plan._id?.toString(),
        userId,
        toolCallsCount: plan.metrics?.toolCallsCount || 0,
        executionTimeMs: plan.metrics?.executionTimeMs || 0,
        totalTokens: plan.metrics?.totalTokens || 0
      });

      emitPlanUpdated(req, plan, 'PLAN_CREATED');

      return res.status(201).json(plan);
    } catch (error) {
      logger.error('Error generating replenishment plan', {
        userId,
        error: error.message
      });

      return res.status(500).json({
        message: 'Failed to generate replenishment plan',
        error: error.message,
        status: 500
      });
    } finally {
      activeUserRuns.delete(userId);
    }
  });

  /**
   * GET /api/replenishment/plans
   * Fetch paginated replenishment plans
   */
  router.get('/plans', async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '10', 10)));
      const status = req.query.status;

      const filter = {};
      if (status) {
        filter.status = status;
      }

      const total = await ReplenishmentPlan.countDocuments(filter);
      const plans = await ReplenishmentPlan.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name email role')
        .lean();

      return res.json({
        data: plans,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('Error fetching replenishment plans', { error: error.message });
      return res.status(500).json({
        message: 'Failed to retrieve replenishment plans',
        error: error.message,
        status: 500
      });
    }
  });

  /**
   * GET /api/replenishment/plans/:id
   * Fetch single replenishment plan by ID
   */
  router.get('/plans/:id', async (req, res) => {
    try {
      const plan = await ReplenishmentPlan.findById(req.params.id)
        .populate('createdBy', 'name email role')
        .populate('items.product', 'sku name stock lowStockThreshold price cost supplier')
        .populate('items.reviewedBy', 'name email');

      if (!plan) {
        return res.status(404).json({ message: 'Replenishment plan not found', status: 404 });
      }

      return res.json(plan);
    } catch (error) {
      logger.error('Error fetching replenishment plan', { error: error.message, id: req.params.id });
      return res.status(500).json({
        message: 'Failed to retrieve replenishment plan',
        error: error.message,
        status: 500
      });
    }
  });

  /**
   * PATCH /api/replenishment/plans/:id/items/:itemId
   * Edit item suggested/approved quantity only. Re-clamps with computeMaxQuantity.
   */
  router.patch('/plans/:id/items/:itemId', async (req, res) => {
    try {
      const rawQty = req.body.quantity !== undefined ? req.body.quantity : req.body.approvedQuantity;
      const newQuantity = Number(rawQty);

      if (!Number.isInteger(newQuantity) || newQuantity <= 0) {
        return res.status(400).json({
          message: 'Quantity must be a positive integer greater than 0',
          status: 400
        });
      }

      const plan = await ReplenishmentPlan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: 'Replenishment plan not found', status: 404 });
      }

      const item = plan.items.id(req.params.itemId);
      if (!item) {
        return res.status(404).json({ message: 'Replenishment item not found in plan', status: 404 });
      }

      if (item.status !== 'PENDING') {
        return res.status(409).json({
          message: `Cannot edit item quantity; item is already ${item.status}`,
          status: 409
        });
      }

      // Re-validate against product in DB
      const product = await Product.findOne({ _id: item.product, deletedAt: null }).lean();
      if (!product) {
        return res.status(400).json({
          message: 'Product not found or has been soft-deleted',
          status: 400
        });
      }

      // Clamp against stored maxAllowed on the plan item (does not re-evaluate computeMaxQuantity)
      const maxAllowed = item.maxAllowed != null ? item.maxAllowed : null;
      let finalQty = newQuantity;
      let isClamped = false;
      let originalQuantity = null;

      if (maxAllowed !== null && newQuantity > maxAllowed) {
        isClamped = true;
        originalQuantity = newQuantity;
        finalQty = maxAllowed;
      }

      item.suggestedQuantity = finalQty;
      item.approvedQuantity = finalQty;
      item.clamped = isClamped;
      item.originalQuantity = originalQuantity;

      await plan.save();

      emitPlanUpdated(req, plan, 'ITEM_QUANTITY_UPDATED');

      return res.json({
        message: isClamped
          ? `Quantity exceeded calculated maximum bound (${maxAllowed}) and was clamped.`
          : 'Item quantity updated successfully',
        clamped: isClamped,
        item,
        plan
      });
    } catch (error) {
      logger.error('Error updating replenishment item quantity', { error: error.message });
      return res.status(500).json({
        message: 'Failed to update item quantity',
        error: error.message,
        status: 500
      });
    }
  });

  /**
   * POST /api/replenishment/plans/:id/items/:itemId/approve
   * Approves an item, creates a PENDING PURCHASE Order. Does NOT touch product stock.
   */
  router.post('/plans/:id/items/:itemId/approve', async (req, res) => {
    try {
      const plan = await ReplenishmentPlan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: 'Replenishment plan not found', status: 404 });
      }

      const item = plan.items.id(req.params.itemId);
      if (!item) {
        return res.status(404).json({ message: 'Replenishment item not found in plan', status: 404 });
      }

      // Idempotency: cannot approve already finalized item
      if (item.status === 'APPROVED' || item.status === 'REJECTED') {
        return res.status(409).json({
          message: `Item has already been ${item.status.toLowerCase()}`,
          status: 409
        });
      }

      // Re-validate against product in DB at approval time
      const product = await Product.findOne({ _id: item.product, deletedAt: null });
      if (!product) {
        return res.status(400).json({
          message: 'Product not found or has been soft-deleted',
          status: 400
        });
      }

      const qty = Number(item.approvedQuantity || item.suggestedQuantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({
          message: 'Invalid approved quantity for order creation',
          status: 400
        });
      }

      const unitPrice = Number(product.cost || product.price || 0);
      const totalAmount = qty * unitPrice;
      const currentUserId = req.user.id || req.user._id;

      // Execute order creation and audit logging in transaction
      const { createdOrder, updatedPlan } = await runWithOptionalTransaction(async (session) => {
        // 1. Create Purchase Order (status: PENDING, stock remains untouched)
        const orderDoc = new Order({
          type: 'PURCHASE',
          status: 'PENDING',
          items: [
            {
              product: product._id,
              quantity: qty,
              priceAtTime: unitPrice
            }
          ],
          totalAmount,
          createdBy: currentUserId,
          notes: `Replenishment order for ${product.name} (Plan ${plan._id})`
        });

        if (session) {
          await orderDoc.save({ session });
        } else {
          await orderDoc.save();
        }

        // 2. Create AuditLog entry in same transaction
        const auditLogDoc = new AuditLog({
          action: 'CREATE',
          entityType: 'Order',
          entityId: orderDoc._id,
          user: currentUserId,
          details: {
            action: 'REPLENISHMENT_ORDER_CREATED',
            planId: plan._id,
            itemId: item._id,
            sku: product.sku,
            quantity: qty,
            totalAmount
          }
        });

        if (session) {
          await auditLogDoc.save({ session });
        } else {
          await auditLogDoc.save();
        }

        // 3. Update Item & Plan state
        item.status = 'APPROVED';
        item.orderId = orderDoc._id;
        item.approvedQuantity = qty;
        item.reviewedBy = currentUserId;
        item.reviewedAt = new Date();

        plan.status = recalculatePlanStatus(plan);

        if (session) {
          await plan.save({ session });
        } else {
          await plan.save();
        }

        return { createdOrder: orderDoc, updatedPlan: plan };
      });

      emitPlanUpdated(req, updatedPlan, 'ITEM_APPROVED');

      return res.json({
        message: 'Replenishment item approved and purchase order created',
        order: createdOrder,
        plan: updatedPlan
      });
    } catch (error) {
      logger.error('Error approving replenishment item', { error: error.message });
      return res.status(500).json({
        message: 'Failed to approve replenishment item',
        error: error.message,
        status: 500
      });
    }
  });

  /**
   * POST /api/replenishment/plans/:id/items/:itemId/reject
   * Rejects an item in the plan
   */
  router.post('/plans/:id/items/:itemId/reject', async (req, res) => {
    try {
      const plan = await ReplenishmentPlan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: 'Replenishment plan not found', status: 404 });
      }

      const item = plan.items.id(req.params.itemId);
      if (!item) {
        return res.status(404).json({ message: 'Replenishment item not found in plan', status: 404 });
      }

      if (item.status === 'APPROVED' || item.status === 'REJECTED') {
        return res.status(409).json({
          message: `Item has already been ${item.status.toLowerCase()}`,
          status: 409
        });
      }

      item.status = 'REJECTED';
      item.reviewedBy = req.user.id || req.user._id;
      item.reviewedAt = new Date();
      if (req.body.notes) {
        item.notes = String(req.body.notes);
      }

      plan.status = recalculatePlanStatus(plan);
      await plan.save();

      emitPlanUpdated(req, plan, 'ITEM_REJECTED');

      return res.json({
        message: 'Replenishment item rejected',
        item,
        plan
      });
    } catch (error) {
      logger.error('Error rejecting replenishment item', { error: error.message });
      return res.status(500).json({
        message: 'Failed to reject replenishment item',
        error: error.message,
        status: 500
      });
    }
  });

  /**
   * POST /api/replenishment/plans/:id/approve-all
   * Approves all remaining PENDING items in the plan
   */
  router.post('/plans/:id/approve-all', async (req, res) => {
    try {
      const plan = await ReplenishmentPlan.findById(req.params.id);
      if (!plan) {
        return res.status(404).json({ message: 'Replenishment plan not found', status: 404 });
      }

      const pendingItems = plan.items.filter(i => i.status === 'PENDING');
      if (pendingItems.length === 0) {
        return res.status(409).json({
          message: 'No pending items left to approve in this plan',
          status: 409
        });
      }

      const currentUserId = req.user.id || req.user._id;
      const createdOrders = [];

      await runWithOptionalTransaction(async (session) => {
        for (const item of pendingItems) {
          const product = session
            ? await Product.findOne({ _id: item.product, deletedAt: null }).session(session)
            : await Product.findOne({ _id: item.product, deletedAt: null });
          if (!product) {
            throw new Error(`Product ${item.sku} not found or soft-deleted`);
          }

          const qty = Number(item.approvedQuantity || item.suggestedQuantity);
          const unitPrice = Number(product.cost || product.price || 0);
          const totalAmount = qty * unitPrice;

          // 1. Create Purchase Order (status: PENDING, stock remains untouched)
          const orderDoc = new Order({
            type: 'PURCHASE',
            status: 'PENDING',
            items: [
              {
                product: product._id,
                quantity: qty,
                priceAtTime: unitPrice
              }
            ],
            totalAmount,
            createdBy: currentUserId,
            notes: `Auto-approved replenishment order for ${product.name} (Plan ${plan._id})`
          });

          if (session) {
            await orderDoc.save({ session });
          } else {
            await orderDoc.save();
          }

          // 2. Create AuditLog entry in same transaction
          const auditLogDoc = new AuditLog({
            action: 'CREATE',
            entityType: 'Order',
            entityId: orderDoc._id,
            user: currentUserId,
            details: {
              action: 'REPLENISHMENT_ORDER_CREATED',
              planId: plan._id,
              itemId: item._id,
              sku: product.sku,
              quantity: qty,
              totalAmount
            }
          });

          if (session) {
            await auditLogDoc.save({ session });
          } else {
            await auditLogDoc.save();
          }

          // 3. Mark item approved
          item.status = 'APPROVED';
          item.orderId = orderDoc._id;
          item.approvedQuantity = qty;
          item.reviewedBy = currentUserId;
          item.reviewedAt = new Date();

          createdOrders.push(orderDoc);
        }

        plan.status = recalculatePlanStatus(plan);

        if (session) {
          await plan.save({ session });
        } else {
          await plan.save();
        }
      });

      emitPlanUpdated(req, plan, 'ALL_ITEMS_APPROVED');

      return res.json({
        message: `Successfully approved all ${createdOrders.length} pending items`,
        ordersCount: createdOrders.length,
        orders: createdOrders,
        plan
      });
    } catch (error) {
      logger.error('Error approving all replenishment items', { error: error.message });
      return res.status(500).json({
        message: 'Failed to approve all replenishment items',
        error: error.message,
        status: 500
      });
    }
  });

  return router;
}

// Default export uses production ReplenishmentAgentService
export default createReplenishmentRouter();
