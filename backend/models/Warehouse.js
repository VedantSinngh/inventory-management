import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number },
  deletedAt: { type: Date, default: null } // Soft delete field
}, { timestamps: true });

// Indexes for performance
warehouseSchema.index({ createdAt: -1 });
warehouseSchema.index({ name: 1, deletedAt: 1 });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export default Warehouse;
