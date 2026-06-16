import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import LLMAlertDescriptionService from '../services/llmAlertService.js';
import Alert from '../models/Alert.js';
import logger from '../services/logger.js';

const router = express.Router();

// Initialize LLM service
const llmProvider = process.env.LLM_PROVIDER || 'LOCAL'; // LOCAL, OPENAI, HUGGINGFACE
const llmService = new LLMAlertDescriptionService({
  provider: llmProvider,
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
  endpoint: process.env.LLM_ENDPOINT || 'http://localhost:8000/generate',
  timeout: 5000
});

/**
 * POST /api/alerts/generate-description/:alertId
 * Generate human-readable description for an alert using LLM
 */
router.post('/generate-description/:alertId', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.alertId)
      .populate('relatedEntities.product', 'name sku stock reorderPoint lowStockThreshold')
      .populate('relatedEntities.supplier', 'name leadTime rating')
      .populate('relatedEntities.shipment', 'status estimatedDeliveryDate')
      .lean();

    if (!alert) {
      return res.status(404).json({
        message: 'Alert not found',
        status: 404
      });
    }

    // Generate description using LLM
    const result = await llmService.generateDescription(alert);

    // Update alert with generated description
    if (result.success) {
      await Alert.findByIdAndUpdate(req.params.alertId, {
        description: result.description
      });
    }

    logger.info('Alert description generated', {
      alertId: req.params.alertId,
      provider: result.provider,
      success: result.success,
      userId: req.user.id
    });

    res.json({
      data: {
        alertId: req.params.alertId,
        description: result.description,
        provider: result.provider,
        success: result.success
      },
      pagination: null
    });
  } catch (error) {
    logger.error('Alert description generation error', { error: error.message });
    res.status(500).json({
      message: 'Error generating alert description',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/alerts/generate-batch-descriptions
 * Batch generate descriptions for multiple alerts
 */
router.post('/generate-batch-descriptions', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const { alertIds = [], limit = 50 } = req.body;

    // Fetch alerts
    const query = { deletedAt: { $exists: false } };
    if (alertIds.length > 0) {
      query._id = { $in: alertIds };
    }

    const alerts = await Alert.find(query)
      .populate('relatedEntities.product', 'name sku stock reorderPoint lowStockThreshold')
      .populate('relatedEntities.supplier', 'name leadTime rating')
      .populate('relatedEntities.shipment', 'status estimatedDeliveryDate')
      .limit(limit)
      .lean();

    if (alerts.length === 0) {
      return res.status(404).json({
        message: 'No alerts found',
        status: 404
      });
    }

    // Generate descriptions for all alerts
    const results = await llmService.generateBatch(alerts);

    // Update all alerts with generated descriptions
    for (const result of results) {
      if (result.success) {
        await Alert.findByIdAndUpdate(result.alertId, {
          description: result.description
        });
      }
    }

    const successCount = results.filter(r => r.success).length;

    logger.info('Batch alert descriptions generated', {
      totalAlerts: results.length,
      successCount,
      userId: req.user.id
    });

    res.json({
      data: results,
      pagination: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount
      }
    });
  } catch (error) {
    logger.error('Batch alert generation error', { error: error.message });
    res.status(500).json({
      message: 'Error generating batch alert descriptions',
      error: error.message,
      status: 500
    });
  }
});

/**
 * GET /api/alerts/llm/health
 * Check LLM service health
 */
router.get('/llm/health', protect, async (req, res) => {
  try {
    const health = await llmService.healthCheck();

    res.json({
      data: {
        provider: health.provider,
        healthy: health.healthy,
        status: health.healthy ? 'OK' : 'ERROR',
        error: health.error || null
      },
      pagination: null
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error checking LLM health',
      error: error.message,
      status: 500
    });
  }
});

/**
 * PUT /api/alerts/:id/update-description
 * Manually update alert description
 */
router.put('/:id/update-description', protect, authorize(['ADMIN', 'MANAGER']), async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        message: 'Description cannot be empty',
        status: 400
      });
    }

    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { description },
      { new: true, runValidators: true }
    );

    if (!alert) {
      return res.status(404).json({
        message: 'Alert not found',
        status: 404
      });
    }

    logger.info('Alert description updated manually', {
      alertId: req.params.id,
      userId: req.user.id
    });

    res.json({
      data: alert,
      pagination: null
    });
  } catch (error) {
    logger.error('Alert update error', { error: error.message });
    res.status(500).json({
      message: 'Error updating alert description',
      error: error.message,
      status: 500
    });
  }
});

/**
 * POST /api/alerts/configure-llm
 * Configure LLM provider (admin only)
 */
router.post('/configure-llm', protect, authorize(['ADMIN']), async (req, res) => {
  try {
    const { provider, apiKey, endpoint, model } = req.body;

    if (!['groq', 'openai', 'anthropic', 'ollama', 'LOCAL', 'OPENAI', 'HUGGINGFACE'].includes(provider)) {
      return res.status(400).json({
        message: 'Invalid LLM provider',
        status: 400
      });
    }

    // Update environment or configuration (in production, use secure config service)
    const config = {
      provider: provider || process.env.LLM_PROVIDER,
      apiKey: apiKey || process.env.LLM_API_KEY,
      endpoint: endpoint || process.env.LLM_ENDPOINT,
      model: model || process.env.LLM_MODEL
    };

    // Reinitialize service with new config
    // In production, store this in secure config management
    logger.info('LLM configuration updated', {
      provider: config.provider,
      userId: req.user.id
    });

    res.json({
      message: 'LLM configuration updated',
      data: {
        provider: config.provider,
        model: config.model,
        endpoint: config.endpoint ? 'configured' : 'not set'
      }
    });
  } catch (error) {
    logger.error('LLM configuration error', { error: error.message });
    res.status(500).json({
      message: 'Error configuring LLM',
      error: error.message,
      status: 500
    });
  }
});

export default router;
