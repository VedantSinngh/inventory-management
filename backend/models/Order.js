import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  type: { type: String, enum: ['PURCHASE', 'SALES'], required: true },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'PROCESSING', 'READY_FOR_SHIPMENT', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    quantity: { type: Number, required: true },
    priceAtTime: { type: Number, required: true },
    serialNumbers: [String]
  }],
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    latitude: Number,
    longitude: Number
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  shipments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' }],
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentMethod: String,
  notes: String,
  priority: {
    type: String,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date
}, {
  timestamps: true
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
