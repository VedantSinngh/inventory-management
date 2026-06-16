import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import Warehouse from '../models/Warehouse.js';
import Batch from '../models/Batch.js';
import Order from '../models/Order.js';
import Shipment from '../models/Shipment.js';
import Alert from '../models/Alert.js';
import Forecast from '../models/Forecast.js';

const router = express.Router();

// @desc    Import JSON data (converted from CSV in frontend)
// @route   POST /api/import
// @access  Private/Admin
router.post('/', protect, admin, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { data, wipeDatabase } = req.body; // data is array of objects

    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid data format. Expected an array of objects.');
    }

    if (wipeDatabase) {
      // Wipe all collections except Users
      await Product.deleteMany({}, { session });
      await Supplier.deleteMany({}, { session });
      await Warehouse.deleteMany({}, { session });
      await Batch.deleteMany({}, { session });
      await Order.deleteMany({}, { session });
      await Shipment.deleteMany({}, { session });
      await Alert.deleteMany({}, { session });
      await Forecast.deleteMany({}, { session });
    }

    let stats = {
      products: 0,
      suppliers: 0,
      warehouses: 0,
      batches: 0,
      orders: 0,
      shipments: 0,
      alerts: 0,
      forecasts: 0
    };

    // Cache for suppliers and warehouses to avoid duplicate creation
    const supplierCache = {};
    const warehouseCache = {};

    for (const row of data) {
      const {
        ProductName, SKU, Category, Price, Cost, Stock, 
        SupplierName, WarehouseName, BatchQuantity, 
        OrderQuantity, ShipmentStatus, AlertMessage, ForecastDemand
      } = row;

      if (!ProductName || !SKU || !Category) continue;

      // 1. Find or Create Supplier
      let supplierId = null;
      if (SupplierName) {
        if (!supplierCache[SupplierName]) {
          let sup = await Supplier.findOne({ name: SupplierName }).session(session);
          if (!sup) {
            sup = await Supplier.create([{ 
              name: SupplierName, 
              contactName: 'Import Contact', 
              email: 'import@' + SupplierName.replace(/\s+/g, '').toLowerCase() + '.com',
              status: 'ACTIVE'
            }], { session });
            sup = sup[0];
            stats.suppliers++;
          }
          supplierCache[SupplierName] = sup._id;
        }
        supplierId = supplierCache[SupplierName];
      }

      // 2. Find or Create Warehouse
      let warehouseId = null;
      if (WarehouseName) {
        if (!warehouseCache[WarehouseName]) {
          let wh = await Warehouse.findOne({ name: WarehouseName }).session(session);
          if (!wh) {
            wh = await Warehouse.create([{ 
              name: WarehouseName, 
              location: 'Import Location',
              capacity: 10000,
              manager: req.user._id,
              status: 'ACTIVE'
            }], { session });
            wh = wh[0];
            stats.warehouses++;
          }
          warehouseCache[WarehouseName] = wh._id;
        }
        warehouseId = warehouseCache[WarehouseName];
      }

      // 3. Create Product
      const product = await Product.create([{
        name: ProductName,
        sku: SKU,
        category: Category,
        price: Number(Price) || 0,
        cost: Number(Cost) || 0,
        stock: Number(Stock) || 0,
        supplier: supplierId,
        warehouse: warehouseId,
        lowStockThreshold: 10
      }], { session });
      const createdProduct = product[0];
      stats.products++;

      // 4. Create Batch
      if (BatchQuantity && Number(BatchQuantity) > 0) {
        await Batch.create([{
          batchNumber: `BATCH-${SKU}-${Date.now()}`,
          product: createdProduct._id,
          quantity: Number(BatchQuantity),
          warehouse: warehouseId,
          supplier: supplierId,
          receivedDate: new Date(),
          status: 'ACTIVE'
        }], { session });
        stats.batches++;
      }

      // 5 & 6. Create Order and Shipment
      if (OrderQuantity && Number(OrderQuantity) > 0) {
        const order = await Order.create([{
          orderNumber: `ORD-${SKU}-${Date.now()}`,
          customerName: 'Import Customer',
          email: 'customer@import.com',
          items: [{
            product: createdProduct._id,
            quantity: Number(OrderQuantity),
            price: Number(Price) || 0
          }],
          totalAmount: (Number(Price) || 0) * Number(OrderQuantity),
          status: 'COMPLETED',
          paymentStatus: 'PAID'
        }], { session });
        const createdOrder = order[0];
        stats.orders++;

        if (ShipmentStatus) {
          await Shipment.create([{
            trackingNumber: `TRK-${SKU}-${Date.now()}`,
            order: createdOrder._id,
            carrier: 'BMW Logistics',
            status: ShipmentStatus,
            estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          }], { session });
          stats.shipments++;
        }
      }

      // 7. Create Alert
      if (AlertMessage) {
        await Alert.create([{
          title: 'Imported Alert',
          message: AlertMessage,
          type: 'SYSTEM',
          severity: 'HIGH',
          status: 'NEW',
          relatedEntity: {
            entityModel: 'Product',
            entityId: createdProduct._id
          }
        }], { session });
        stats.alerts++;
      }

      // 8. Create Forecast
      if (ForecastDemand && Number(ForecastDemand) > 0) {
        await Forecast.create([{
          product: createdProduct._id,
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          predictedDemand: Number(ForecastDemand),
          confidenceInterval: 85,
          status: 'ACTIVE'
        }], { session });
        stats.forecasts++;
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: 'Import successful', stats });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Import Error:', error);
    res.status(500).json({ message: error.message || 'Error processing import' });
  }
});

export default router;
