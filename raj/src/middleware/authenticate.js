const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const blacklist = require('../utils/tokenBlacklist');
const { error } = require('../utils/apiResponse');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authentication required', 401);
  }

  const token = authHeader.split(' ')[1];

  if (blacklist.has(token)) {
    return error(res, 'Token has been revoked', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash -mfaSecret');

    if (!user || !user.isActive) {
      return error(res, 'User not found or inactive', 401);
    }

    if (user.isLocked()) {
      return error(res, 'Account is locked. Try again later.', 403);
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return error(res, 'Token expired', 401);
    return error(res, 'Invalid token', 401);
  }
};
