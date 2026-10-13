const { error } = require('../utils/apiResponse');

module.exports = (req, res, next) => {
  if (!req.session) return next();

  const now = Date.now();
  const TIMEOUT = 15 * 60 * 1000;

  if (req.session.lastActivity && now - req.session.lastActivity > TIMEOUT) {
    req.session.destroy();
    return error(res, 'Session expired. Please log in again.', 401);
  }

  // Basic hijack detection: IP mismatch
  if (req.session.ip && req.session.ip !== req.ip) {
    req.session.destroy();
    return error(res, 'Session invalid. Please log in again.', 401);
  }

  req.session.lastActivity = now;
  if (!req.session.ip) req.session.ip = req.ip;

  next();
};
