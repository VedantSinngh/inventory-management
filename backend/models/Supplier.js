import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  contactInfo: {
    email: { type: String, required: true },
    phone: String,
    website: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  primaryContact: {
    name: String,
    title: String,
    email: String,
    phone: String
  },
  paymentTerms: {
    type: String,
    enum: ['NET_15', 'NET_30', 'NET_45', 'NET_60', 'COD', 'PREPAID'],
    default: 'NET_30'
  },
  leadTime: { type: Number, default: 7 }, // days
  minimumOrderQuantity: { type: Number, default: 1 },
  rating: { type: Number, min: 1, max: 5, default: 3 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'BLACKLISTED'], default: 'ACTIVE' },
  categories: [{ type: String }],
  apiCredentials: {
    hasApiAccess: { type: Boolean, default: false },
    apiKey: String,
    apiEndpoint: String,
    lastSync: Date
  },
  performance: {
    onTimeDelivery: { type: Number, min: 0, max: 100, default: 95 },
    qualityRating: { type: Number, min: 0, max: 100, default: 90 },
    averageOrderValue: { type: Number, default: 0 }
  },
  notes: [{ type: String, timestamp: Date }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedAt: { type: Date, default: null } // Soft delete
}, {
  timestamps: true
});

// Indexes
supplierSchema.index({ code: 1, deletedAt: 1 });
supplierSchema.index({ name: 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ categories: 1 });
supplierSchema.index({ 'contactInfo.email': 1 });

const Supplier = mongoose.model('Supplier', supplierSchema);
export default Supplier;