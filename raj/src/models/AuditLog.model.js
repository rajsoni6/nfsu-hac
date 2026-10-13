const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  targetModel: { type: String, required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, default: null },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, default: '' },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  meta: { type: mongoose.Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now, immutable: true },
}, {
  timestamps: false,
});

auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ targetId: 1 });

// Block all updates — append-only
auditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
  throw new Error('AuditLog records are immutable');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
