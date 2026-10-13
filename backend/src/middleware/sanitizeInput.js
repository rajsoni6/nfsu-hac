const mongoSanitize = require('express-mongo-sanitize');
const xssClean = require('xss-clean');

// Export as array of middleware to be spread into app.use()
module.exports = [
  mongoSanitize({ replaceWith: '_' }),
  xssClean(),
];
