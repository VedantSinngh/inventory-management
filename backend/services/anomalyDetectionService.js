import Order from '../models/Order.js';
import AuditLog from '../models/AuditLog.js';
import Product from '../models/Product.js';
import Alert from '../models/Alert.js';

class AnomalyDetectionService {
  /**
   * Detect anomalies in stock movements
   */
  async detectStockAnomalies(productId = null, options = {}) {
    const { timeRangeHours = 24, sensitivity = 'MEDIUM' } = options;

    try {
      const anomalies = [];

      // Get products to analyze
      const products = productId
        ? [await Product.findById(productId)]
        : await Product.find({ deletedAt: null }).limit(50); // Limit for performance

      for (const product of products) {
        if (!product) continue;

        const productAnomalies = await this.analyzeProductAnomalies(product, timeRangeHours, sensitivity);
        anomalies.push(...productAnomalies);
      }

      // Create alerts for detected anomalies
      const alerts = [];
      for (const anomaly of anomalies) {
        const alert = new Alert({
          type: 'ANOMALY_DETECTED',
          severity: anomaly.severity,
          title: anomaly.title,
          message: anomaly.description,
          relatedEntities: {
            product: anomaly.productId
          },
          metrics: anomaly.metrics
        });
        alerts.push(alert);
      }

      if (alerts.length > 0) {
        await Alert.insertMany(alerts);
      }

      return {
        anomalies,
        alertsCreated: alerts.length
      };

    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw new Error('Failed to detect stock anomalies');
    }
  }

  /**
   * Analyze anomalies for a specific product
   */
  async analyzeProductAnomalies(product, timeRangeHours, sensitivity) {
    const anomalies = [];
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRangeHours * 60 * 60 * 1000);

    // Get recent stock movements
    const movements = await this.getStockMovements(product._id, startTime);

    if (movements.length < 5) return anomalies; // Need minimum data

    // Calculate baseline statistics
    const quantities = movements.map(m => Math.abs(m.quantity));
    const baseline = this.calculateBaselineStats(quantities);

    // Detect various types of anomalies
    const volumeAnomalies = this.detectVolumeAnomalies(movements, baseline, sensitivity);
    const frequencyAnomalies = this.detectFrequencyAnomalies(movements, timeRangeHours, sensitivity);
    const patternAnomalies = this.detectPatternAnomalies(movements, baseline, sensitivity);

    anomalies.push(...volumeAnomalies, ...frequencyAnomalies, ...patternAnomalies);

    return anomalies.map(anomaly => ({
      ...anomaly,
      productId: product._id,
      productName: product.name,
      productSku: product.sku
    }));
  }

  /**
   * Get stock movements for a product
   */
  async getStockMovements(productId, startTime) {
    try {
      const auditLogs = await AuditLog.find({
        entityType: 'Product',
        entityId: productId,
        action: { $in: ['STOCK_IN', 'STOCK_OUT', 'TRANSFER'] },
        createdAt: { $gte: startTime }
      }).sort({ createdAt: -1 });

      const movements = [];

      for (const log of auditLogs) {
        const quantity = this.extractQuantityFromDetails(log.details);
        if (quantity !== null) {
          movements.push({
            timestamp: log.createdAt,
            action: log.action,
            quantity: quantity,
            user: log.user,
            details: log.details
          });
        }
      }

      return movements;
    } catch (error) {
      console.error('Get stock movements error:', error);
      return [];
    }
  }

  /**
   * Extract quantity from audit log details
   */
  extractQuantityFromDetails(details) {
    if (!details) return null;

    // Try different possible fields
    const possibleFields = ['quantity', 'stockChange', 'amount', 'qty'];
    for (const field of possibleFields) {
      if (details[field] && typeof details[field] === 'number') {
        return details[field];
      }
    }

    return null;
  }

  /**
   * Calculate baseline statistics
   */
  calculateBaselineStats(quantities) {
    const sorted = [...quantities].sort((a, b) => a - b);
    const mean = quantities.reduce((sum, val) => sum + val, 0) / quantities.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const stdDev = Math.sqrt(
      quantities.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / quantities.length
    );

    return {
      mean,
      median,
      stdDev,
      min: Math.min(...quantities),
      max: Math.max(...quantities),
      q1: sorted[Math.floor(sorted.length * 0.25)],
      q3: sorted[Math.floor(sorted.length * 0.75)]
    };
  }

  /**
   * Detect volume anomalies (unusually large stock movements)
   */
  detectVolumeAnomalies(movements, baseline, sensitivity) {
    const anomalies = [];
    const threshold = this.getSensitivityThreshold(sensitivity);

    for (const movement of movements) {
      const quantity = Math.abs(movement.quantity);
      const zScore = (quantity - baseline.mean) / baseline.stdDev;

      if (zScore > threshold) {
        const deviation = ((quantity - baseline.mean) / baseline.mean * 100).toFixed(1);
        anomalies.push({
          type: 'VOLUME_ANOMALY',
          severity: zScore > threshold * 1.5 ? 'HIGH' : 'MEDIUM',
          title: `Unusual stock ${movement.action.toLowerCase()} volume`,
          description: `${movement.action} of ${quantity} units (${deviation}% above normal) detected at ${movement.timestamp.toLocaleString()}`,
          timestamp: movement.timestamp,
          metrics: {
            quantity,
            baselineMean: baseline.mean,
            deviation: parseFloat(deviation),
            zScore
          }
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect frequency anomalies (unusually frequent stock movements)
   */
  detectFrequencyAnomalies(movements, timeRangeHours, sensitivity) {
    const anomalies = [];
    const threshold = this.getSensitivityThreshold(sensitivity);

    // Group movements by hour
    const hourlyMovements = {};
    movements.forEach(movement => {
      const hour = movement.timestamp.getHours();
      if (!hourlyMovements[hour]) hourlyMovements[hour] = [];
      hourlyMovements[hour].push(movement);
    });

    const avgMovementsPerHour = movements.length / timeRangeHours;
    const expectedMovements = avgMovementsPerHour;

    for (const [hour, hourMovements] of Object.entries(hourlyMovements)) {
      const movementCount = hourMovements.length;
      if (movementCount > expectedMovements * threshold) {
        anomalies.push({
          type: 'FREQUENCY_ANOMALY',
          severity: movementCount > expectedMovements * threshold * 1.5 ? 'HIGH' : 'MEDIUM',
          title: `Unusually frequent stock movements`,
          description: `${movementCount} movements in hour ${hour} (expected ~${expectedMovements.toFixed(1)})`,
          timestamp: hourMovements[0].timestamp,
          metrics: {
            actualMovements: movementCount,
            expectedMovements: expectedMovements,
            deviation: ((movementCount - expectedMovements) / expectedMovements * 100)
          }
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect pattern anomalies (unusual timing or sequences)
   */
  detectPatternAnomalies(movements, baseline, sensitivity) {
    const anomalies = [];

    // Check for unusual timing patterns
    const timeDifferences = [];
    for (let i = 1; i < movements.length; i++) {
      const diff = movements[i-1].timestamp - movements[i].timestamp;
      timeDifferences.push(diff);
    }

    if (timeDifferences.length > 0) {
      const avgTimeDiff = timeDifferences.reduce((sum, diff) => sum + diff, 0) / timeDifferences.length;
      const timeStdDev = Math.sqrt(
        timeDifferences.reduce((sum, diff) => sum + Math.pow(diff - avgTimeDiff, 2), 0) / timeDifferences.length
      );

      // Check for clustered activity
      const recentMovements = movements.slice(0, 5); // Last 5 movements
      const timeSpan = recentMovements[0].timestamp - recentMovements[recentMovements.length - 1].timestamp;
      const avgInterval = timeSpan / (recentMovements.length - 1);

      if (avgInterval < avgTimeDiff * 0.5) { // Much more frequent than usual
        anomalies.push({
          type: 'PATTERN_ANOMALY',
          severity: 'MEDIUM',
          title: `Unusual clustering of stock movements`,
          description: `Recent movements are occurring much more frequently than normal`,
          timestamp: recentMovements[0].timestamp,
          metrics: {
            recentInterval: avgInterval,
            normalInterval: avgTimeDiff,
            compressionRatio: (avgTimeDiff / avgInterval)
          }
        });
      }
    }

    // Check for unusual user activity
    const userActivity = {};
    movements.forEach(movement => {
      const userId = movement.user.toString();
      if (!userActivity[userId]) userActivity[userId] = [];
      userActivity[userId].push(movement);
    });

    const avgMovementsPerUser = movements.length / Object.keys(userActivity).length;
    for (const [userId, userMovements] of Object.entries(userActivity)) {
      if (userMovements.length > avgMovementsPerUser * 2) {
        anomalies.push({
          type: 'USER_ACTIVITY_ANOMALY',
          severity: 'LOW',
          title: `High activity from single user`,
          description: `User has performed ${userMovements.length} stock movements recently`,
          timestamp: userMovements[0].timestamp,
          metrics: {
            userMovements: userMovements.length,
            avgMovementsPerUser: avgMovementsPerUser
          }
        });
      }
    }

    return anomalies;
  }

  /**
   * Get sensitivity threshold based on setting
   */
  getSensitivityThreshold(sensitivity) {
    const thresholds = {
      'LOW': 2.0,     // 2 standard deviations
      'MEDIUM': 1.5,  // 1.5 standard deviations
      'HIGH': 1.0     // 1 standard deviation
    };
    return thresholds[sensitivity] || thresholds['MEDIUM'];
  }

  /**
   * Detect dead stock (products with no movement for extended periods)
   */
  async detectDeadStock(options = {}) {
    const { noMovementDays = 90 } = options;

    try {
      const cutoffDate = new Date(Date.now() - noMovementDays * 24 * 60 * 60 * 1000);

      // Find products with no recent audit logs
      const activeProducts = await Product.find({
        deletedAt: null,
        stock: { $gt: 0 }
      });

      const deadStock = [];

      for (const product of activeProducts) {
        const lastMovement = await AuditLog.findOne({
          entityType: 'Product',
          entityId: product._id,
          action: { $in: ['STOCK_IN', 'STOCK_OUT', 'TRANSFER'] }
        }).sort({ createdAt: -1 });

        if (!lastMovement || lastMovement.createdAt < cutoffDate) {
          const daysSinceLastMovement = lastMovement
            ? Math.floor((new Date() - lastMovement.createdAt) / (1000 * 60 * 60 * 24))
            : noMovementDays;

          deadStock.push({
            productId: product._id,
            productName: product.name,
            productSku: product.sku,
            currentStock: product.stock,
            lastMovement: lastMovement?.createdAt,
            daysSinceLastMovement,
            estimatedValue: product.stock * product.price
          });
        }
      }

      // Create alerts for dead stock
      const alerts = deadStock.map(item => ({
        type: 'DEAD_STOCK',
        severity: item.daysSinceLastMovement > 180 ? 'HIGH' : 'MEDIUM',
        title: `Dead stock detected: ${item.productName}`,
        message: `Product has not moved for ${item.daysSinceLastMovement} days. ${item.currentStock} units worth $${item.estimatedValue.toFixed(2)} may need attention.`,
        relatedEntities: { product: item.productId },
        metrics: {
          daysSinceLastMovement: item.daysSinceLastMovement,
          currentStock: item.currentStock,
          estimatedValue: item.estimatedValue
        }
      }));

      if (alerts.length > 0) {
        await Alert.insertMany(alerts);
      }

      return {
        deadStock,
        alertsCreated: alerts.length
      };

    } catch (error) {
      console.error('Dead stock detection error:', error);
      throw new Error('Failed to detect dead stock');
    }
  }

  /**
   * Run comprehensive anomaly detection
   */
  async runComprehensiveAnalysis() {
    try {
      const results = await Promise.all([
        this.detectStockAnomalies(),
        this.detectDeadStock()
      ]);

      return {
        stockAnomalies: results[0],
        deadStock: results[1],
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      throw new Error('Failed to run comprehensive analysis');
    }
  }
}

export default new AnomalyDetectionService();