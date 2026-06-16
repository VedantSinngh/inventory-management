import cron from 'node-cron';
import axios from 'axios';
import ExchangeRate from '../models/ExchangeRate.js';
import logger from './logger.js';

export function startExchangeRateCron() {
  // Run every night at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const response = await axios.get('https://open.er-api.com/v6/latest/USD');
      await ExchangeRate.findOneAndUpdate(
        { baseCurrency: 'USD' },
        { rates: response.data.rates, lastUpdated: new Date() },
        { upsert: true }
      );
      logger.info('Exchange rates successfully updated via daily cron job');
    } catch (err) {
      logger.error('Failed to update exchange rates in cron job', { error: err.message });
    }
  });
}
