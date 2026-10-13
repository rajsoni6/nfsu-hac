const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  placementId: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  course: {
    type: String,
    required: true,
    enum: ['MTCS', 'MTAIDS', 'BTMTCSE', 'MSCCS', 'MSCDFIS'],
  },
  batch: { type: String, required: true },
  registrationStatus: {
    type: String,
    enum: ['registered', 'deregistered', 'not_registered'],
    default: 'not_registered',
  },
  eligibilityStatus: {
    type: String,
    enum: ['eligible', 'ineligible', 'pending'],
    default: 'pending',
  },
  placementStatus: {
    type: String,
    enum: ['unplaced', 'internship_only', 'fte_only', 'internship_fte'],
    default: 'unplaced',
  },
  currentCategory: { type: String, enum: ['A+', 'A', 'B', 'C', null], default: null },
  currentPackageLPA: { type: Number, default: 0 },
  absenteeismCount: { type: Number, default: 0 },
  isExcludedFromDrives: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  remarks: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

studentSchema.index({ placementId: 1 });
studentSchema.index({ course: 1 });
studentSchema.index({ placementStatus: 1 });

module.exports = mongoose.model('Student', studentSchema);
