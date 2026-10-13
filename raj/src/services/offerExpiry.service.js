const cron = require('node-cron');
const Offer = require('../models/Offer.model');

const start = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const result = await Offer.updateMany(
        { acceptanceStatus: 'pending', acceptanceDeadline: { $lt: new Date() } },
        { $set: { acceptanceStatus: 'expired' } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[OfferExpiry] Marked ${result.modifiedCount} offers as expired`);
      }
    } catch (err) {
      console.error('[OfferExpiry] Cron error:', err.message);
    }
  });
};

module.exports = { start };
