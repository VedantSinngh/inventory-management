import mongoose from 'mongoose';

const exchangeRateSchema = new mongoose.Schema({
  baseCurrency: { type: String, default: 'USD', required: true },
  rates: {
    type: Map,
    of: Number
  },
  lastUpdated: { type: Date, default: Date.now }
});

const ExchangeRate = mongoose.model('ExchangeRate', exchangeRateSchema);
export default ExchangeRate;
