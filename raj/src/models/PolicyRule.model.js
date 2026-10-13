const mongoose = require('mongoose');

const policyRuleSchema = new mongoose.Schema({
  ruleKey: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['A+', 'A', 'B', 'C', 'general'], required: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('PolicyRule', policyRuleSchema);
