import express from 'express';
import Warehouse from '../models/Warehouse.js';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, async (req, res) => {
  const warehouses = await Warehouse.find({});
  res.json(warehouses);
});

router.post('/', protect, admin, async (req, res) => {
  const warehouse = new Warehouse(req.body);
  const createdWarehouse = await warehouse.save();
  res.status(201).json(createdWarehouse);
});

router.get('/:id/stock', protect, async (req, res) => {
  const products = await Product.find({ warehouse: req.params.id });
  res.json(products);
});

export default router;
