const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User.model');
const Student = require('../models/Student.model');

let adminToken, studentToken, recruiterToken, coordinatorToken;
let studentAId, studentBId;

const login = async (username) =>
  (await request(app).post('/api/auth/login').send({ username, password: 'Test@1234' })).body.data.accessToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({ username: /^testsec/ });
  await Student.deleteMany({ batch: 'SEC2026' });

  const hash = await User.hashPassword('Test@1234');
  const admin = await User.create({ username: 'testsec_admin', passwordHash: hash, role: 'admin' });

  const sA = await Student.create({ name: 'SecA', mobile: '9111111111', email: 'seca@nfsu.ac.in', course: 'MTCS', batch: 'SEC2026', placementId: 'MTCS-26-8001', createdBy: admin._id });
  const sB = await Student.create({ name: 'SecB', mobile: '9111111112', email: 'secb@nfsu.ac.in', course: 'MSCCS', batch: 'SEC2026', placementId: 'MSCCS-26-8002', createdBy: admin._id });
  studentAId = sA._id;
  studentBId = sB._id;

  const userA = await User.create({ username: 'testsec_studentA', passwordHash: hash, role: 'student', studentRef: studentAId });
  await User.create({ username: 'testsec_recruiter', passwordHash: hash, role: 'recruiter' });
  await User.create({ username: 'testsec_coord', passwordHash: hash, role: 'coordinator', courseAssigned: 'MTCS' });

  adminToken = await login('testsec_admin');
  studentToken = await login('testsec_studentA');
  recruiterToken = await login('testsec_recruiter');
  coordinatorToken = await login('testsec_coord');
});

afterAll(async () => {
  await User.deleteMany({ username: /^testsec/ });
  await Student.deleteMany({ batch: 'SEC2026' });
  await mongoose.disconnect();
});

describe('IDOR protection', () => {
  it('student cannot access another student record', async () => {
    const res = await request(app).get(`/api/students/${studentBId}`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
  });

  it('student cannot modify own placement status', async () => {
    const res = await request(app).put(`/api/students/${studentAId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ placementStatus: 'fte_only' });
    // Field is stripped — student record should not have fte_only
    const student = await Student.findById(studentAId);
    expect(student.placementStatus).toBe('unplaced');
  });
});

describe('RBAC enforcement', () => {
  it('recruiter cannot create offer', async () => {
    const res = await request(app).post('/api/offers').set('Authorization', `Bearer ${recruiterToken}`).send({});
    expect(res.status).toBe(403);
  });

  it('coordinator cannot access students outside own course', async () => {
    const res = await request(app).get(`/api/students/${studentBId}`).set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(403);
  });

  it('coordinator cannot view audit logs', async () => {
    const res = await request(app).get('/api/audit/logs').set('Authorization', `Bearer ${coordinatorToken}`);
    expect(res.status).toBe(403);
  });

  it('recruiter cannot view audit logs', async () => {
    const res = await request(app).get('/api/audit/logs').set('Authorization', `Bearer ${recruiterToken}`);
    expect(res.status).toBe(403);
  });
});

describe('NoSQL injection', () => {
  it('sanitizes NoSQL operator in login body', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ username: { $gt: '' }, password: 'anything' });
    expect(res.status).toBe(422); // validation rejects non-string
  });
});

describe('Unauthenticated access', () => {
  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(401);
  });
});
