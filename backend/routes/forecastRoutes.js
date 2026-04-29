import express from 'express';
import Forecast from '../models/Forecast.js';
import { protect } from '../middleware/auth.js';
import ForecastingService from '../services/forecastingService.js';

const router = express.Router();

// Generate forecast for a product
router.post('/generate/:productId', protect, async (req, res) => {
  try {
    const { method, period, historicalPeriodMonths, forecastPeriodMonths } = req.body;

    const forecast = await ForecastingService.generateForecast(req.params.productId, {
      method: method || 'SIMPLE_MOVING_AVERAGE',
      period: period || 'MONTHLY',
      historicalPeriodMonths: historicalPeriodMonths || 12,
      forecastPeriodMonths: forecastPeriodMonths || 6
    });

    res.json(forecast);
  } catch (error) {
    res.status(500).json({ message: 'Error generating forecast', error: error.message });
  }
});

// Get forecasts for a product
router.get('/product/:productId', protect, async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const forecasts = await Forecast.find({ product: req.params.productId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('product', 'name sku')
      .populate('createdBy', 'name');

    res.json(forecasts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forecasts', error: error.message });
  }
});

// Get forecast by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const forecast = await Forecast.findById(req.params.id)
      .populate('product', 'name sku')
      .populate('createdBy', 'name')
      .populate('reviewedBy', 'name');

    if (!forecast) {
      return res.status(404).json({ message: 'Forecast not found' });
    }

    res.json(forecast);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forecast', error: error.message });
  }
});

// Review and approve forecast
router.put('/:id/review', protect, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const forecast = await Forecast.findById(req.params.id);
    if (!forecast) {
      return res.status(404).json({ message: 'Forecast not found' });
    }

    forecast.status = status;
    forecast.reviewedBy = req.user.id;
    forecast.reviewedAt = new Date();

    if (notes) {
      // Could add notes field to Forecast model if needed
    }

    await forecast.save();

    res.json(forecast);
  } catch (error) {
    res.status(500).json({ message: 'Error reviewing forecast', error: error.message });
  }
});

// Get forecast accuracy metrics
router.get('/:id/accuracy', protect, async (req, res) => {
  try {
    const forecast = await Forecast.findById(req.params.id);

    if (!forecast) {
      return res.status(404).json({ message: 'Forecast not found' });
    }

    // Calculate actual vs predicted accuracy
    const accuracy = await ForecastingService.calculateAccuracy(forecast.historicalData.salesData);

    res.json({
      forecastId: forecast._id,
      method: forecast.method,
      accuracy,
      confidenceInterval: forecast.forecast.confidenceInterval
    });
  } catch (error) {
    res.status(500).json({ message: 'Error calculating forecast accuracy', error: error.message });
  }
});

// Generate forecasts for all products (batch operation)
router.post('/generate-all', protect, async (req, res) => {
  try {
    const results = await ForecastingService.updateAllForecasts();

    res.json({
      message: 'Forecast generation completed',
      results
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating forecasts', error: error.message });
  }
});

// Get forecast analytics
router.get('/analytics/overview', protect, async (req, res) => {
  try {
    const totalForecasts = await Forecast.countDocuments();
    const approvedForecasts = await Forecast.countDocuments({ status: 'APPROVED' });
    const implementedForecasts = await Forecast.countDocuments({ status: 'IMPLEMENTED' });

    // Get accuracy distribution
    const forecasts = await Forecast.find({}, 'forecast.accuracy');
    const accuracyDistribution = {
      high: forecasts.filter(f => f.forecast?.accuracy === 'HIGH').length,
      medium: forecasts.filter(f => f.forecast?.accuracy === 'MEDIUM').length,
      low: forecasts.filter(f => f.forecast?.accuracy === 'LOW').length
    };

    // Get recent forecast performance
    const recentForecasts = await Forecast.find({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    }).sort({ createdAt: -1 });

    res.json({
      totalForecasts,
      approvedForecasts,
      implementedForecasts,
      accuracyDistribution,
      recentForecasts: recentForecasts.length,
      averageAccuracy: totalForecasts > 0 ?
        ((accuracyDistribution.high * 1 + accuracyDistribution.medium * 0.5) / totalForecasts * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forecast analytics', error: error.message });
  }
});

// What-if forecasting
router.post('/what-if', protect, async (req, res) => {
  try {
    const { productId, scenarios } = req.body;

    // Get base forecast
    const baseForecast = await Forecast.findOne({ product: productId })
      .sort({ createdAt: -1 });

    if (!baseForecast) {
      return res.status(404).json({ message: 'No forecast found for this product' });
    }

    const whatIfResults = [];

    for (const scenario of scenarios) {
      const { factor, type, value } = scenario; // e.g., { factor: 'price', type: 'percentage', value: 10 }

      let adjustedDemand = baseForecast.forecast.predictedDemand;

      switch (factor) {
        case 'price':
          // Price elasticity: 10% price increase typically reduces demand by 5-10%
          const elasticity = -0.07; // Conservative estimate
          const priceChange = type === 'percentage' ? value / 100 : value / baseForecast.product.price;
          adjustedDemand *= (1 + elasticity * priceChange);
          break;

        case 'promotion':
          // Promotion impact
          adjustedDemand *= (1 + value / 100);
          break;

        case 'season':
          // Seasonal factor
          adjustedDemand *= value;
          break;

        case 'competition':
          // Competition impact
          adjustedDemand *= (1 - value / 100);
          break;

        default:
          adjustedDemand = baseForecast.forecast.predictedDemand;
      }

      whatIfResults.push({
        scenario,
        baseDemand: baseForecast.forecast.predictedDemand,
        adjustedDemand: Math.round(adjustedDemand),
        change: Math.round(((adjustedDemand - baseForecast.forecast.predictedDemand) / baseForecast.forecast.predictedDemand * 100) * 100) / 100
      });
    }

    res.json({
      productId,
      baseForecast: baseForecast.forecast.predictedDemand,
      scenarios: whatIfResults
    });
  } catch (error) {
    res.status(500).json({ message: 'Error running what-if analysis', error: error.message });
  }
});

export default router;