import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'STOCK_IN', 'STOCK_OUT', 'TRANSFER'], required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

// Indexes for audit log queries - critical for performance
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 }); // For time-range queries

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;

