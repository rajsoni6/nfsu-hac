const mongoose = require('mongoose');

const recruitmentActivitySchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  driveDate: { type: Date, required: true },
  activityType: {
    type: String,
    enum: ['ppt', 'test', 'interview', 'gd', 'other'],
    required: true,
  },
  description: { type: String, default: '' },
  attendees: [{
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    present: { type: Boolean, default: false },
    excused: { type: Boolean, default: false },
    excuseNote: { type: String, default: null },
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

module.exports = mongoose.model('RecruitmentActivity', recruitmentActivitySchema);
