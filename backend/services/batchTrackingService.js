import Batch from '../models/Batch.js';
import Product from '../models/Product.js';
import Alert from '../models/Alert.js';

class BatchTrackingService {
  /**
   * Create a new batch
   */
  async createBatch(batchData) {
    try {
      const batch = new Batch(batchData);
      await batch.save();

      // Update product's batch list
      await Product.findByIdAndUpdate(batch.product, {
        $push: { batches: batch._id }
      });

      // Check for expiry alerts
      await this.checkExpiryAlerts(batch);

      return batch;
    } catch (error) {
      console.error('Create batch error:', error);
      throw new Error('Failed to create batch');
    }
  }

  /**
   * Get batches for a product using FIFO/FEFO logic
   */
  async getBatchesForProduct(productId, strategy = 'FIFO', options = {}) {
    const { limit, includeExpired = false } = options;

    try {
      let sortCriteria;

      switch (strategy.toUpperCase()) {
        case 'FEFO': // First Expiry First Out
          sortCriteria = { expiryDate: 1, fifoPosition: 1 };
          break;
        case 'LIFO': // Last In First Out
          sortCriteria = { fifoPosition: -1 };
          break;
        case 'FIFO': // First In First Out (default)
        default:
          sortCriteria = { fifoPosition: 1 };
          break;
      }

      const query = {
        product: productId,
        quantityAvailable: { $gt: 0 }
      };

      if (!includeExpired) {
        query.expiryDate = { $gt: new Date() };
      }

      const batches = await Batch.find(query)
        .sort(sortCriteria)
        .limit(limit || 0)
        .populate('supplier', 'name code')
        .populate('product', 'name sku');

      return batches;
    } catch (error) {
      console.error('Get batches error:', error);
      throw new Error('Failed to retrieve batches');
    }
  }

  /**
   * Allocate stock from batches using FIFO/FEFO strategy
   */
  async allocateStock(productId, quantityNeeded, strategy = 'FIFO') {
    try {
      const batches = await this.getBatchesForProduct(productId, strategy);
      const allocation = [];
      let remainingQuantity = quantityNeeded;

      for (const batch of batches) {
        if (remainingQuantity <= 0) break;

        const allocateQuantity = Math.min(remainingQuantity, batch.quantityAvailable);
        if (allocateQuantity > 0) {
          allocation.push({
            batch: batch._id,
            quantity: allocateQuantity,
            expiryDate: batch.expiryDate,
            batchNumber: batch.batchNumber
          });

          // Update batch quantity
          batch.quantityAvailable -= allocateQuantity;
          await batch.save();

          remainingQuantity -= allocateQuantity;
        }
      }

      if (remainingQuantity > 0) {
        throw new Error(`Insufficient stock. Missing ${remainingQuantity} units`);
      }

      return allocation;
    } catch (error) {
      console.error('Stock allocation error:', error);
      throw error;
    }
  }

  /**
   * Check and create expiry alerts
   */
  async checkExpiryAlerts(batch = null) {
    try {
      const now = new Date();
      const warningDays = 30; // Alert 30 days before expiry
      const criticalDays = 7;  // Critical alert 7 days before expiry

      let query = {
        expiryDate: { $gt: now },
        quantityAvailable: { $gt: 0 }
      };

      if (batch) {
        query._id = batch._id;
      }

      const expiringBatches = await Batch.find(query)
        .populate('product', 'name sku')
        .populate('supplier', 'name');

      const alerts = [];

      for (const batch of expiringBatches) {
        const daysUntilExpiry = Math.ceil((batch.expiryDate - now) / (1000 * 60 * 60 * 24));
        let severity = 'LOW';
        let title = '';
        let message = '';

        if (daysUntilExpiry <= criticalDays) {
          severity = 'CRITICAL';
          title = `Batch ${batch.batchNumber} expires in ${daysUntilExpiry} days`;
          message = `Product ${batch.product.name} (SKU: ${batch.product.sku}) batch ${batch.batchNumber} from ${batch.supplier.name} expires on ${batch.expiryDate.toDateString()}. ${batch.quantityAvailable} units remaining.`;
        } else if (daysUntilExpiry <= warningDays) {
          severity = 'MEDIUM';
          title = `Batch ${batch.batchNumber} expires in ${daysUntilExpiry} days`;
          message = `Product ${batch.product.name} (SKU: ${batch.product.sku}) batch ${batch.batchNumber} expires soon. Consider prioritizing this batch for sales.`;
        }

        if (title) {
          const alert = new Alert({
            type: 'EXPIRY_WARNING',
            severity,
            title,
            message,
            relatedEntities: {
              product: batch.product._id,
              batch: batch._id,
              supplier: batch.supplier._id
            },
            metrics: {
              currentValue: daysUntilExpiry,
              thresholdValue: severity === 'CRITICAL' ? criticalDays : warningDays
            }
          });

          alerts.push(alert);
        }
      }

      if (alerts.length > 0) {
        await Alert.insertMany(alerts);
      }

      return alerts;
    } catch (error) {
      console.error('Expiry alert check error:', error);
      throw new Error('Failed to check expiry alerts');
    }
  }

  /**
   * Get batch rotation recommendations
   */
  async getRotationRecommendations(productId) {
    try {
      const batches = await Batch.find({
        product: productId,
        quantityAvailable: { $gt: 0 },
        expiryDate: { $gt: new Date() }
      }).sort({ expiryDate: 1 });

      const recommendations = [];

      if (batches.length === 0) return recommendations;

      const now = new Date();
      const urgentThreshold = 7; // days
      const warningThreshold = 30; // days

      for (const batch of batches) {
        const daysUntilExpiry = Math.ceil((batch.expiryDate - now) / (1000 * 60 * 60 * 24));

        let priority = 'NORMAL';
        let action = 'Monitor';

        if (daysUntilExpiry <= urgentThreshold) {
          priority = 'URGENT';
          action = 'Sell immediately or quarantine';
        } else if (daysUntilExpiry <= warningThreshold) {
          priority = 'HIGH';
          action = 'Prioritize in sales orders';
        }

        recommendations.push({
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          daysUntilExpiry,
          quantityAvailable: batch.quantityAvailable,
          priority,
          recommendedAction: action
        });
      }

      return recommendations.sort((a, b) => {
        const priorityOrder = { 'URGENT': 0, 'HIGH': 1, 'NORMAL': 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

    } catch (error) {
      console.error('Rotation recommendations error:', error);
      throw new Error('Failed to get rotation recommendations');
    }
  }

  /**
   * Process batch expiry (mark as expired and handle stock)
   */
  async processExpiredBatches() {
    try {
      const now = new Date();

      const expiredBatches = await Batch.find({
        expiryDate: { $lte: now },
        qualityStatus: { $ne: 'EXPIRED' },
        quantityAvailable: { $gt: 0 }
      }).populate('product', 'name sku');

      const updates = [];

      for (const batch of expiredBatches) {
        // Update batch status
        batch.qualityStatus = 'EXPIRED';
        batch.alerts.push({
          type: 'BATCH_EXPIRED',
          message: `Batch ${batch.batchNumber} has expired`,
          severity: 'CRITICAL',
          createdAt: new Date()
        });
        await batch.save();

        // Reduce product stock
        await Product.findByIdAndUpdate(batch.product._id, {
          $inc: { stock: -batch.quantityAvailable }
        });

        // Create alert
        const alert = new Alert({
          type: 'BATCH_EXPIRED',
          severity: 'CRITICAL',
          title: `Batch ${batch.batchNumber} has expired`,
          message: `Product ${batch.product.name} (SKU: ${batch.product.sku}) batch ${batch.batchNumber} has expired. ${batch.quantityAvailable} units have been removed from available stock.`,
          relatedEntities: {
            product: batch.product._id,
            batch: batch._id
          }
        });

        updates.push(alert);
      }

      if (updates.length > 0) {
        await Alert.insertMany(updates);
      }

      return {
        processed: expiredBatches.length,
        alerts: updates.length
      };

    } catch (error) {
      console.error('Process expired batches error:', error);
      throw new Error('Failed to process expired batches');
    }
  }

  /**
   * Get batch traceability information
   */
  async getBatchTraceability(batchId) {
    try {
      const batch = await Batch.findById(batchId)
        .populate('product', 'name sku category')
        .populate('supplier', 'name code contactInfo')
        .populate('purchaseOrder');

      if (!batch) {
        throw new Error('Batch not found');
      }

      // Get movement history (this would require additional tracking)
      const movements = await this.getBatchMovements(batchId);

      return {
        batch: {
          batchNumber: batch.batchNumber,
          product: batch.product,
          supplier: batch.supplier,
          manufacturingDate: batch.manufacturingDate,
          expiryDate: batch.expiryDate,
          quantityReceived: batch.quantityReceived,
          quantityAvailable: batch.quantityAvailable,
          location: batch.location,
          qualityStatus: batch.qualityStatus
        },
        movements,
        certifications: batch.certifications,
        storageConditions: batch.storageConditions,
        alerts: batch.alerts
      };

    } catch (error) {
      console.error('Batch traceability error:', error);
      throw error;
    }
  }

  /**
   * Get batch movements (placeholder - would need movement tracking)
   */
  async getBatchMovements(batchId) {
    // This would typically query a movements collection
    // For now, return empty array
    return [];
  }

  /**
   * Quarantine batch
   */
  async quarantineBatch(batchId, reason, userId) {
    try {
      const batch = await Batch.findById(batchId);
      if (!batch) {
        throw new Error('Batch not found');
      }

      batch.qualityStatus = 'QUARANTINED';
      batch.alerts.push({
        type: 'QUALITY_ISSUE',
        message: `Batch quarantined: ${reason}`,
        severity: 'HIGH',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        createdAt: new Date()
      });

      await batch.save();

      // Create alert
      const alert = new Alert({
        type: 'QUALITY_ISSUE',
        severity: 'HIGH',
        title: `Batch ${batch.batchNumber} quarantined`,
        message: `Batch has been quarantined for quality inspection. Reason: ${reason}`,
        relatedEntities: { batch: batchId },
        actions: [{
          action: 'INSPECT',
          description: 'Perform quality inspection',
          assignedTo: userId,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }]
      });

      await alert.save();

      return batch;
    } catch (error) {
      console.error('Quarantine batch error:', error);
      throw error;
    }
  }
}

export default new BatchTrackingService();