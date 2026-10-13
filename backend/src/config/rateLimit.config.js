const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  // key by JWT user id in dev so all browser tabs don't share one bucket
  keyGenerator: (req) => {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    if (token) {
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return payload.id || payload._id || req.ip;
      } catch { return req.ip; }
    }
    return req.ip;
  },
  skip: (req) => process.env.NODE_ENV !== 'production' && req.path.startsWith('/dashboard'),
  message: { success: false, message: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const exportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Export limit reached. Try again after 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, exportLimiter };
