const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const blacklist = require('../utils/tokenBlacklist');
const { success, error } = require('../utils/apiResponse');
const { AUDIT_ACTIONS } = require('../utils/constants');

const MAX_FAILED = 5;
const LOCK_DURATION = 15 * 60 * 1000; // 15 min

const signAccess = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRY });

const signRefresh = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRY });

const logAudit = async (actor, action, req, meta = null) => {
  await AuditLog.create({
    actor,
    action,
    targetModel: 'User',
    targetId: actor,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
    meta,
  });
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user || !user.isActive) {
      return error(res, 'Invalid credentials', 401);
    }

    if (user.isLocked()) {
      return error(res, 'Account locked. Try again after 15 minutes.', 403);
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION);
        await user.save();
        await logAudit(user._id, AUDIT_ACTIONS.ACCOUNT_LOCKED, req);
        return error(res, 'Account locked after too many failed attempts.', 403);
      }
      await user.save();
      await logAudit(user._id, AUDIT_ACTIONS.LOGIN_FAILED, req, { attempt: user.failedAttempts });
      return error(res, 'Invalid credentials', 401);
    }

    // Reset failed attempts
    user.failedAttempts = 0;
    user.lockedUntil = null;

    // MFA required for admin and coordinator
    if (user.mfaEnabled && ['admin', 'coordinator'].includes(user.role)) {
      user.lastLogin = new Date();
      await user.save();
      return success(res, { mfaRequired: true, username: user.username }, 'MFA verification required');
    }

    user.lastLogin = new Date();
    await user.save();

    const accessToken = signAccess(user._id, user.role);
    const refreshToken = signRefresh(user._id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await logAudit(user._id, AUDIT_ACTIONS.LOGIN, req);
    return success(res, { accessToken, user: user.toSafeObject() }, 'Login successful');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.verifyMfa = async (req, res) => {
  try {
    const { username, token } = req.body;
    const user = await User.findOne({ username });
    if (!user || !user.mfaSecret) return error(res, 'Invalid request', 400);

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) return error(res, 'Invalid MFA token', 401);

    const accessToken = signAccess(user._id, user.role);
    const refreshToken = signRefresh(user._id);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return success(res, { accessToken, user: user.toSafeObject() }, 'MFA verified');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.setupMfa = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({ name: `${process.env.MFA_ISSUER}:${req.user.username}` });
    req.user.mfaSecret = secret.base32;
    await req.user.save();

    const qr = await qrcode.toDataURL(secret.otpauth_url);
    return success(res, { qr, secret: secret.base32 }, 'MFA secret generated. Scan QR with authenticator app.');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.enableMfa = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);
    if (!user.mfaSecret) return error(res, 'MFA not set up yet', 400);

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) return error(res, 'Invalid token', 401);

    user.mfaEnabled = true;
    await user.save();
    await logAudit(user._id, AUDIT_ACTIONS.MFA_ENABLED, req);
    return success(res, {}, 'MFA enabled successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.refresh = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) return error(res, 'Refresh token missing', 401);

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return error(res, 'User not found', 401);

    const accessToken = signAccess(user._id, user.role);
    return success(res, { accessToken }, 'Token refreshed');
  } catch (err) {
    return error(res, 'Invalid or expired refresh token', 401);
  }
};

exports.logout = async (req, res) => {
  try {
    blacklist.add(req.token);
    res.clearCookie('refreshToken');
    await logAudit(req.user._id, AUDIT_ACTIONS.LOGOUT, req);
    return success(res, {}, 'Logged out successfully');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return error(res, 'Current password is incorrect', 401);

    user.passwordHash = await User.hashPassword(newPassword);
    await user.save();

    blacklist.add(req.token);
    res.clearCookie('refreshToken');
    await logAudit(user._id, AUDIT_ACTIONS.PASSWORD_CHANGED, req);
    return success(res, {}, 'Password changed. Please log in again.');
  } catch (err) {
    return error(res, err.message);
  }
};
