import Order from '../models/Order.js';
import Forecast from '../models/Forecast.js';
import Product from '../models/Product.js';

class ForecastingService {
  /**
   * Generate demand forecast for a product
   */
  async generateForecast(productId, options = {}) {
    const {
      method = 'SIMPLE_MOVING_AVERAGE',
      period = 'MONTHLY',
      historicalPeriodMonths = 12,
      forecastPeriodMonths = 6
    } = options;

    try {
      // Get historical sales data
      const historicalData = await this.getHistoricalSalesData(productId, historicalPeriodMonths);

      if (historicalData.length < 3) {
        throw new Error('Insufficient historical data for forecasting');
      }

      // Calculate forecast based on method
      let forecast;
      switch (method) {
        case 'SIMPLE_MOVING_AVERAGE':
          forecast = this.simpleMovingAverage(historicalData, forecastPeriodMonths);
          break;
        case 'WEIGHTED_MOVING_AVERAGE':
          forecast = this.weightedMovingAverage(historicalData, forecastPeriodMonths);
          break;
        case 'EXPONENTIAL_SMOOTHING':
          forecast = this.exponentialSmoothing(historicalData, forecastPeriodMonths);
          break;
        default:
          forecast = this.simpleMovingAverage(historicalData, forecastPeriodMonths);
      }

      // Calculate forecast accuracy and confidence
      const accuracy = this.calculateAccuracy(historicalData);
      const confidenceInterval = this.calculateConfidenceInterval(forecast.predictedDemand, accuracy);

      // Analyze trends and seasonality
      const trend = this.calculateTrend(historicalData);
      const seasonalFactors = this.detectSeasonality(historicalData);

      // Generate recommendations
      const recommendations = this.generateRecommendations(forecast, historicalData);

      // Save forecast
      const forecastDoc = new Forecast({
        product: productId,
        forecastDate: new Date(),
        period,
        method,
        historicalData: {
          periodStart: new Date(Date.now() - historicalPeriodMonths * 30 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(),
          salesData: historicalData,
          averageDemand: historicalData.reduce((sum, d) => sum + d.quantity, 0) / historicalData.length,
          demandVariance: this.calculateVariance(historicalData.map(d => d.quantity))
        },
        forecast: {
          predictedDemand: forecast.predictedDemand,
          confidenceInterval,
          accuracy: accuracy.mape
        },
        factors: {
          seasonalFactors
        },
        recommendations
      });

      await forecastDoc.save();

      return forecastDoc;
    } catch (error) {
      console.error('Forecast generation error:', error);
      throw error;
    }
  }

  /**
   * Get historical sales data for a product
   */
  async getHistoricalSalesData(productId, months = 12) {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const sales = await Order.aggregate([
        {
          $match: {
            type: 'SALES',
            status: 'COMPLETED',
            createdAt: { $gte: startDate }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $match: {
            'items.product': productId
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalQuantity: { $sum: '$items.quantity' },
            totalValue: { $sum: { $multiply: ['$items.quantity', '$items.priceAtTime'] } },
            orderCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]);

      return sales.map(sale => ({
        date: new Date(sale._id.year, sale._id.month - 1),
        quantity: sale.totalQuantity,
        value: sale.totalValue,
        orders: sale.orderCount
      }));

    } catch (error) {
      console.error('Historical data retrieval error:', error);
      throw new Error('Failed to retrieve historical sales data');
    }
  }

  /**
   * Simple Moving Average forecasting
   */
  simpleMovingAverage(historicalData, periods) {
    const values = historicalData.map(d => d.quantity);
    const windowSize = Math.min(3, values.length); // Use last 3 periods
    const recentValues = values.slice(-windowSize);
    const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;

    return {
      predictedDemand: Math.round(average),
      method: 'SMA',
      windowSize
    };
  }

  /**
   * Weighted Moving Average forecasting
   */
  weightedMovingAverage(historicalData, periods) {
    const values = historicalData.map(d => d.quantity);
    const weights = [0.5, 0.3, 0.2]; // More recent data has higher weight
    const windowSize = Math.min(weights.length, values.length);
    const recentValues = values.slice(-windowSize);

    let weightedSum = 0;
    let weightSum = 0;

    for (let i = 0; i < recentValues.length; i++) {
      const weight = weights[weights.length - recentValues.length + i];
      weightedSum += recentValues[i] * weight;
      weightSum += weight;
    }

    return {
      predictedDemand: Math.round(weightedSum / weightSum),
      method: 'WMA',
      weights: weights.slice(-recentValues.length)
    };
  }

  /**
   * Exponential Smoothing forecasting
   */
  exponentialSmoothing(historicalData, periods, alpha = 0.3) {
    const values = historicalData.map(d => d.quantity);

    // Calculate smoothed values
    let smoothed = [values[0]];
    for (let i = 1; i < values.length; i++) {
      smoothed.push(alpha * values[i] + (1 - alpha) * smoothed[i - 1]);
    }

    const predictedDemand = Math.round(smoothed[smoothed.length - 1]);

    return {
      predictedDemand,
      method: 'ES',
      alpha
    };
  }

  /**
   * Calculate forecast accuracy using MAPE (Mean Absolute Percentage Error)
   */
  calculateAccuracy(historicalData) {
    if (historicalData.length < 4) {
      return { mape: 0, accuracy: 'LOW' };
    }

    // Use holdout validation: predict last period using previous periods
    const trainingData = historicalData.slice(0, -1);
    const actualLastPeriod = historicalData[historicalData.length - 1].quantity;

    const forecast = this.simpleMovingAverage(trainingData, 1);
    const predictedLastPeriod = forecast.predictedDemand;

    const absoluteError = Math.abs(actualLastPeriod - predictedLastPeriod);
    const mape = actualLastPeriod > 0 ? (absoluteError / actualLastPeriod) * 100 : 0;

    let accuracy = 'HIGH';
    if (mape > 20) accuracy = 'MEDIUM';
    if (mape > 50) accuracy = 'LOW';

    return { mape, accuracy };
  }

  /**
   * Calculate confidence interval
   */
  calculateConfidenceInterval(predictedDemand, accuracy) {
    const confidenceLevels = {
      'HIGH': 0.95,
      'MEDIUM': 0.80,
      'LOW': 0.60
    };

    const confidence = confidenceLevels[accuracy.accuracy] || 0.80;
    const margin = predictedDemand * (accuracy.mape / 100) * (1 - confidence);

    return {
      lower: Math.max(0, Math.round(predictedDemand - margin)),
      upper: Math.round(predictedDemand + margin),
      confidence
    };
  }

  /**
   * Calculate trend direction
   */
  calculateTrend(historicalData) {
    if (historicalData.length < 2) return 0;

    const values = historicalData.map(d => d.quantity);
    const n = values.length;

    // Linear regression slope
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + (val * index), 0);
    const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    return slope; // Positive = increasing, negative = decreasing
  }

  /**
   * Detect seasonality (simplified)
   */
  detectSeasonality(historicalData) {
    if (historicalData.length < 12) return []; // Need at least a year

    const monthlyAverages = {};
    historicalData.forEach(data => {
      const month = data.date.getMonth();
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = [];
      }
      monthlyAverages[month].push(data.quantity);
    });

    const seasonalFactors = [];
    for (let month = 0; month < 12; month++) {
      const values = monthlyAverages[month] || [];
      const average = values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      seasonalFactors.push(average);
    }

    return seasonalFactors;
  }

  /**
   * Generate recommendations based on forecast
   */
  generateRecommendations(forecast, historicalData) {
    const recommendations = [];

    const averageDemand = historicalData.reduce((sum, d) => sum + d.quantity, 0) / historicalData.length;
    const safetyStock = Math.round(forecast.predictedDemand * 0.2); // 20% safety stock
    const reorderPoint = Math.round(forecast.predictedDemand * 0.5); // Reorder at 50% of forecast

    recommendations.push({
      safetyStock,
      reorderPoint,
      reorderQuantity: Math.round(forecast.predictedDemand * 1.5) // Order 150% of forecast
    });

    // Price recommendations based on demand
    const trend = this.calculateTrend(historicalData);
    if (trend > 0) {
      recommendations[0].suggestedPrice = 'Consider price increase due to rising demand';
    } else if (trend < 0) {
      recommendations[0].suggestedPrice = 'Consider price decrease or promotions to boost demand';
    }

    return recommendations[0];
  }

  /**
   * Calculate variance
   */
  calculateVariance(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Update forecasts for all products (batch job)
   */
  async updateAllForecasts() {
    try {
      const products = await Product.find({ deletedAt: null });
      const results = [];

      for (const product of products) {
        try {
          const forecast = await this.generateForecast(product._id);
          results.push({
            product: product.name,
            success: true,
            forecastId: forecast._id
          });
        } catch (error) {
          results.push({
            product: product.name,
            success: false,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Batch forecast update error:', error);
      throw new Error('Failed to update forecasts');
    }
  }
}

export default new ForecastingService();