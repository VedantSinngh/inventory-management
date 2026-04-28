import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['PURCHASE', 'SALES'], required: true },
  status: { type: String, enum: ['PENDING', 'ACTIVE', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    priceAtTime: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
