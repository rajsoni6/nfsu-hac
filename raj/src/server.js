require('dotenv').config();
const app = require('./app');
const connect = require('./config/db');
const { start: startOfferExpiry } = require('./services/offerExpiry.service');
const { start: startAbsenteeism } = require('./services/absenteeism.service');

const PORT = process.env.PORT || 5000;

(async () => {
  await connect();
  startOfferExpiry();
  startAbsenteeism();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})();
