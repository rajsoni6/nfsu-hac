const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User.model');
const Student = require('../models/Student.model');

let adminToken, coordinatorToken, studentToken;
let adminUser, studentUser, createdStudentId;

const login = async (username) =>
  (await request(app).post('/api/auth/login').send({ username, password: 'Test@1234' })).body.data.accessToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/placement_test');
  await User.deleteMany({ username: /^teststudent/ });
  await Student.deleteMany({ batch: 'TEST2026' });

  const hash = await User.hashPassword('Test@1234');
  adminUser = await User.create({ username: 'teststudent_admin', passwordHash: hash, role: 'admin' });
  await User.create({ username: 'teststudent_coord', passwordHash: hash, role: 'coordinator', courseAssigned: 'MTCS' });

  adminToken = await login('teststudent_admin');
  coordinatorToken = await login('teststudent_coord');
});

afterAll(async () => {
  await User.deleteMany({ username: /^teststudent/ });
  await Student.deleteMany({ batch: 'TEST2026' });
  await mongoose.disconnect();
});

describe('POST /api/students', () => {
  it('admin can create student', async () => {
    const res = await request(app).post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Test Student', mobile: '9876543210', email: 'test@nfsu.ac.in', course: 'MTCS', batch: 'TEST2026' });
    expect(res.status).toBe(201);
    createdStudentId = res.body.data.student._id;
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request(app).post('/api/students')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Dup Student', mobile: '9876543211', email: 'test@nfsu.ac.in', course: 'MTCS', batch: 'TEST2026' });
    expect(res.status).toBe(409);
  });

  it('coordinator cannot create student', async () => {
    const res = await request(app).post('/api/students')
      .set('Authorization', `Bearer ${coordinatorToken}`)
      .send({ name: 'X', mobile: '9876543212', email: 'x@nfsu.ac.in', course: 'MTCS', batch: 'TEST2026' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/students', () => {
  it('admin can list students', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('students');
  });

  it('coordinator can list students', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(200);
  });
});

describe('PATCH /api/students/:id/archive', () => {
  it('admin can archive student', async () => {
    const res = await request(app).patch(`/api/students/${createdStudentId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('coordinator cannot archive student', async () => {
    const res = await request(app).patch(`/api/students/${createdStudentId}/archive`)
      .set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(403);
  });
});
