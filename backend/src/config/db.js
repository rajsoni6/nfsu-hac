const mongoose = require('mongoose');

const connect = async () => {
  const uri = process.env.MONGODB_URI;
  let attempts = 0;
  const MAX = 5;

  while (attempts < MAX) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log('MongoDB connected');
      return;
    } catch (err) {
      attempts++;
      console.error(`MongoDB connection attempt ${attempts} failed: ${err.message}`);
      if (attempts >= MAX) throw new Error('MongoDB connection failed after max retries');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

module.exports = connect;
