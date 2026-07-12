import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Return from '../models/Return.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Supplier from '../models/Supplier.js';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * POST /api/returns
 * Request a new return
 */
router.post('/', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const { originalOrderId, productId, quantity, reasonCode, notes } = req.body;

    if (!originalOrderId || !productId || !quantity || !reasonCode) {
      return res.status(400).json({ message: 'Missing required return fields' });
    }

    const order = await Order.findById(originalOrderId);
    if (!order) {
      return res.status(404).json({ message: 'Original order not found' });
    }

    const returnNumber = 'RET-' + Math.floor(100000 + Math.random() * 900000);

    const newReturn = new Return({
      returnNumber,
      originalOrder: originalOrderId,
      product: productId,
      quantity,
      reasonCode,
      notes
    });

    await newReturn.save();
    logger.info(`Return registered: ${returnNumber}`, { userId: req.user.id });
    res.status(201).json({ data: newReturn });
  } catch (error) {
    logger.error('Return registration error', { error: error.message });
    res.status(500).json({ message: 'Error registering return', error: error.message });
  }
});

/**
 * GET /api/returns
 * List all returns
 */
router.get('/', protect, authorize('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const returns = await Return.find()
      .populate('originalOrder')
      .populate('product')
      .sort({ createdAt: -1 });
    res.json({ data: returns });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching returns', error: error.message });
  }
});

/**
 * PATCH /api/returns/:id/process
 * Run inspection and process disposition
 */
router.patch('/:id/process', protect, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { isDamaged, isSealed, supplierLiable, notes } = req.body;
    const returnRecord = await Return.findById(req.params.id);

    if (!returnRecord) {
      return res.status(404).json({ message: 'Return record not found' });
    }

    let disposition = 'QUARANTINE';
    if (returnRecord.reasonCode === 'EXPIRED' || isDamaged) {
      disposition = 'DISPOSED';
    } else if (returnRecord.reasonCode === 'BUYER_REMORSE' || returnRecord.reasonCode === 'WRONG_ITEM') {
      if (isSealed) disposition = 'RESTOCKED';
      else disposition = 'QUARANTINE';
    } else if (returnRecord.reasonCode === 'DEFECTIVE') {
      disposition = 'QUARANTINE';
    }

    returnRecord.disposition = disposition;
    returnRecord.inspectedBy = req.user.id;
    returnRecord.supplierLiable = !!supplierLiable;
    if (notes) returnRecord.notes = (returnRecord.notes || '') + '\nInspection: ' + notes;

    await returnRecord.save();

    // Perform inventory updates
    if (disposition === 'RESTOCKED') {
      const product = await Product.findById(returnRecord.product);
      if (product) {
        product.stock += returnRecord.quantity;
        await product.save();
      }
    }

    // Perform supplier penalty if liable
    if (supplierLiable) {
      const product = await Product.findById(returnRecord.product);
      if (product && product.supplier) {
        const supplierObj = await Supplier.findById(product.supplier);
        if (supplierObj) {
          // Adjust rating by decrementing a small value or storing failure counts
          supplierObj.rating = Math.max(1, supplierObj.rating - 0.2);
          await supplierObj.save();
        }
      }
    }

    logger.info(`Processed return ${returnRecord.returnNumber} as ${disposition}`, { userId: req.user.id });
    res.json({ message: `Return processed as ${disposition}`, data: returnRecord });
  } catch (error) {
    logger.error('Return process error', { error: error.message });
    res.status(500).json({ message: 'Error processing return', error: error.message });
  }
});

export default router;
