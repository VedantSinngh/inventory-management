import mongoose from 'mongoose';

const forecastSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  forecastDate: { type: Date, required: true },
  period: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'],
    default: 'MONTHLY'
  },
  method: {
    type: String,
    enum: ['SIMPLE_MOVING_AVERAGE', 'WEIGHTED_MOVING_AVERAGE', 'EXPONENTIAL_SMOOTHING', 'LINEAR_REGRESSION', 'SEASONAL_ARIMA'],
    default: 'SIMPLE_MOVING_AVERAGE'
  },
  historicalData: {
    periodStart: Date,
    periodEnd: Date,
    salesData: [{
      date: Date,
      quantity: Number,
      value: Number
    }],
    averageDemand: Number,
    demandVariance: Number,
    trend: Number // positive for increasing, negative for decreasing
  },
  forecast: {
    predictedDemand: { type: Number, required: true },
    confidenceInterval: {
      lower: Number,
      upper: Number,
      confidence: { type: Number, min: 0, max: 1, default: 0.95 }
    },
    accuracy: Number, // MAPE (Mean Absolute Percentage Error)
    seasonalFactors: [Number] // For seasonal forecasting
  },
  factors: {
    external: [{
      name: String, // e.g., 'holiday', 'promotion', 'weather'
      impact: Number, // percentage impact on demand
      description: String
    }],
    internal: [{
      name: String, // e.g., 'price_change', 'new_product_launch'
      impact: Number,
      description: String
    }]
  },
  recommendations: {
    safetyStock: Number,
    reorderPoint: Number,
    reorderQuantity: Number,
    suggestedPrice: Number
  },
  status: {
    type: String,
    enum: ['GENERATED', 'REVIEWED', 'APPROVED', 'IMPLEMENTED'],
    default: 'GENERATED'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date
}, {
  timestamps: true
});

// Indexes
forecastSchema.index({ product: 1, forecastDate: 1 });
forecastSchema.index({ period: 1 });
forecastSchema.index({ status: 1 });
forecastSchema.index({ createdAt: -1 });

const Forecast = mongoose.model('Forecast', forecastSchema);
export default Forecast;