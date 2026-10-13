const cron = require('node-cron');
const Student = require('../models/Student.model');

const start = () => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const result = await Student.updateMany(
        { absenteeismCount: { $gte: 3 }, isExcludedFromDrives: false },
        { $set: { isExcludedFromDrives: true } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[Absenteeism] Excluded ${result.modifiedCount} students from drives`);
      }
    } catch (err) {
      console.error('[Absenteeism] Cron error:', err.message);
    }
  });
};

module.exports = { start };
