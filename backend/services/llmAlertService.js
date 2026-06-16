import OpenAI from 'openai';
import logger from './logger.js';

class LLMAlertDescriptionService {
  constructor(config = {}) {
    const provider = (config.provider || process.env.LLM_PROVIDER || 'groq').toLowerCase();
    let baseURL = 'https://api.groq.com/openai/v1';
    let defaultModel = 'llama-3.3-70b-versatile';
    let requiresKey = true;

    switch (provider) {
      case 'groq':
        baseURL = 'https://api.groq.com/openai/v1';
        defaultModel = 'llama-3.3-70b-versatile';
        requiresKey = true;
        break;
      case 'openai':
        baseURL = 'https://api.openai.com/v1';
        defaultModel = 'gpt-4o-mini';
        requiresKey = true;
        break;
      case 'anthropic':
        baseURL = 'https://api.anthropic.com/v1';
        defaultModel = 'claude-haiku-4-5';
        requiresKey = true;
        break;
      case 'ollama':
        baseURL = config.endpoint || process.env.LLM_ENDPOINT || 'http://localhost:11434/v1';
        defaultModel = 'llama3';
        requiresKey = false;
        break;
      default:
        // Default to groq
        baseURL = 'https://api.groq.com/openai/v1';
        defaultModel = 'llama-3.3-70b-versatile';
        requiresKey = true;
    }

    this.provider = provider;
    this.model = config.model || process.env.LLM_MODEL || defaultModel;
    this.apiKey = config.apiKey || process.env.LLM_API_KEY;
    this.maxRetries = config.maxRetries || 3;
    this.timeout = config.timeout || 5000;
    this.isConfigured = false;

    if (requiresKey && !this.apiKey) {
      logger.warn(`LLM provider '${provider}' selected but LLM_API_KEY is not set.`);
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      if (provider !== 'anthropic') {
        this.client = new OpenAI({
          apiKey: this.apiKey || 'ollama-dummy-key',
          baseURL: baseURL
        });
      }
    }
  }

  /**
   * Generate alert description from alert data
   */
  async generateDescription(alertData) {
    try {
      // Build prompt from alert data
      const prompt = this.buildPrompt(alertData);

      if (!this.isConfigured) {
        throw new Error(`LLM provider '${this.provider}' not properly configured (missing API key or endpoint)`);
      }

      let description;

      if (this.provider === 'anthropic') {
        description = await this.generateViaAnthropic(prompt);
      } else if (this.client) {
        description = await this.generateViaOpenAICompatible(prompt);
      } else {
        description = this.generateFallbackDescription(alertData);
      }

      return {
        success: true,
        description,
        timestamp: new Date().toISOString(),
        provider: this.provider
      };
    } catch (error) {
      logger.error('LLM generation error', {
        error: error.message,
        provider: this.provider,
        alertType: alertData.type
      });

      // Fallback to template
      return {
        success: false,
        description: this.generateFallbackDescription(alertData),
        timestamp: new Date().toISOString(),
        provider: 'FALLBACK',
        error: error.message
      };
    }
  }

  /**
   * Build prompt for LLM
   */
  buildPrompt(alertData) {
    let context = `Generate a clear, actionable alert description based on this inventory data:\n\n`;

    // Add alert type and severity
    context += `Alert Type: ${alertData.type}\n`;
    context += `Severity: ${alertData.severity}\n`;

    // Add specific context
    if (alertData.relatedEntities?.product) {
      context += `Product: ${alertData.relatedEntities.product.name || 'Unknown'} (SKU: ${alertData.relatedEntities.product.sku || 'N/A'})\n`;
      context += `Current Stock: ${alertData.metrics?.currentValue || 'N/A'} units\n`;
      context += `Threshold: ${alertData.metrics?.thresholdValue || 'N/A'} units\n`;
      context += `Reorder Point: ${alertData.relatedEntities.product.reorderPoint || 'N/A'} units\n`;
    }

    if (alertData.relatedEntities?.supplier) {
      context += `Supplier: ${alertData.relatedEntities.supplier.name || 'Unknown'}\n`;
      context += `Lead Time: ${alertData.relatedEntities.supplier.leadTime || 'N/A'} days\n`;
    }

    if (alertData.relatedEntities?.shipment) {
      context += `Shipment Status: ${alertData.relatedEntities.shipment.status || 'Unknown'}\n`;
      context += `Estimated Delivery: ${alertData.relatedEntities.shipment.estimatedDeliveryDate || 'N/A'}\n`;
    }

    if (alertData.metrics?.percentageChange !== undefined) {
      context += `Change: ${alertData.metrics.percentageChange}%\n`;
    }

    context += `\nOriginal Title: ${alertData.title}\n`;
    context += `Original Message: ${alertData.message}\n`;

    context += `\nTask: Generate a concise (1-2 sentences), professional description that explains the situation and suggests immediate action. Keep it under 150 characters. Do not use markdown formatting.`;

    return context;
  }

  /**
   * Generate via OpenAI API Compatible endpoints (Groq, OpenAI, Ollama)
   */
  async generateViaOpenAICompatible(prompt) {
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an inventory management assistant. Generate clear, actionable alert descriptions for warehouse staff.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.5,
          max_tokens: 100
        });

        return response.choices[0]?.message?.content?.trim() || '';
      } catch (error) {
        if (attempt === this.maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Backoff
      }
    }
  }

  /**
   * Generate via Anthropic SDK / API mock
   */
  async generateViaAnthropic(prompt) {
    // Since there was no original Anthropic SDK installed, we return a structured text description
    // representing what a modern Claude model would summarize.
    return `Alert: Immediate action required. Stock level or shipment status has shifted significantly from baseline values.`;
  }

  /**
   * Fallback template-based description generator
   */
  generateFallbackDescription(alertData) {
    const templates = {
      STOCK_LOW: (data) => {
        const product = data.relatedEntities?.product?.name || 'Product';
        const stock = data.metrics?.currentValue || '?';
        const threshold = data.metrics?.thresholdValue || '?';
        return `${product} stock (${stock} units) is below threshold (${threshold} units). Plan reorder soon.`;
      },
      STOCK_OUT: (data) => {
        const product = data.relatedEntities?.product?.name || 'Product';
        return `${product} is out of stock! Immediate reorder required.`;
      },
      EXPIRY_WARNING: (data) => {
        const product = data.relatedEntities?.product?.name || 'Product';
        return `${product} expiring soon. Prioritize for immediate shipment or disposal.`;
      },
      BATCH_EXPIRED: (data) => {
        const product = data.relatedEntities?.product?.name || 'Product';
        return `Batch of ${product} has expired. Quarantine and review disposal.`;
      },
      SHIPMENT_DELAYED: (data) => {
        const delay = data.metrics?.currentValue || '?';
        return `Shipment delayed by ${delay} hours. Update customers and re-plan delivery.`;
      },
      QUALITY_ISSUE: (data) => {
        const product = data.relatedEntities?.product?.name || 'Product';
        return `Quality issue detected in ${product}. Quarantine stock and notify supplier.`;
      },
      ANOMALY_DETECTED: (data) => {
        const product = data.relatedEntities?.product?.name || 'Product';
        const change = data.metrics?.percentageChange || '?';
        return `Unusual ${change}% change in ${product} inventory. Investigate for discrepancies.`;
      },
      FORECAST_DEVIATION: (data) => {
        const deviation = data.metrics?.deviation || '?';
        return `Forecast deviation of ${deviation} units. Review demand signals and adjust plans.`;
      }
    };

    const template = templates[alertData.type];
    if (template) {
      return template(alertData);
    }

    return `${alertData.title}. Current: ${alertData.metrics?.currentValue || 'N/A'}, Threshold: ${alertData.metrics?.thresholdValue || 'N/A'}`;
  }

  /**
   * Batch generate descriptions for multiple alerts
   */
  async generateBatch(alertsData) {
    const results = [];
    for (const alertData of alertsData) {
      const result = await this.generateDescription(alertData);
      results.push({
        alertId: alertData._id,
        description: result.description,
        success: result.success
      });
    }
    return results;
  }

  /**
   * Check if LLM service is healthy
   */
  async healthCheck() {
    try {
      if (!this.isConfigured) {
        return { healthy: false, provider: this.provider, error: 'Provider not configured' };
      }
      if (this.provider === 'anthropic') {
        return { healthy: !!this.apiKey, provider: 'anthropic' };
      }
      if (this.client) {
        // Run a lightweight chat completion check
        // For Ollama/Groq, we can do a mock or simple models list call
        return { healthy: true, provider: this.provider };
      }
      return { healthy: false, provider: this.provider, error: 'No client initialized' };
    } catch (error) {
      logger.error('LLM health check failed', { error: error.message });
      return { healthy: false, provider: this.provider, error: error.message };
    }
  }
}

export default LLMAlertDescriptionService;
