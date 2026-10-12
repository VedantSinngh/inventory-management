import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import express from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import ReplenishmentPlan from '../models/ReplenishmentPlan.js';
import { createReplenishmentRouter } from '../routes/replenishmentRoutes.js';
import { computeMaxQuantity } from '../services/replenishmentTools.js';

// Ensure test JWT_SECRET of at least 32 characters is set
process.env.JWT_SECRET = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
  ? process.env.JWT_SECRET
  : 'test-jwt-secret-at-least-32-chars-long-abcdef123456';

import supertest from 'supertest';

/**
 * Test App Factory mounting real router and auth middleware with injectable agent service
 */
function buildTestApp({ agentService } = {}) {
  const app = express();
  app.use(express.json());

  // Socket.io mock capturing emitted events
  const socketEvents = [];
  app.set('io', {
    to: (room) => ({
      emit: (event, payload) => socketEvents.push({ room, event, payload })
    })
  });
  app.socketEvents = socketEvents;

  app.use('/api/replenishment', createReplenishmentRouter({ agentService }));
  return app;
}

test('Replenishment Routes & Approval Flow Integration Tests', async (t) => {
  let mongod;
  let testApp;
  let request;

  let staffUser;
  let managerUser;
  let adminUser;

  let staffToken;
  let managerToken;
  let adminToken;

  let testSupplier;
  let testProduct;

  let emittedEvents = [];

  // Spin up strictly in-memory MongoDB
  mongod = await MongoMemoryServer.create({ instance: { launchTimeout: 30000 } });
  await mongoose.connect(mongod.getUri());

  // Seed test users with real JWTs
  staffUser = await User.create({
    name: 'Staff Member',
    email: 'staff@test.com',
    password: 'Password123!',
    role: 'STAFF'
  });

  managerUser = await User.create({
    name: 'Manager Member',
    email: 'manager@test.com',
    password: 'Password123!',
    role: 'MANAGER'
  });

  adminUser = await User.create({
    name: 'Admin Member',
    email: 'admin@test.com',
    password: 'Password123!',
    role: 'ADMIN'
  });

  staffToken = jwt.sign({ id: staffUser._id }, process.env.JWT_SECRET);
  managerToken = jwt.sign({ id: managerUser._id }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET);

  // Seed fixture supplier and product
  testSupplier = await Supplier.create({
    name: 'Precision Instruments Ltd',
    code: 'SUPP-PI-100',
    contactInfo: { email: 'orders@precision.com' },
    leadTime: 7,
    minimumOrderQuantity: 10
  });

  testProduct = await Product.create({
    sku: 'SKU-VALVE-500',
    name: 'High Pressure Valve 500PSI',
    category: 'Valves',
    stock: 5,
    lowStockThreshold: 15,
    salesVelocity: 2,
    price: 150,
    cost: 95,
    supplier: testSupplier._id
  });

  // Stub Agent Service for testing
  const stubAgentService = {
    runPlan: async ({ userId, maxProducts }) => {
      const planDoc = new ReplenishmentPlan({
        status: 'PENDING_APPROVAL',
        source: 'agent-llm',
        items: [
          {
            product: testProduct._id,
            sku: testProduct.sku,
            productName: testProduct.name,
            currentStock: testProduct.stock,
            suggestedQuantity: 30,
            approvedQuantity: 30,
            maxAllowed: computeMaxQuantity(testProduct, {}),
            clamped: false,
            supplier: testSupplier._id,
            supplierName: testSupplier.name,
            urgency: 'HIGH',
            reason: 'Stock is 5 units, threshold is 15.'
          }
        ],
        purchaseOrderSummary: 'Order 30 units of SKU-VALVE-500',
        metrics: {
          analyzedProductsCount: 1,
          toolCallsCount: 3,
          executionTimeMs: 450,
          totalTokens: 1200,
          modelUsed: 'openai/gpt-oss-120b'
        },
        createdBy: userId
      });
      await planDoc.save();
      return planDoc;
    }
  };

  testApp = buildTestApp({ agentService: stubAgentService });
  emittedEvents = testApp.socketEvents;
  request = supertest(testApp);

  await t.test('Authentication & Role-Based Access Control: no token returns 401', async () => {
    const endpoints = [
      { method: 'post', path: '/api/replenishment/run' },
      { method: 'get', path: '/api/replenishment/plans' },
      { method: 'get', path: '/api/replenishment/plans/dummyid' },
      { method: 'patch', path: '/api/replenishment/plans/dummyid/items/dummyitem' },
      { method: 'post', path: '/api/replenishment/plans/dummyid/items/dummyitem/approve' },
      { method: 'post', path: '/api/replenishment/plans/dummyid/items/dummyitem/reject' },
      { method: 'post', path: '/api/replenishment/plans/dummyid/approve-all' }
    ];

    for (const ep of endpoints) {
      const res = await request[ep.method](ep.path);
      assert.equal(res.status, 401, `Expected 401 for unauthenticated ${ep.method.toUpperCase()} ${ep.path}`);
    }
  });

  await t.test('Role-Based Access Control: STAFF role returns 403 on every endpoint', async () => {
    const endpoints = [
      { method: 'post', path: '/api/replenishment/run' },
      { method: 'get', path: '/api/replenishment/plans' },
      { method: 'get', path: '/api/replenishment/plans/dummyid' },
      { method: 'patch', path: '/api/replenishment/plans/dummyid/items/dummyitem' },
      { method: 'post', path: '/api/replenishment/plans/dummyid/items/dummyitem/approve' },
      { method: 'post', path: '/api/replenishment/plans/dummyid/items/dummyitem/reject' },
      { method: 'post', path: '/api/replenishment/plans/dummyid/approve-all' }
    ];

    for (const ep of endpoints) {
      const res = await request[ep.method](ep.path).set('Authorization', `Bearer ${staffToken}`);
      assert.equal(res.status, 403, `Expected 403 for STAFF on ${ep.method.toUpperCase()} ${ep.path}`);
    }
  });

  let savedPlanId;
  let savedItemId;

  await t.test('MANAGER can generate a replenishment plan (POST /run) and save with PENDING_APPROVAL', async () => {
    const res = await request.post('/api/replenishment/run')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ maxProducts: 5 });

    assert.equal(res.status, 201);
    assert.ok(res.body._id, 'Plan should have an _id');
    assert.equal(res.body.status, 'PENDING_APPROVAL');
    assert.equal(res.body.items.length, 1);
    assert.equal(res.body.items[0].sku, 'SKU-VALVE-500');

    savedPlanId = res.body._id;
    savedItemId = res.body.items[0]._id;

    // Verify Socket.io event was emitted
    const planEvent = emittedEvents.find(e => e.event === 'replenishment:plan-updated');
    assert.ok(planEvent, 'Should emit replenishment:plan-updated to dashboard');
    assert.equal(planEvent.room, 'dashboard');
  });

  await t.test('Concurrent /run by the same user is blocked with 429', async () => {
    // Create an app with an agent runner that pauses to simulate execution
    let unpause;
    const slowAgent = {
      runPlan: async ({ userId }) => {
        await new Promise(r => { unpause = r; });
        return { _id: new mongoose.Types.ObjectId(), status: 'PENDING_APPROVAL', items: [] };
      }
    };
    const slowApp = buildTestApp({ agentService: slowAgent });
    const slowRequest = supertest(slowApp);

    // Start first run (in-flight)
    const run1Promise = slowRequest.post('/api/replenishment/run')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    // Small delay to ensure first run enters router lock
    await new Promise(r => setTimeout(r, 20));

    // Second concurrent run by same manager
    const run2Res = await slowRequest.post('/api/replenishment/run')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    assert.equal(run2Res.status, 429, 'Second concurrent run must return 429');

    // Unpause first run and clean up
    unpause();
    await run1Promise;
  });

  await t.test('ADMIN can fetch plans list (GET /plans) and single plan (GET /plans/:id)', async () => {
    const listRes = await request.get('/api/replenishment/plans')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.data));
    assert.ok(listRes.body.data.length >= 1);

    const getRes = await request.get(`/api/replenishment/plans/${savedPlanId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(getRes.status, 200);
    assert.equal(getRes.body._id, savedPlanId);
  });

  await t.test('PATCH /plans/:id/items/:itemId validates positive integers and clamps excessive quantity', async () => {
    // 1. Non-positive or float rejects with 400
    const invalidRes1 = await request.patch(`/api/replenishment/plans/${savedPlanId}/items/${savedItemId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ quantity: -10 });
    assert.equal(invalidRes1.status, 400);

    const invalidRes2 = await request.patch(`/api/replenishment/plans/${savedPlanId}/items/${savedItemId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ quantity: 12.5 });
    assert.equal(invalidRes2.status, 400);

    // 2. Excessive quantity is clamped via computeMaxQuantity
    const excessiveRes = await request.patch(`/api/replenishment/plans/${savedPlanId}/items/${savedItemId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ quantity: 50000 });

    assert.equal(excessiveRes.status, 200);
    assert.equal(excessiveRes.body.clamped, true);

    const expectedMax = computeMaxQuantity(testProduct, {});
    assert.equal(excessiveRes.body.item.approvedQuantity, expectedMax);
    assert.equal(excessiveRes.body.item.originalQuantity, 50000);

    // Reset back to reasonable quantity 25 for approval test
    const resetRes = await request.patch(`/api/replenishment/plans/${savedPlanId}/items/${savedItemId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ quantity: 25 });
    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.body.clamped, false);
    assert.equal(resetRes.body.item.approvedQuantity, 25);
  });

  await t.test('POST /plans/:id/items/:itemId/approve creates Order and AuditLog, leaves stock unchanged', async () => {
    // Record baseline counts and product stock
    const ordersBefore = await Order.countDocuments();
    const auditLogsBefore = await AuditLog.countDocuments();
    const productBefore = await Product.findById(testProduct._id);
    const initialStock = productBefore.stock; // 5

    const approveRes = await request.post(`/api/replenishment/plans/${savedPlanId}/items/${savedItemId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    assert.equal(approveRes.status, 200);
    assert.ok(approveRes.body.order, 'Approval must return created order');
    assert.equal(approveRes.body.order.type, 'PURCHASE');
    assert.equal(approveRes.body.order.status, 'PENDING');
    assert.equal(approveRes.body.order.items[0].quantity, 25);
    assert.equal(approveRes.body.order.items[0].priceAtTime, testProduct.cost); // 95
    assert.equal(approveRes.body.order.totalAmount, 25 * 95); // 2375

    // Exactly one Order and one AuditLog created
    const ordersAfter = await Order.countDocuments();
    const auditLogsAfter = await AuditLog.countDocuments();
    assert.equal(ordersAfter, ordersBefore + 1, 'Exactly one Order must be created');
    assert.equal(auditLogsAfter, auditLogsBefore + 1, 'Exactly one AuditLog must be created');

    const createdAudit = await AuditLog.findOne({ entityId: approveRes.body.order._id });
    assert.ok(createdAudit, 'Audit log entry must reference the created order');
    assert.equal(createdAudit.action, 'CREATE');
    assert.equal(createdAudit.entityType, 'Order');

    // CRITICAL: Stock remains strictly unchanged
    const productAfter = await Product.findById(testProduct._id);
    assert.equal(
      productAfter.stock,
      initialStock,
      `Product stock must not change on approval! Expected ${initialStock}, got ${productAfter.stock}`
    );

    // Plan item status updated to APPROVED with orderId linked
    const updatedPlan = await ReplenishmentPlan.findById(savedPlanId);
    const approvedItem = updatedPlan.items.id(savedItemId);
    assert.equal(approvedItem.status, 'APPROVED');
    assert.equal(approvedItem.orderId.toString(), approveRes.body.order._id.toString());
  });

  await t.test('Approval idempotency: approving an already approved item returns 409 and creates no second order', async () => {
    const ordersBefore = await Order.countDocuments();

    const secondApproveRes = await request.post(`/api/replenishment/plans/${savedPlanId}/items/${savedItemId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    assert.equal(secondApproveRes.status, 409, 'Approving an already approved item must return 409 Conflict');

    const ordersAfter = await Order.countDocuments();
    assert.equal(ordersAfter, ordersBefore, 'No duplicate order should be created on second approval');
  });

  await t.test('Re-validation: approval of a soft-deleted product is rejected with 400', async () => {
    // Create new plan with a product that gets deleted before approval
    const deletedProduct = await Product.create({
      sku: 'SKU-OBSOLETE-99',
      name: 'Obsolete Relay',
      category: 'Electrical',
      stock: 1,
      lowStockThreshold: 10,
      price: 50,
      cost: 30,
      supplier: testSupplier._id,
      deletedAt: null
    });

    const tempPlan = await ReplenishmentPlan.create({
      status: 'PENDING_APPROVAL',
      source: 'agent-llm',
      items: [
        {
          product: deletedProduct._id,
          sku: deletedProduct.sku,
          productName: deletedProduct.name,
          currentStock: 1,
          suggestedQuantity: 15,
          approvedQuantity: 15,
          maxAllowed: computeMaxQuantity(deletedProduct, {}),
          supplier: testSupplier._id,
          urgency: 'HIGH',
          reason: 'Test re-validation'
        }
      ],
      createdBy: managerUser._id
    });

    const tempItemId = tempPlan.items[0]._id;

    // Soft-delete the product
    deletedProduct.deletedAt = new Date();
    await deletedProduct.save();

    const approveDeletedRes = await request.post(`/api/replenishment/plans/${tempPlan._id}/items/${tempItemId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    assert.equal(approveDeletedRes.status, 400, 'Soft-deleted product must be rejected at approval time');
    assert.match(approveDeletedRes.body.message, /soft-deleted/i);
  });

  await t.test('POST /plans/:id/items/:itemId/reject rejects item and returns 409 on second reject', async () => {
    const planForReject = await ReplenishmentPlan.create({
      status: 'PENDING_APPROVAL',
      source: 'agent-llm',
      items: [
        {
          product: testProduct._id,
          sku: testProduct.sku,
          productName: testProduct.name,
          currentStock: testProduct.stock,
          suggestedQuantity: 20,
          approvedQuantity: 20,
          supplier: testSupplier._id,
          urgency: 'MEDIUM',
          reason: 'To be rejected'
        }
      ],
      createdBy: managerUser._id
    });

    const rItemId = planForReject.items[0]._id;

    const rejectRes = await request.post(`/api/replenishment/plans/${planForReject._id}/items/${rItemId}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ notes: 'Budget cut this quarter' });

    assert.equal(rejectRes.status, 200);
    assert.equal(rejectRes.body.item.status, 'REJECTED');

    // Second reject returns 409
    const secondRejectRes = await request.post(`/api/replenishment/plans/${planForReject._id}/items/${rItemId}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});
    assert.equal(secondRejectRes.status, 409);
  });

  await t.test('POST /plans/:id/approve-all approves all remaining pending items', async () => {
    const product2 = await Product.create({
      sku: 'SKU-VALVE-501',
      name: 'High Pressure Valve 501PSI',
      category: 'Valves',
      stock: 3,
      lowStockThreshold: 12,
      price: 160,
      cost: 100,
      supplier: testSupplier._id
    });

    const multiPlan = await ReplenishmentPlan.create({
      status: 'PENDING_APPROVAL',
      source: 'agent-llm',
      items: [
        {
          product: testProduct._id,
          sku: testProduct.sku,
          productName: testProduct.name,
          currentStock: testProduct.stock,
          suggestedQuantity: 15,
          approvedQuantity: 15,
          maxAllowed: computeMaxQuantity(testProduct, {}),
          supplier: testSupplier._id,
          urgency: 'MEDIUM',
          reason: 'Item 1'
        },
        {
          product: product2._id,
          sku: product2.sku,
          productName: product2.name,
          currentStock: product2.stock,
          suggestedQuantity: 20,
          approvedQuantity: 20,
          maxAllowed: computeMaxQuantity(product2, {}),
          supplier: testSupplier._id,
          urgency: 'HIGH',
          reason: 'Item 2'
        }
      ],
      createdBy: managerUser._id
    });

    const ordersBefore = await Order.countDocuments();
    const auditLogsBefore = await AuditLog.countDocuments();

    const approveAllRes = await request.post(`/api/replenishment/plans/${multiPlan._id}/approve-all`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({});

    assert.equal(approveAllRes.status, 200);
    assert.equal(approveAllRes.body.ordersCount, 2);
    assert.equal(approveAllRes.body.plan.status, 'APPROVED');

    const ordersAfter = await Order.countDocuments();
    const auditLogsAfter = await AuditLog.countDocuments();
    assert.equal(ordersAfter, ordersBefore + 2, 'Exactly two orders created');
    assert.equal(auditLogsAfter, auditLogsBefore + 2, 'Exactly two audit log entries created');
  });

  // Cleanup
  await mongoose.disconnect();
  await mongod.stop();
});
