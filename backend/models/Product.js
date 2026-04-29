import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true, sparse: true }, // sparse for soft delete
  category: { type: String, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  description: String,
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, min: 0 }, // Cost from supplier
  stock: { type: Number, required: true, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 10, min: 0 },
  warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
  // Advanced inventory tracking
  batches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
  hasExpiry: { type: Boolean, default: false },
  shelfLife: { type: Number }, // days
  storageConditions: {
    temperature: { min: Number, max: Number }, // Celsius
    humidity: { min: Number, max: Number },     // Percentage
    specialRequirements: [String]
  },
  // Dimensions and weight for shipping
  dimensions: {
    length: Number, // cm
    width: Number,  // cm
    height: Number  // cm
  },
  weight: { type: Number }, // kg
  // ABC analysis classification
  abcClassification: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'C'
  },
  // Performance metrics
  turnoverRate: { type: Number, default: 0 }, // Annual turnover
  lastSold: Date,
  salesVelocity: { type: Number, default: 0 }, // Units per day
  deadStock: { type: Boolean, default: false },
  // Quality and compliance
  certifications: [String],
  qualityStandards: [String],
  // Automation flags
  autoReorder: { type: Boolean, default: false },
  reorderPoint: { type: Number, default: 0 },
  reorderQuantity: { type: Number, default: 0 },
  // Tags and attributes
  tags: [String],
  attributes: mongoose.Schema.Types.Mixed, // Flexible attributes
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
productSchema.index({ supplier: 1 });
productSchema.index({ abcClassification: 1 });
productSchema.index({ turnoverRate: -1 });
productSchema.index({ salesVelocity: -1 });
productSchema.index({ deadStock: 1 });
productSchema.index({ autoReorder: 1 });
productSchema.index({ tags: 1 });

const Product = mongoose.model('Product', productSchema);
export default Product;

