import mongoose from 'mongoose';

const replenishmentItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  currentStock: {
    type: Number,
    required: true
  },
  suggestedQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  approvedQuantity: {
    type: Number,
    default: null
  },
  clamped: {
    type: Boolean,
    default: false
  },
  originalQuantity: {
    type: Number,
    default: null
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  supplierName: {
    type: String,
    default: 'Unknown'
  },
  urgency: {
    type: String,
    enum: ['HIGH', 'MEDIUM', 'LOW'],
    default: 'MEDIUM'
  },
  reason: {
    type: String,
    required: true
  },
  evidenceRefs: [{
    tool: { type: String, required: true },
    metric: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed }
  }],
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, { _id: true });

const supplierEmailDraftSchema = new mongoose.Schema({
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    default: null
  },
  supplierName: {
    type: String,
    required: true
  },
  recipientEmail: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  }
}, { _id: true });

const replenishmentPlanSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'PARTIALLY_APPROVED', 'APPROVED', 'REJECTED'],
    default: 'PENDING_APPROVAL'
  },
  source: {
    type: String,
    enum: ['agent-llm', 'rule-based-fallback'],
    default: 'agent-llm'
  },
  items: [replenishmentItemSchema],
  purchaseOrderSummary: {
    type: String,
    default: ''
  },
  supplierEmailDrafts: [supplierEmailDraftSchema],
  metrics: {
    analyzedProductsCount: { type: Number, default: 0 },
    toolCallsCount: { type: Number, default: 0 },
    executionTimeMs: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    modelUsed: { type: String, default: '' },
    fallbackReason: { type: String, default: null }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

replenishmentPlanSchema.index({ createdBy: 1, createdAt: -1 });
replenishmentPlanSchema.index({ status: 1 });

const ReplenishmentPlan = mongoose.model('ReplenishmentPlan', replenishmentPlanSchema);

export default ReplenishmentPlan;
