import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const orders = await Order.find({}).populate('items.product').populate('createdBy', 'name');
  res.json(orders);
});

router.post('/', protect, async (req, res) => {
  const { type, items, totalAmount } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'No order items' });
  }

  // Transaction engine logic
  for (const item of items) {
    const product = await Product.findById(item.product);
    if (!product) return res.status(404).json({ message: `Product not found: ${item.product}` });

    if (type === 'SALES') {
      if (product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product: ${product.name}` });
      }
      product.stock -= item.quantity;
      await AuditLog.create({
        action: 'STOCK_OUT', entityType: 'Product', entityId: product._id,
        user: req.user._id, details: { quantity: item.quantity, orderType: 'SALES' }
      });
    } else if (type === 'PURCHASE') {
      product.stock += item.quantity;
      await AuditLog.create({
        action: 'STOCK_IN', entityType: 'Product', entityId: product._id,
        user: req.user._id, details: { quantity: item.quantity, orderType: 'PURCHASE' }
      });
    }
    await product.save();
  }

  const order = new Order({
    type,
    items,
    totalAmount,
    createdBy: req.user._id,
    status: 'COMPLETED' // simplified for real-time stock sync
  });

  const createdOrder = await order.save();

  await AuditLog.create({
    action: 'CREATE', entityType: 'Order', entityId: createdOrder._id,
    user: req.user._id, details: { type, totalAmount }
  });

  const io = req.app.get('io');
  if (io) io.emit('order-created', createdOrder);
  if (io) io.emit('stock-changed');

  res.status(201).json(createdOrder);
});

export default router;
