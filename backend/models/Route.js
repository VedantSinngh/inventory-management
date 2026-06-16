import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  fromNode: {
    type: { type: String, enum: ['WAREHOUSE', 'SUPPLIER'] },
    nodeId: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    latitude: Number,
    longitude: Number,
    address: String
  },
  toNode: {
    type: { type: String, enum: ['WAREHOUSE', 'SUPPLIER'] },
    nodeId: { type: mongoose.Schema.Types.ObjectId },
    name: String,
    latitude: Number,
    longitude: Number,
    address: String
  },
  // Routing metrics
  distance: { type: Number, required: true }, // km
  estimatedTime: { type: Number, required: true }, // minutes
  cost: { type: Number, required: true }, // currency units
  // Constraints
  carriers: [{ type: String }], // 'FEDEX', 'UPS', 'DHL', etc.
  maxWeight: { type: Number }, // kg
  maxVolume: { type: Number }, // cubic meters
  allowedDays: [{ type: String }], // 'MONDAY', 'TUESDAY', etc.
  // Performance tracking
  averageDeliveryTime: { type: Number }, // actual vs estimated
  successRate: { type: Number, min: 0, max: 100, default: 100 }, // %
  recentDelays: [{ date: Date, delayHours: Number }],
  // Optimization metrics
  costEfficiency: { type: Number, min: 0, max: 100, default: 100 },
  distanceEfficiency: { type: Number, min: 0, max: 100, default: 100 },
  // Status
  active: { type: Boolean, default: true },
  lastUsed: Date,
  usageCount: { type: Number, default: 0 },
  // Metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  deletedAt: { type: Date, default: null }
}, {
  timestamps: true
});

// Indexes
routeSchema.index({ 'fromNode.nodeId': 1, 'toNode.nodeId': 1 });
routeSchema.index({ active: 1, deletedAt: 1 });
routeSchema.index({ lastUsed: -1 });

const Route = mongoose.model('Route', routeSchema);
export default Route;
