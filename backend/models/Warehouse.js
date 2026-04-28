import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number }
}, { timestamps: true });

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
export default Warehouse;
