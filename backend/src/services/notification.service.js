// Notification service — stubbed. Wire to email/SMS provider in future scope.
const winston = require('winston');
const logger = winston.createLogger({
  transports: [new winston.transports.Console({ silent: process.env.NODE_ENV === 'test' })],
});

/**
 * Notify relevant parties of a policy flag or offer deadline.
 * @param {string} type - 'POLICY_FLAG' | 'OFFER_DEADLINE' | 'ACCOUNT_LOCKED'
 * @param {Object} payload
 */
const notify = (type, payload) => {
  logger.info(`[Notification] ${type}`, payload);
  // TODO: integrate with email/SMS provider
};

module.exports = { notify };
