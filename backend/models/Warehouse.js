import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  capacity: { type: Number },
  zones: [{
    name: String,
    type: { type: String, enum: ['STORAGE', 'PICKING', 'PACKING', 'SHIPPING', 'RECEIVING'] },
    capacity: Number,
    aisles: [{
      name: String,
      shelves: [{
        name: String,
        bins: [{
          name: String,
          capacity: Number,
          occupied: { type: Number, default: 0 },
          products: [{
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            quantity: Number
          }]
        }]
      }]
    }]
  }],
  operatingHours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  equipment: [{
    type: { type: String, enum: ['FORKLIFT', 'PALLET_JACK', 'CONVEYOR', 'SCANNER'] },
    count: Number,
    status: { type: String, enum: ['AVAILABLE', 'IN_USE', 'MAINTENANCE'] }
  }],
  temperature: {
    min: Number,
    max: Number,
    zones: [{
      name: String,
      temperature: { min: Number, max: Number },
      products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }]
    }]
  },
  securityLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'MAXIMUM'],
    default: 'MEDIUM'
  },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null } // Soft delete field
}, { timestamps: true });

// Indexes for performance
warehouseSchema.index({ createdAt: -1 });
warehouseSchema.index({ name: 1, deletedAt: 1 });
warehouseSchema.index({ 'address.latitude': 1, 'address.longitude': 1 });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export default Warehouse;
