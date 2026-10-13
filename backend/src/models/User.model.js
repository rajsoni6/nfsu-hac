const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student', 'coordinator', 'recruiter'], required: true },
  courseAssigned: { type: String, default: null },   // coordinator only
  companyAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', default: null }, // recruiter only
  studentRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },      // student only
  mfaSecret: { type: String, default: null },
  mfaEnabled: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  failedAttempts: { type: Number, default: 0 },
  lockedUntil: { type: Date, default: null },
}, { timestamps: true });

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isLocked = function () {
  return this.lockedUntil && this.lockedUntil > Date.now();
};

userSchema.statics.hashPassword = async (plain) => {
  return bcrypt.hash(plain, parseInt(process.env.BCRYPT_ROUNDS) || 12);
};

// Never return sensitive fields
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.mfaSecret;
  delete obj.failedAttempts;
  delete obj.lockedUntil;
  return obj;
};

// Minimal safe object for JWT response (includes studentRef for student role)
userSchema.methods.toAuthObject = function () {
  return {
    _id: this._id,
    username: this.username,
    role: this.role,
    studentRef: this.studentRef || null,
    courseAssigned: this.courseAssigned || null,
    companyAssigned: this.companyAssigned || null,
  };
};

module.exports = mongoose.model('User', userSchema);
