const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User.model');
const Student = require('../models/Student.model');
const Company = require('../models/Company.model');

let adminToken, recruiterToken, studentToken;
let studentId, companyId, offerId, studentUserId;

const login = async (username) =>
  (await request(app).post('/api/auth/login').send({ username, password: 'Test@1234' })).body.data.accessToken;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await User.deleteMany({ username: /^testoffer/ });
  await Student.deleteMany({ batch: 'OFFER2026' });
  await Company.deleteMany({ name: 'OfferTestCo' });

  const hash = await User.hashPassword('Test@1234');
  const admin = await User.create({ username: 'testoffer_admin', passwordHash: hash, role: 'admin' });
  const recruiter = await User.create({ username: 'testoffer_recruiter', passwordHash: hash, role: 'recruiter' });

  adminToken = await login('testoffer_admin');
  recruiterToken = await login('testoffer_recruiter');

  const student = await Student.create({
    name: 'Offer Student', mobile: '9000000001', email: 'offerstudent@nfsu.ac.in',
    course: 'MTCS', batch: 'OFFER2026', placementId: 'MTCS-26-9001',
    registrationStatus: 'registered', eligibilityStatus: 'eligible',
    createdBy: admin._id,
  });
  studentId = student._id;

  const company = await Company.create({
    name: 'OfferTestCo', category: 'A', minPackageLPA: 12, maxPackageLPA: 16, isActive: true, createdBy: admin._id,
  });
  companyId = company._id;

  const studentUserDoc = await User.create({
    username: 'testoffer_student', passwordHash: hash, role: 'student', studentRef: studentId,
  });
  studentToken = await login('testoffer_student');
});

afterAll(async () => {
  await User.deleteMany({ username: /^testoffer/ });
  await Student.deleteMany({ batch: 'OFFER2026' });
  await Company.deleteMany({ name: 'OfferTestCo' });
  await mongoose.disconnect();
});

describe('POST /api/offers', () => {
  it('recruiter cannot create offer', async () => {
    const res = await request(app).post('/api/offers').set('Authorization', `Bearer ${recruiterToken}`)
      .send({ student: studentId, company: companyId, offerType: 'F', ctcLPA: 12, offerDate: new Date(), acceptanceDeadline: new Date(Date.now() + 86400000) });
    expect(res.status).toBe(403);
  });

  it('admin can create offer and policy passes', async () => {
    const res = await request(app).post('/api/offers').set('Authorization', `Bearer ${adminToken}`)
      .send({
        student: studentId, company: companyId, offerType: 'F', ctcLPA: 12,
        offerDate: new Date().toISOString(),
        acceptanceDeadline: new Date(Date.now() + 86400000).toISOString(),
      });
    expect(res.status).toBe(201);
    offerId = res.body.data.offer._id;
  });
});

describe('GET /api/offers/:id', () => {
  it('student can view own offer', async () => {
    const res = await request(app).get(`/api/offers/${offerId}`).set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(200);
  });
});

describe('POST /api/offers/:id/override', () => {
  it('requires overrideNote of min 10 chars', async () => {
    const res = await request(app).post(`/api/offers/${offerId}/override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ overrideNote: 'short' });
    expect(res.status).toBe(422);
  });

  it('admin can override policy', async () => {
    const res = await request(app).post(`/api/offers/${offerId}/override`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ overrideNote: 'Manual override approved by placement officer.' });
    expect(res.status).toBe(200);
  });
});
