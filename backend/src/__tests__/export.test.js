const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const { AUDIT_ACTIONS } = require('../utils/constants');

let adminToken, coordinatorToken;

const login = async (username) =>
  (await request(app).post('/api/auth/login').send({ username, password: 'Test@1234' })).body.data.accessToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({ username: /^testexport/ });

  const hash = await User.hashPassword('Test@1234');
  await User.create({ username: 'testexport_admin', passwordHash: hash, role: 'admin' });
  await User.create({ username: 'testexport_coord', passwordHash: hash, role: 'coordinator', courseAssigned: 'MTCS' });

  adminToken = await login('testexport_admin');
  coordinatorToken = await login('testexport_coord');
});

afterAll(async () => {
  await User.deleteMany({ username: /^testexport/ });
  await mongoose.disconnect();
});

describe('GET /api/students/export', () => {
  it('coordinator cannot export', async () => {
    const res = await request(app).get('/api/students/export').set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(403);
  });

  it('admin can export and receives xlsx', async () => {
    const res = await request(app).get('/api/students/export').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/spreadsheetml/);
  });

  it('export action is written to audit log', async () => {
    const before = await AuditLog.countDocuments({ action: AUDIT_ACTIONS.EXPORT_GENERATED });
    await request(app).get('/api/students/export').set('Authorization', `Bearer ${adminToken}`);
    const after = await AuditLog.countDocuments({ action: AUDIT_ACTIONS.EXPORT_GENERATED });
    expect(after).toBeGreaterThan(before);
  });
});
