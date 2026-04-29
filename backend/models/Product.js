import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true, sparse: true }, // sparse for soft delete
  category: { type: String, required: true },
  supplier: { type: String },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  deletedAt: { type: Date, default: null } // Soft delete field
}, {
  timestamps: true
});

// Indexes for performance
productSchema.index({ category: 1 });
productSchema.index({ warehouse: 1 });
productSchema.index({ sku: 1, deletedAt: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ stock: 1, lowStockThreshold: 1 }); // For low stock queries

const Product = mongoose.model('Product', productSchema);
export default Product;

