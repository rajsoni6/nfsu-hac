const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  category: { type: String, enum: ['A+', 'A', 'B', 'C'], required: true },
  minPackageLPA: { type: Number, required: true },
  maxPackageLPA: { type: Number, required: true },
  eligibilityCriteria: {
    minCGPA: { type: Number, default: null },
    allowedCourses: { type: [String], default: [] },
    noActiveBacklog: { type: Boolean, default: true },
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
