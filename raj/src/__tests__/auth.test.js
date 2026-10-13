const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User.model');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_test');
  await User.deleteMany({ username: /^testauth/ });
  const hash = await User.hashPassword('Test@1234');
  await User.create({ username: 'testauth_admin', passwordHash: hash, role: 'admin' });
});

afterAll(async () => {
  await User.deleteMany({ username: /^testauth/ });
  await mongoose.disconnect();
});

describe('POST /api/auth/login', () => {
  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'testauth_admin', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  it('returns accessToken on valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'testauth_admin', password: 'Test@1234' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
  });

  it('locks account after 5 failed attempts', async () => {
    const hash = await User.hashPassword('Test@1234');
    await User.create({ username: 'testauth_lockme', passwordHash: hash, role: 'student' });

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login').send({ username: 'testauth_lockme', password: 'Bad@Pass1' });
    }
    const res = await request(app).post('/api/auth/login').send({ username: 'testauth_lockme', password: 'Test@1234' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/locked/i);
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 401 when no refresh cookie', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  it('blacklists token on logout', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({ username: 'testauth_admin', password: 'Test@1234' });
    const token = loginRes.body.data.accessToken;

    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`);

    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });
});
