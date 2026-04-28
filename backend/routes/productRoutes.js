import express from 'express';
import Product from '../models/Product.js';
import AuditLog from '../models/AuditLog.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const products = await Product.find({}).populate('warehouse');
  res.json(products);
});

router.post('/', protect, async (req, res) => {
  const product = new Product(req.body);
  const createdProduct = await product.save();
  
  await AuditLog.create({
    action: 'CREATE',
    entityType: 'Product',
    entityId: createdProduct._id,
    user: req.user._id,
    details: { name: createdProduct.name, initialStock: createdProduct.stock }
  });

  const io = req.app.get('io');
  if (io) io.emit('product-created', createdProduct);

  res.status(201).json(createdProduct);
});

router.put('/:id', protect, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    Object.assign(product, req.body);
    const updatedProduct = await product.save();
    
    await AuditLog.create({
      action: 'UPDATE',
      entityType: 'Product',
      entityId: updatedProduct._id,
      user: req.user._id,
      details: { updates: req.body }
    });

    const io = req.app.get('io');
    if (io) io.emit('product-updated', updatedProduct);

    res.json(updatedProduct);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
});

export default router;
