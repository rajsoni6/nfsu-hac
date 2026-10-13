require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User.model');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ username: 'admin' });
  if (existing) {
    console.log('Admin user already exists. Skipping.');
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await User.hashPassword('Admin@1234');
  await User.create({
    username: 'admin',
    passwordHash,
    role: 'admin',
    isActive: true,
  });

  console.log('✅ Admin user created');
  console.log('   Username : admin');
  console.log('   Password : Admin@1234');
  console.log('   ⚠️  Change this password immediately after first login.');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
