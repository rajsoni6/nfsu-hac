// In-memory blacklist — replace with Redis for production horizontal scaling
const blacklist = new Set();

const add = (token) => blacklist.add(token);

const has = (token) => blacklist.has(token);

// Prune expired tokens every hour to prevent memory leak
setInterval(() => {
  const jwt = require('jsonwebtoken');
  for (const token of blacklist) {
    try {
      jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') blacklist.delete(token);
    }
  }
}, 60 * 60 * 1000);

module.exports = { add, has };
