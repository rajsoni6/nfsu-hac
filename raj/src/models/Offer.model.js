const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  offerType: { type: String, enum: ['I', 'F', 'I+F'], required: true },
  category: { type: String, enum: ['A+', 'A', 'B', 'C'], required: true },
  stipendAmount: { type: Number, default: null },
  stipendPeriod: { type: String, default: null },
  ctcLPA: { type: Number, default: null },
  ppoStatus: {
    type: String,
    enum: ['na', 'pending', 'offered', 'accepted', 'declined'],
    default: 'na',
  },
  acceptanceStatus: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'expired'],
    default: 'pending',
  },
  joiningStatus: {
    type: String,
    enum: ['pending', 'joined', 'not_joined'],
    default: 'pending',
  },
  offerDate: { type: Date, required: true },
  acceptanceDeadline: { type: Date, required: true },
  policyCheckResult: {
    allowed: Boolean,
    reason: String,
    flags: [String],
    overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    overrideNote: { type: String, default: null },
  },
  isOffCampus: { type: Boolean, default: false },
  nocStatus: { type: String, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Immutable — prevent updates to core offer fields after creation
offerSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  const immutable = ['student', 'company', 'offerType', 'category', 'ctcLPA', 'stipendAmount', 'offerDate', 'policyCheckResult'];
  immutable.forEach(field => { delete update[field]; delete update.$set?.[field]; });
});

offerSchema.index({ student: 1 });
offerSchema.index({ company: 1 });

module.exports = mongoose.model('Offer', offerSchema);
