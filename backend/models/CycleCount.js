import mongoose from 'mongoose';

const cycleCountSchema = new mongoose.Schema({
  cycleCountId: { type: String, required: true, unique: true },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  status: {
    type: String,
    enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PLANNED'
  },
  type: {
    type: String,
    enum: ['FULL', 'PARTIAL', 'RANDOM_SAMPLE', 'ABC_ANALYSIS'],
    default: 'PARTIAL'
  },
  scope: {
    categories: [String],
    locations: [String], // aisle/shelf/bin combinations
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
  },
  scheduledDate: { type: Date, required: true },
  completedDate: { type: Date },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    location: {
      aisle: String,
      shelf: String,
      bin: String
    },
    systemQuantity: { type: Number, required: true }, // From database
    countedQuantity: { type: Number }, // Entered during count
    discrepancy: { type: Number }, // counted - system
    discrepancyReason: {
      type: String,
      enum: ['COUNTING_ERROR', 'DAMAGED', 'MISSING', 'EXTRA', 'LOCATION_ERROR', 'SYSTEM_ERROR']
    },
    notes: String,
    countedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    countedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date
  }],
  summary: {
    totalItems: { type: Number, default: 0 },
    countedItems: { type: Number, default: 0 },
    discrepanciesFound: { type: Number, default: 0 },
    totalDiscrepancyValue: { type: Number, default: 0 },
    accuracyPercentage: { type: Number, default: 0 }
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  recurrence: {
    frequency: { type: String, enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'] },
    nextScheduledDate: Date
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes
cycleCountSchema.index({ cycleCountId: 1 });
cycleCountSchema.index({ warehouse: 1 });
cycleCountSchema.index({ status: 1 });
cycleCountSchema.index({ scheduledDate: 1 });
cycleCountSchema.index({ 'recurrence.nextScheduledDate': 1 });

const CycleCount = mongoose.model('CycleCount', cycleCountSchema);
export default CycleCount;