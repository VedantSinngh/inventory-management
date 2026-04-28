import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  supplier: { type: String },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, default: 10 },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);
export default Product;
