import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import ReplenishmentAgentService, { computeMaxQuantity } from '../services/replenishmentAgentService.js';
import { executeTool } from '../services/replenishmentTools.js';
import Alert from '../models/Alert.js';
import Forecast from '../models/Forecast.js';
import AuditLog from '../models/AuditLog.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Batch from '../models/Batch.js';
import Supplier from '../models/Supplier.js';

test('Replenishment Agent: Schema Validation Tests', async (t) => {
  await t.test('accepts valid replenishment plan JSON', () => {
    const validJson = JSON.stringify({
      items: [
        {
          sku: 'SKU-1001',
          suggestedQuantity: 45,
          supplier: 'Acme Parts',
          urgency: 'HIGH',
          reason: 'Stock is 2 units, below threshold 10.',
          evidenceRefs: [{ tool: 'getReorderQueue', metric: 'currentStock', value: 2 }]
        }
      ],
      purchaseOrderSummary: 'Order 45 units of SKU-1001',
      supplierEmailDrafts: []
    });

    const result = ReplenishmentAgentService.extractAndValidateJson(validJson);
    assert.equal(result.success, true);
    assert.equal(result.data.items.length, 1);
    assert.equal(result.data.items[0].sku, 'SKU-1001');
    assert.equal(result.data.items[0].suggestedQuantity, 45);
  });

  await t.test('strips markdown code block wrappers correctly', () => {
    const markdownWrapped = '```json\n{\n  "items": [{\n    "sku": "SKU-2002",\n    "suggestedQuantity": 20,\n    "urgency": "MEDIUM",\n    "reason": "Replenish"\n  }]\n}\n```';
    const result = ReplenishmentAgentService.extractAndValidateJson(markdownWrapped);
    assert.equal(result.success, true);
    assert.equal(result.data.items[0].sku, 'SKU-2002');
  });

  await t.test('rejects JSON without items array', () => {
    const invalidJson = JSON.stringify({ purchaseOrderSummary: 'Hello' });
    const result = ReplenishmentAgentService.extractAndValidateJson(invalidJson);
    assert.equal(result.success, false);
    assert.match(result.error, /Missing required 'items' array/);
  });

  await t.test('rejects items with invalid or negative quantities', () => {
    const invalidQtyJson = JSON.stringify({
      items: [{ sku: 'SKU-999', suggestedQuantity: -5, reason: 'test' }]
    });
    const result = ReplenishmentAgentService.extractAndValidateJson(invalidQtyJson);
    assert.equal(result.success, false);
    assert.match(result.error, /suggestedQuantity/);
  });
});

test('Replenishment Agent: computeMaxQuantity & Bounds Clamping Tests', async (t) => {
  await t.test('computeMaxQuantity calculates adaptive 60-day demand + 3x threshold bound', () => {
    // Product with velocity 3, threshold 15 -> monthly demand 90 -> 60d demand 180 + 3*15 (45) = 225
    const product = { lowStockThreshold: 15, salesVelocity: 3 };
    const maxQty = computeMaxQuantity(product, { predictedMonthlyDemand: 90 });
    assert.equal(maxQty, 225);

    // Product with zero velocity and threshold 8 -> 60d demand 16 + 3*8 (24) = 40
    const zeroVelProduct = { lowStockThreshold: 8, salesVelocity: 0 };
    const maxZero = computeMaxQuantity(zeroVelProduct, { predictedMonthlyDemand: 8 });
    assert.equal(maxZero, 40);

    // Extreme demand capped at 1000
    const hugeProduct = { lowStockThreshold: 500, salesVelocity: 100 };
    const maxHuge = computeMaxQuantity(hugeProduct, { predictedMonthlyDemand: 3000 });
    assert.equal(maxHuge, 1000);
  });

  await t.test('clamps excessive suggested quantity and sets clamped: true with originalQuantity', async () => {
    const fixtureProduct = {
      _id: new mongoose.Types.ObjectId(),
      sku: 'SKU-CLAMP-TEST',
      name: 'Turbine Valve',
      stock: 4,
      lowStockThreshold: 15,
      salesVelocity: 2,
      reorderQuantity: 30
    };

    const rawPlan = {
      items: [
        {
          sku: 'SKU-CLAMP-TEST',
          suggestedQuantity: 999999, // Prompt injection attempt
          urgency: 'HIGH',
          reason: 'Excessive quantity attempt'
        }
      ]
    };

    const normalized = await ReplenishmentAgentService.serverSideValidateAndNormalize(
      rawPlan,
      'test-user-id',
      { productLookup: async (sku) => (sku === 'SKU-CLAMP-TEST' ? fixtureProduct : null) }
    );

    assert.equal(normalized.items.length, 1);
    const item = normalized.items[0];

    const expectedMax = computeMaxQuantity(fixtureProduct, {});
    assert.equal(item.suggestedQuantity, expectedMax);
    assert.equal(item.clamped, true);
    assert.equal(item.originalQuantity, 999999);
  });
});

test('Replenishment Tools: Pure Read-Only Guarantee with In-Memory MongoDB', async (t) => {
  // Initialize strictly in-memory MongoDB server - fails loudly if it cannot start
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create({
    instance: { launchTimeout: 30000 }
  });
  await mongoose.connect(mongod.getUri());

  // Seed realistic fixture records so all 6 tools execute on real data
  const testSupplier = await Supplier.create({
    name: 'Alpha Test Sensors Ltd',
    code: 'SUP-TEST-RO-1',
    contactInfo: { email: 'orders@alphasensors.com' },
    leadTime: 8,
    rating: 4,
    minimumOrderQuantity: 5
  });

  const testProduct = await Product.create({
    sku: 'SKU-READONLY-1',
    name: 'Industrial Flow Transmitter 4-20mA',
    category: 'Sensors',
    stock: 3,
    lowStockThreshold: 15,
    salesVelocity: 2,
    price: 180,
    cost: 110,
    supplier: testSupplier._id
  });

  const testOrder = await Order.create({
    type: 'SALES',
    status: 'COMPLETED',
    items: [
      { product: testProduct._id, quantity: 4, priceAtTime: 180 }
    ],
    totalAmount: 720,
    createdBy: new mongoose.Types.ObjectId()
  });

  const testBatch = await Batch.create({
    batchNumber: 'BAT-RO-001',
    product: testProduct._id,
    supplier: testSupplier._id,
    manufacturingDate: new Date(),
    expiryDate: new Date(Date.now() + 45 * 86400000), // Expires in 45 days
    quantityReceived: 50,
    quantityAvailable: 3,
    unitCost: 110,
    qualityStatus: 'APPROVED',
    createdBy: new mongoose.Types.ObjectId()
  });

  const testAuditLog = await AuditLog.create({
    action: 'STOCK_OUT',
    entityType: 'Product',
    entityId: testProduct._id,
    user: new mongoose.Types.ObjectId(),
    details: { quantity: 4, action: 'SALES' }
  });

  // Snapshot document counts before tool executions
  const [
    alertCountBefore,
    forecastCountBefore,
    auditCountBefore,
    productCountBefore,
    orderCountBefore,
    batchCountBefore,
    supplierCountBefore
  ] = await Promise.all([
    Alert.countDocuments(),
    Forecast.countDocuments(),
    AuditLog.countDocuments(),
    Product.countDocuments(),
    Order.countDocuments(),
    Batch.countDocuments(),
    Supplier.countDocuments()
  ]);

  // Set up spy harness to intercept any write calls across all 7 models
  const modelsToSpy = [
    { name: 'Alert', model: Alert },
    { name: 'Forecast', model: Forecast },
    { name: 'AuditLog', model: AuditLog },
    { name: 'Product', model: Product },
    { name: 'Order', model: Order },
    { name: 'Batch', model: Batch },
    { name: 'Supplier', model: Supplier }
  ];

  const writeMethods = [
    'create',
    'insertMany',
    'updateOne',
    'updateMany',
    'findOneAndUpdate',
    'findByIdAndUpdate',
    'deleteOne',
    'deleteMany',
    'bulkWrite'
  ];

  const prototypeWriteMethods = ['save', 'updateOne', 'deleteOne'];

  const recordedWrites = [];
  const originalMethods = new Map();

  for (const { name, model } of modelsToSpy) {
    for (const method of writeMethods) {
      if (typeof model[method] === 'function') {
        const orig = model[method];
        originalMethods.set(`${name}.${method}`, orig);
        model[method] = async function (...args) {
          recordedWrites.push({ model: name, method, args });
          return orig.apply(this, args);
        };
      }
    }

    if (model.prototype) {
      for (const method of prototypeWriteMethods) {
        if (typeof model.prototype[method] === 'function') {
          const orig = model.prototype[method];
          originalMethods.set(`${name}.prototype.${method}`, orig);
          model.prototype[method] = async function (...args) {
            recordedWrites.push({ model: `${name}.prototype`, method, args });
            return orig.apply(this, args);
          };
        }
      }
    }
  }

  try {
    // 1. Tool: getReorderQueue
    const queueResult = await executeTool('getReorderQueue', { limit: 10 });
    assert.equal(Boolean(queueResult.error), false, `getReorderQueue returned error: ${queueResult.error}`);
    assert.ok(Array.isArray(queueResult), 'getReorderQueue should return array');
    assert.ok(queueResult.some(item => item.sku === 'SKU-READONLY-1'), 'getReorderQueue should include seeded product');

    // 2. Tool: getProductForecast
    const forecastResult = await executeTool('getProductForecast', { sku: 'SKU-READONLY-1' });
    assert.equal(Boolean(forecastResult.error), false, `getProductForecast returned error: ${forecastResult.error}`);
    assert.equal(forecastResult.sku, 'SKU-READONLY-1');
    assert.ok(forecastResult.predictedMonthlyDemand > 0, 'predictedMonthlyDemand must be > 0');

    // 3. Tool: getProductAnomalies
    const anomalyResult = await executeTool('getProductAnomalies', { sku: 'SKU-READONLY-1' });
    assert.equal(Boolean(anomalyResult.error), false, `getProductAnomalies returned error: ${anomalyResult.error}`);
    assert.equal(anomalyResult.sku, 'SKU-READONLY-1');
    assert.ok(typeof anomalyResult.anomalyCount === 'number');

    // 4. Tool: getExpiringBatches
    const batchResult = await executeTool('getExpiringBatches', { sku: 'SKU-READONLY-1' });
    assert.equal(Boolean(batchResult.error), false, `getExpiringBatches returned error: ${batchResult.error}`);
    assert.equal(batchResult.sku, 'SKU-READONLY-1');
    assert.ok(batchResult.batches.length > 0, 'Should return active batch');
    assert.equal(batchResult.batches[0].batchNumber, 'BAT-RO-001');

    // 5. Tool: getDeadStock
    const deadStockResult = await executeTool('getDeadStock', { noMovementDays: 90 });
    assert.equal(Boolean(deadStockResult.error), false, `getDeadStock returned error: ${deadStockResult.error}`);
    assert.ok(typeof deadStockResult.deadStockCount === 'number');

    // 6. Tool: getSupplierInfo
    const supplierResult = await executeTool('getSupplierInfo', { sku: 'SKU-READONLY-1' });
    assert.equal(Boolean(supplierResult.error), false, `getSupplierInfo returned error: ${supplierResult.error}`);
    assert.equal(supplierResult.found, true);
    assert.equal(supplierResult.name, 'Alpha Test Sensors Ltd');
    assert.equal(supplierResult.leadTimeDays, 8);

    // ASSERT: Zero write operations were triggered
    assert.equal(
      recordedWrites.length,
      0,
      `Expected 0 write calls across all models, but recorded ${recordedWrites.length}: ${JSON.stringify(recordedWrites)}`
    );

    // ASSERT: Database document counts are completely unchanged
    const [
      alertCountAfter,
      forecastCountAfter,
      auditCountAfter,
      productCountAfter,
      orderCountAfter,
      batchCountAfter,
      supplierCountAfter
    ] = await Promise.all([
      Alert.countDocuments(),
      Forecast.countDocuments(),
      AuditLog.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      Batch.countDocuments(),
      Supplier.countDocuments()
    ]);

    assert.equal(alertCountAfter, alertCountBefore, 'Alert count must remain unchanged');
    assert.equal(forecastCountAfter, forecastCountBefore, 'Forecast count must remain unchanged');
    assert.equal(auditCountAfter, auditCountBefore, 'AuditLog count must remain unchanged');
    assert.equal(productCountAfter, productCountBefore, 'Product count must remain unchanged');
    assert.equal(orderCountAfter, orderCountBefore, 'Order count must remain unchanged');
    assert.equal(batchCountAfter, batchCountBefore, 'Batch count must remain unchanged');
    assert.equal(supplierCountAfter, supplierCountBefore, 'Supplier count must remain unchanged');
  } finally {
    // Restore all spied methods
    for (const { name, model } of modelsToSpy) {
      for (const method of writeMethods) {
        if (originalMethods.has(`${name}.${method}`)) {
          model[method] = originalMethods.get(`${name}.${method}`);
        }
      }
      if (model.prototype) {
        for (const method of prototypeWriteMethods) {
          if (originalMethods.has(`${name}.prototype.${method}`)) {
            model.prototype[method] = originalMethods.get(`${name}.prototype.${method}`);
          }
        }
      }
    }

    // Clean up test seeded fixtures
    await Promise.all([
      Supplier.deleteOne({ _id: testSupplier._id }),
      Product.deleteOne({ _id: testProduct._id }),
      Order.deleteOne({ _id: testOrder._id }),
      Batch.deleteOne({ _id: testBatch._id }),
      AuditLog.deleteOne({ _id: testAuditLog._id })
    ]);

    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
    }
  }
});
