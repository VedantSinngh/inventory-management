import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true, unique: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  manufacturingDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  quantityReceived: { type: Number, required: true },
  quantityAvailable: { type: Number, required: true, default: 0 },
  unitCost: { type: Number, required: true },
  location: {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    aisle: String,
    shelf: String,
    bin: String
  },
  qualityStatus: {
    type: String,
    enum: ['PENDING_INSPECTION', 'APPROVED', 'REJECTED', 'QUARANTINED', 'EXPIRED'],
    default: 'PENDING_INSPECTION'
  },
  serialNumbers: [String],
  certifications: [String], // e.g., ['ISO_9001', 'HACCP']
  storageConditions: {
    temperature: { min: Number, max: Number }, // Celsius
    humidity: { min: Number, max: Number },     // Percentage
    specialRequirements: [String]
  },
  fifoPosition: { type: Number }, // For FIFO tracking
  alerts: [{
    type: { type: String, enum: ['EXPIRY_WARNING', 'QUALITY_ISSUE', 'LOW_STOCK'] },
    message: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: Date,
    createdAt: { type: Date, default: Date.now }
  }],
  notes: [{ type: String, timestamp: Date }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for performance
batchSchema.index({ batchNumber: 1 });
batchSchema.index({ product: 1, expiryDate: 1 });
batchSchema.index({ supplier: 1 });
batchSchema.index({ 'location.warehouse': 1 });
batchSchema.index({ expiryDate: 1 });
batchSchema.index({ qualityStatus: 1 });
batchSchema.index({ fifoPosition: 1 });

// Pre-save middleware to set FIFO position
batchSchema.pre('save', async function(next) {
  if (this.isNew) {
    const lastBatch = await mongoose.model('Batch').findOne(
      { product: this.product },
      {},
      { sort: { fifoPosition: -1 } }
    );
    this.fifoPosition = lastBatch ? lastBatch.fifoPosition + 1 : 1;
  }
  next();
});

// Virtual for days until expiry
batchSchema.virtual('daysUntilExpiry').get(function() {
  return Math.ceil((this.expiryDate - new Date()) / (1000 * 60 * 60 * 24));
});

// Virtual for isExpired
batchSchema.virtual('isExpired').get(function() {
  return this.expiryDate < new Date();
});

const Batch = mongoose.model('Batch', batchSchema);
export default Batch;