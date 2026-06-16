import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import ExchangeRate from '../models/ExchangeRate.js';
import axios from 'axios';
import logger from '../services/logger.js';

const router = express.Router();

/**
 * GET /api/finance/sku-margins
 * Fetch gross margin per SKU
 */
router.get('/sku-margins', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const products = await Product.find({ deletedAt: null }).lean();
    const orders = await Order.find({ type: 'SALES', status: 'COMPLETED' }).lean();

    const margins = products.map(product => {
      let salesQty = 0;
      let revenue = 0;
      let cogs = 0;

      for (const order of orders) {
        for (const item of order.items) {
          if (item.product.toString() === product._id.toString()) {
            salesQty += item.quantity;
            revenue += item.quantity * item.priceAtTime;
            cogs += item.cogs || 0;
          }
        }
      }

      const profit = revenue - cogs;
      const marginPct = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        productId: product._id,
        name: product.name,
        sku: product.sku,
        salesQuantity: salesQty,
        revenue: parseFloat(revenue.toFixed(2)),
        cogs: parseFloat(cogs.toFixed(2)),
        grossProfit: parseFloat(profit.toFixed(2)),
        marginPercentage: parseFloat(marginPct.toFixed(2))
      };
    });

    res.json({ data: margins });
  } catch (error) {
    logger.error('SKU margins fetch error', { error: error.message });
    res.status(500).json({ message: 'Error fetching SKU margins', error: error.message });
  }
});

/**
 * GET /api/finance/pl-summary
 * Get monthly P&L summary view
 */
router.get('/pl-summary', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const orders = await Order.find({ type: 'SALES', status: 'COMPLETED' }).lean();

    const plMap = {};

    for (const order of orders) {
      const date = new Date(order.createdAt);
      const monthYearStr = date.toLocaleString('default', { month: 'long', year: 'numeric' });

      if (!plMap[monthYearStr]) {
        plMap[monthYearStr] = {
          month: monthYearStr,
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          ordersCount: 0
        };
      }

      plMap[monthYearStr].revenue += order.totalAmount;
      plMap[monthYearStr].cogs += order.totalCogs || 0;
      plMap[monthYearStr].ordersCount += 1;
    }

    const plArray = Object.values(plMap).map(m => {
      m.grossProfit = parseFloat((m.revenue - m.cogs).toFixed(2));
      m.revenue = parseFloat(m.revenue.toFixed(2));
      m.cogs = parseFloat(m.cogs.toFixed(2));
      m.marginPercentage = m.revenue > 0 ? parseFloat(((m.grossProfit / m.revenue) * 100).toFixed(2)) : 0;
      return m;
    });

    res.json({ data: plArray });
  } catch (error) {
    logger.error('PL summary error', { error: error.message });
    res.status(500).json({ message: 'Error calculating P&L summary', error: error.message });
  }
});

/**
 * GET /api/finance/rates
 * Fetch exchange rates (from cache)
 */
router.get('/rates', protect, async (req, res) => {
  try {
    let rateCache = await ExchangeRate.findOne({ baseCurrency: 'USD' });
    if (!rateCache) {
      // Fetch fresh rates if cache empty
      const response = await axios.get('https://open.er-api.com/v6/latest/USD');
      rateCache = new ExchangeRate({
        baseCurrency: 'USD',
        rates: response.data.rates,
        lastUpdated: new Date()
      });
      await rateCache.save();
    }

    res.json({ data: rateCache });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exchange rates', error: error.message });
  }
});

/**
 * POST /api/finance/rates/refresh
 * Force rate cache update
 */
router.post('/rates/refresh', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD');
    const rateCache = await ExchangeRate.findOneAndUpdate(
      { baseCurrency: 'USD' },
      { rates: response.data.rates, lastUpdated: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Exchange rates refreshed successfully', data: rateCache });
  } catch (error) {
    res.status(500).json({ message: 'Error refreshing exchange rates', error: error.message });
  }
});

export default router;
