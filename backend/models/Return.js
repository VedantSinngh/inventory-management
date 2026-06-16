import mongoose from 'mongoose';

const returnSchema = new mongoose.Schema({
  returnNumber: { type: String, unique: true, required: true },
  originalOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  reasonCode: {
    type: String,
    enum: ['DEFECTIVE', 'WRONG_ITEM', 'BUYER_REMORSE', 'EXPIRED'],
    required: true
  },
  disposition: {
    type: String,
    enum: ['PENDING_INSPECTION', 'RESTOCKED', 'QUARANTINE', 'DISPOSED'],
    default: 'PENDING_INSPECTION'
  },
  inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  supplierLiable: { type: Boolean, default: false },
  notes: String
}, {
  timestamps: true
});

// Indexing for quick lookups
returnSchema.index({ originalOrder: 1 });
returnSchema.index({ product: 1 });
returnSchema.index({ disposition: 1 });

const Return = mongoose.model('Return', returnSchema);
export default Return;
