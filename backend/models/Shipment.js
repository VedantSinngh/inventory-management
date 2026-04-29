import mongoose from 'mongoose';

const shipmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  trackingNumber: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['PREPARING', 'READY_FOR_PICKUP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED'],
    default: 'PREPARING'
  },
  carrier: { type: String, required: true }, // e.g., 'FedEx', 'UPS', 'DHL'
  carrierTrackingUrl: { type: String },
  originAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  destinationAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  currentLocation: {
    latitude: Number,
    longitude: Number,
    timestamp: Date,
    address: String
  },
  estimatedDeliveryDate: { type: Date },
  actualDeliveryDate: { type: Date },
  weatherImpact: {
    hasImpact: { type: Boolean, default: false },
    condition: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    estimatedDelayHours: Number
  },
  route: [{
    latitude: Number,
    longitude: Number,
    timestamp: Date,
    speed: Number,
    status: String
  }],
  assignedVehicle: { type: String }, // Fleet vehicle ID
  driverInfo: {
    name: String,
    phone: String,
    vehicleNumber: String
  },
  weight: { type: Number }, // in kg
  dimensions: {
    length: Number, // cm
    width: Number,  // cm
    height: Number  // cm
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    quantity: Number,
    serialNumbers: [String]
  }],
  cost: {
    shipping: Number,
    handling: Number,
    insurance: Number,
    total: Number
  },
  notes: [{ type: String, timestamp: Date }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Indexes for performance
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ order: 1 });
shipmentSchema.index({ estimatedDeliveryDate: 1 });
shipmentSchema.index({ 'originAddress.latitude': 1, 'originAddress.longitude': 1 });
shipmentSchema.index({ 'destinationAddress.latitude': 1, 'destinationAddress.longitude': 1 });
shipmentSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

const Shipment = mongoose.model('Shipment', shipmentSchema);
export default Shipment;