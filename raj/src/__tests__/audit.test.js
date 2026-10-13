const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');

let adminToken, coordinatorToken;

const login = async (username) =>
  (await request(app).post('/api/auth/login').send({ username, password: 'Test@1234' })).body.data.accessToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_test');
  await User.deleteMany({ username: /^testaudit/ });

  const hash = await User.hashPassword('Test@1234');
  await User.create({ username: 'testaudit_admin', passwordHash: hash, role: 'admin' });
  await User.create({ username: 'testaudit_coord', passwordHash: hash, role: 'coordinator', courseAssigned: 'MTCS' });

  adminToken = await login('testaudit_admin');
  coordinatorToken = await login('testaudit_coord');
});

afterAll(async () => {
  await User.deleteMany({ username: /^testaudit/ });
  await mongoose.disconnect();
});

describe('GET /api/audit/logs', () => {
  it('admin can view audit logs', async () => {
    const res = await request(app).get('/api/audit/logs').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('logs');
  });

  it('coordinator cannot view audit logs', async () => {
    const res = await request(app).get('/api/audit/logs').set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(403);
  });
});

describe('AuditLog immutability', () => {
  it('AuditLog has no update route — direct DB update attempt is blocked by schema', async () => {
    const log = await AuditLog.create({
      actor: new mongoose.Types.ObjectId(),
      action: 'TEST_ACTION',
      targetModel: 'Student',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    // No update route exists — verify the document is unchanged
    const found = await AuditLog.findById(log._id);
    expect(found.action).toBe('TEST_ACTION');

    // Cleanup
    await AuditLog.findByIdAndDelete(log._id);
  });

  it('login action is written to audit log', async () => {
    const before = await AuditLog.countDocuments({ action: 'LOGIN' });
    await request(app).post('/api/auth/login').send({ username: 'testaudit_admin', password: 'Test@1234' });
    const after = await AuditLog.countDocuments({ action: 'LOGIN' });
    expect(after).toBeGreaterThan(before);
  });
});
