require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../models/User.model');
const Company = require('../models/Company.model');
const Student = require('../models/Student.model');
const Offer = require('../models/Offer.model');
const PolicyRule = require('../models/PolicyRule.model');
const RecruitmentActivity = require('../models/RecruitmentActivity.model');

async function upsert(Model, query, data) {
  const doc = await Model.findOne(query);
  if (doc) return doc;
  return Model.create(data);
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB\n');

  const admin = await User.findOne({ username: 'admin' });
  if (!admin) { console.error('❌ Run seed:admin first.'); await mongoose.disconnect(); process.exit(1); }

  // ── 1. COMPANIES ────────────────────────────────────────────────────────────
  console.log('── Companies ──');
  const companyDefs = [
    { name: 'TechCorp Solutions',      category: 'A+', minPackageLPA: 18, maxPackageLPA: 28, eligibilityCriteria: { minCGPA: 7.5, allowedCourses: ['MTCS','MTAIDS','BTMTCSE'], noActiveBacklog: true } },
    { name: 'Infosys Limited',         category: 'A',  minPackageLPA: 10, maxPackageLPA: 15, eligibilityCriteria: { minCGPA: 6.5, allowedCourses: ['MTCS','MTAIDS','BTMTCSE','MSCCS'], noActiveBacklog: true } },
    { name: 'Wipro Technologies',      category: 'B',  minPackageLPA: 6,  maxPackageLPA: 9,  eligibilityCriteria: { minCGPA: 6.0, allowedCourses: ['MTCS','MSCCS','MSCDFIS'], noActiveBacklog: false } },
    { name: 'StartupXYZ',              category: 'C',  minPackageLPA: 3,  maxPackageLPA: 5,  eligibilityCriteria: { minCGPA: null, allowedCourses: [], noActiveBacklog: false } },
    { name: 'CyberShield Inc.',        category: 'A',  minPackageLPA: 12, maxPackageLPA: 16, eligibilityCriteria: { minCGPA: 7.0, allowedCourses: ['MSCDFIS','MTCS'], noActiveBacklog: true } },
    { name: 'DataVision Analytics',    category: 'A+', minPackageLPA: 20, maxPackageLPA: 32, eligibilityCriteria: { minCGPA: 8.0, allowedCourses: ['MTAIDS','MTCS'], noActiveBacklog: true } },
    { name: 'SecureNet Systems',       category: 'B',  minPackageLPA: 7,  maxPackageLPA: 9,  eligibilityCriteria: { minCGPA: 6.0, allowedCourses: ['MSCDFIS','MSCCS'], noActiveBacklog: false } },
    { name: 'CloudBase Pvt Ltd',       category: 'A',  minPackageLPA: 11, maxPackageLPA: 14, eligibilityCriteria: { minCGPA: 7.0, allowedCourses: ['MTCS','BTMTCSE','MSCCS'], noActiveBacklog: true } },
    { name: 'ForensicTech Labs',       category: 'B',  minPackageLPA: 6,  maxPackageLPA: 8,  eligibilityCriteria: { minCGPA: 6.5, allowedCourses: ['MSCDFIS'], noActiveBacklog: false } },
    { name: 'GlobalSoft Infotech',     category: 'C',  minPackageLPA: 4,  maxPackageLPA: 6,  eligibilityCriteria: { minCGPA: null, allowedCourses: [], noActiveBacklog: false } },
  ];

  const companies = {};
  for (const c of companyDefs) {
    const doc = await upsert(Company, { name: c.name }, { ...c, createdBy: admin._id });
    companies[c.name] = doc;
    console.log(`  ✓ ${c.name} [${c.category}]`);
  }

  // ── 2. COORDINATOR & RECRUITER USERS ────────────────────────────────────────
  console.log('\n── Users ──');
  const coordDefs = [
    { username: 'coord_mtcs',    course: 'MTCS' },
    { username: 'coord_mtaids',  course: 'MTAIDS' },
    { username: 'coord_mscdfis', course: 'MSCDFIS' },
    { username: 'coord_msccs',   course: 'MSCCS' },
    { username: 'coord_btmtcse', course: 'BTMTCSE' },
  ];
  for (const c of coordDefs) {
    await upsert(User, { username: c.username }, {
      username: c.username, passwordHash: await User.hashPassword('Coord@1234'),
      role: 'coordinator', courseAssigned: c.course, isActive: true,
    });
    console.log(`  ✓ ${c.username}`);
  }

  const recruiterDefs = [
    { username: 'recruiter_techcorp',   company: 'TechCorp Solutions' },
    { username: 'recruiter_infosys',    company: 'Infosys Limited' },
    { username: 'recruiter_cybershield',company: 'CyberShield Inc.' },
  ];
  for (const r of recruiterDefs) {
    await upsert(User, { username: r.username }, {
      username: r.username, passwordHash: await User.hashPassword('Recruit@1234'),
      role: 'recruiter', companyAssigned: companies[r.company]._id, isActive: true,
    });
    console.log(`  ✓ ${r.username}`);
  }

  // ── 3. STUDENTS ─────────────────────────────────────────────────────────────
  console.log('\n── Students ──');
  const studentDefs = [
    // MTCS
    { placementId:'NFSU-2627-MTCS-001', name:'Arjun Sharma',    mobile:'9876543210', email:'arjun.sharma@nfsu.ac.in',    course:'MTCS',    batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'fte_only',       currentCategory:'A+', currentPackageLPA:22 },
    { placementId:'NFSU-2627-MTCS-002', name:'Priya Patel',     mobile:'9876543211', email:'priya.patel@nfsu.ac.in',     course:'MTCS',    batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'internship_only',currentCategory:'B',  currentPackageLPA:0  },
    { placementId:'NFSU-2627-MTCS-003', name:'Divya Nair',      mobile:'9876543217', email:'divya.nair@nfsu.ac.in',      course:'MTCS',    batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'ineligible', placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
    { placementId:'NFSU-2627-MTCS-004', name:'Rahul Desai',     mobile:'9876543220', email:'rahul.desai@nfsu.ac.in',     course:'MTCS',    batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'internship_fte', currentCategory:'A',  currentPackageLPA:13 },
    { placementId:'NFSU-2627-MTCS-005', name:'Neha Kulkarni',   mobile:'9876543221', email:'neha.kulkarni@nfsu.ac.in',   course:'MTCS',    batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
    // MTAIDS
    { placementId:'NFSU-2627-MTAIDS-001', name:'Rohan Mehta',   mobile:'9876543212', email:'rohan.mehta@nfsu.ac.in',     course:'MTAIDS',  batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'fte_only',       currentCategory:'A+', currentPackageLPA:25 },
    { placementId:'NFSU-2627-MTAIDS-002', name:'Simran Kaur',   mobile:'9876543222', email:'simran.kaur@nfsu.ac.in',     course:'MTAIDS',  batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
    { placementId:'NFSU-2627-MTAIDS-003', name:'Aditya Rao',    mobile:'9876543223', email:'aditya.rao@nfsu.ac.in',      course:'MTAIDS',  batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'internship_only',currentCategory:'A',  currentPackageLPA:0  },
    // BTMTCSE
    { placementId:'NFSU-2627-BTMTCSE-001', name:'Sneha Gupta',  mobile:'9876543213', email:'sneha.gupta@nfsu.ac.in',     course:'BTMTCSE', batch:'2020-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'fte_only',       currentCategory:'A',  currentPackageLPA:14 },
    { placementId:'NFSU-2627-BTMTCSE-002', name:'Manish Tiwari',mobile:'9876543224', email:'manish.tiwari@nfsu.ac.in',   course:'BTMTCSE', batch:'2020-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
    // MSCCS
    { placementId:'NFSU-2627-MSCCS-001', name:'Vikram Singh',   mobile:'9876543214', email:'vikram.singh@nfsu.ac.in',    course:'MSCCS',   batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'pending',    placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
    { placementId:'NFSU-2627-MSCCS-002', name:'Pooja Sharma',   mobile:'9876543225', email:'pooja.sharma@nfsu.ac.in',    course:'MSCCS',   batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'internship_only',currentCategory:'C',  currentPackageLPA:0  },
    { placementId:'NFSU-2627-MSCCS-003', name:'Amit Jain',      mobile:'9876543226', email:'amit.jain@nfsu.ac.in',       course:'MSCCS',   batch:'2024-26', registrationStatus:'not_registered', eligibilityStatus:'pending',    placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
    // MSCDFIS
    { placementId:'NFSU-2627-MSCDFIS-001', name:'Ananya Joshi', mobile:'9876543215', email:'ananya.joshi@nfsu.ac.in',    course:'MSCDFIS', batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'fte_only',       currentCategory:'A',  currentPackageLPA:12 },
    { placementId:'NFSU-2627-MSCDFIS-002', name:'Karan Verma',  mobile:'9876543216', email:'karan.verma@nfsu.ac.in',     course:'MSCDFIS', batch:'2024-26', registrationStatus:'not_registered', eligibilityStatus:'pending',    placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
    { placementId:'NFSU-2627-MSCDFIS-003', name:'Riya Menon',   mobile:'9876543227', email:'riya.menon@nfsu.ac.in',      course:'MSCDFIS', batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'internship_only',currentCategory:'B',  currentPackageLPA:0  },
    { placementId:'NFSU-2627-MSCDFIS-004', name:'Suresh Pillai',mobile:'9876543228', email:'suresh.pillai@nfsu.ac.in',   course:'MSCDFIS', batch:'2024-26', registrationStatus:'registered',     eligibilityStatus:'eligible',   placementStatus:'unplaced',       currentCategory:null, currentPackageLPA:0  },
  ];

  const students = {};
  for (const s of studentDefs) {
    const doc = await upsert(Student, { placementId: s.placementId }, { ...s, createdBy: admin._id });
    students[s.placementId] = doc;
    console.log(`  ✓ ${s.name} [${s.course}] — ${s.placementStatus}`);
  }

  // ── 4. STUDENT LOGIN USERS ───────────────────────────────────────────────────
  console.log('\n── Student login users ──');
  for (const s of Object.values(students)) {
    const uname = s.email.split('@')[0];
    await upsert(User, { username: uname }, {
      username: uname, passwordHash: await User.hashPassword('Student@1234'),
      role: 'student', studentRef: s._id, isActive: true,
    });
    console.log(`  ✓ ${uname}`);
  }

  // ── 5. OFFERS ────────────────────────────────────────────────────────────────
  console.log('\n── Offers ──');
  const offerDefs = [
    // Arjun — A+ FTE accepted + joined
    { pid:'NFSU-2627-MTCS-001', company:'TechCorp Solutions',   offerType:'F',   ctcLPA:22, stipendAmount:null, offerDate:'2025-01-10', acceptanceDeadline:'2025-01-11', acceptanceStatus:'accepted', joiningStatus:'joined' },
    // Rohan — A+ FTE accepted + joined
    { pid:'NFSU-2627-MTAIDS-001', company:'DataVision Analytics', offerType:'F', ctcLPA:25, stipendAmount:null, offerDate:'2025-01-12', acceptanceDeadline:'2025-01-13', acceptanceStatus:'accepted', joiningStatus:'joined' },
    // Rahul — A I+F accepted
    { pid:'NFSU-2627-MTCS-004', company:'Infosys Limited',      offerType:'I+F', ctcLPA:13, stipendAmount:35000, offerDate:'2025-01-15', acceptanceDeadline:'2025-01-16', acceptanceStatus:'accepted', joiningStatus:'joined' },
    // Sneha — A FTE accepted
    { pid:'NFSU-2627-BTMTCSE-001', company:'CloudBase Pvt Ltd', offerType:'F',  ctcLPA:14, stipendAmount:null, offerDate:'2025-01-18', acceptanceDeadline:'2025-01-19', acceptanceStatus:'accepted', joiningStatus:'pending' },
    // Ananya — A FTE accepted
    { pid:'NFSU-2627-MSCDFIS-001', company:'CyberShield Inc.',  offerType:'F',  ctcLPA:12, stipendAmount:null, offerDate:'2025-01-20', acceptanceDeadline:'2025-01-21', acceptanceStatus:'accepted', joiningStatus:'pending' },
    // Priya — B internship accepted
    { pid:'NFSU-2627-MTCS-002', company:'Wipro Technologies',   offerType:'I',  ctcLPA:null, stipendAmount:25000, offerDate:'2025-01-22', acceptanceDeadline:'2025-01-23', acceptanceStatus:'accepted', joiningStatus:'joined' },
    // Aditya — A internship accepted
    { pid:'NFSU-2627-MTAIDS-003', company:'Infosys Limited',    offerType:'I',  ctcLPA:null, stipendAmount:40000, offerDate:'2025-01-25', acceptanceDeadline:'2025-01-26', acceptanceStatus:'accepted', joiningStatus:'pending' },
    // Pooja — C internship accepted
    { pid:'NFSU-2627-MSCCS-002', company:'GlobalSoft Infotech', offerType:'I',  ctcLPA:null, stipendAmount:18000, offerDate:'2025-01-28', acceptanceDeadline:'2025-01-29', acceptanceStatus:'accepted', joiningStatus:'pending' },
    // Riya — B internship accepted
    { pid:'NFSU-2627-MSCDFIS-003', company:'ForensicTech Labs', offerType:'I',  ctcLPA:null, stipendAmount:22000, offerDate:'2025-02-01', acceptanceDeadline:'2025-02-02', acceptanceStatus:'accepted', joiningStatus:'pending' },
    // Neha — pending offer
    { pid:'NFSU-2627-MTCS-005', company:'Wipro Technologies',   offerType:'F',  ctcLPA:7.5, stipendAmount:null, offerDate:'2025-02-05', acceptanceDeadline:'2025-02-06', acceptanceStatus:'pending', joiningStatus:'pending' },
    // Simran — pending offer
    { pid:'NFSU-2627-MTAIDS-002', company:'TechCorp Solutions', offerType:'F',  ctcLPA:20, stipendAmount:null, offerDate:'2025-02-08', acceptanceDeadline:'2025-02-09', acceptanceStatus:'pending', joiningStatus:'pending' },
    // Manish — declined offer
    { pid:'NFSU-2627-BTMTCSE-002', company:'StartupXYZ',        offerType:'F',  ctcLPA:4.5, stipendAmount:null, offerDate:'2025-01-30', acceptanceDeadline:'2025-01-31', acceptanceStatus:'declined', joiningStatus:'pending' },
  ];

  for (const o of offerDefs) {
    const student = students[o.pid];
    const company = companies[o.company];
    if (!student || !company) { console.log(`  ⚠ Skipping offer — missing student/company for ${o.pid}`); continue; }
    const exists = await Offer.findOne({ student: student._id, company: company._id, offerType: o.offerType });
    if (exists) { console.log(`  ~ Offer exists: ${student.name} @ ${o.company}`); continue; }
    await Offer.create({
      student: student._id, company: company._id,
      offerType: o.offerType, category: company.category,
      ctcLPA: o.ctcLPA || null, stipendAmount: o.stipendAmount || null,
      offerDate: new Date(o.offerDate), acceptanceDeadline: new Date(o.acceptanceDeadline),
      acceptanceStatus: o.acceptanceStatus, joiningStatus: o.joiningStatus,
      policyCheckResult: { allowed: true, reason: 'All policy checks passed.', flags: [] },
      createdBy: admin._id,
    });
    console.log(`  ✓ ${student.name} ← ${o.company} [${o.offerType}] ${o.acceptanceStatus}`);
  }

  // ── 6. POLICY RULES ──────────────────────────────────────────────────────────
  console.log('\n── Policy Rules ──');
  const ruleDefs = [
    { ruleKey:'A_PLUS_NO_SWITCH',   description:'A+ category students exit placement — no further switching allowed.',                                    category:'A+',      value:{ switchAllowed: false },                    isActive:true },
    { ruleKey:'A_SWITCH_TO_APLUS',  description:'A category students may only switch to A+ companies.',                                                   category:'A',       value:{ allowedUpgradeTo: ['A+'] },                isActive:true },
    { ruleKey:'B_SWITCH_1_5X',      description:'B category students may switch if new package is ≥ 1.5× current package.',                               category:'B',       value:{ multiplier: 1.5 },                         isActive:true },
    { ruleKey:'C_OPEN_SWITCH',      description:'C category students are eligible for all higher-category opportunities.',                                 category:'C',       value:{ switchAllowed: true },                     isActive:true },
    { ruleKey:'OFFER_TYPE_I_RULE',  description:'Student with Internship offer can only apply for F or I+F roles next.',                                  category:'general', value:{ currentStatus:'internship_only', allowed:['F','I+F'] }, isActive:true },
    { ruleKey:'OFFER_TYPE_F_RULE',  description:'Student with FTE offer can only apply for Internship roles next.',                                        category:'general', value:{ currentStatus:'fte_only', allowed:['I'] },  isActive:true },
    { ruleKey:'IF_NO_FURTHER',      description:'Student with I+F offer cannot participate further in placement.',                                         category:'general', value:{ currentStatus:'internship_fte', allowed:[] },isActive:true },
    { ruleKey:'ABSENTEEISM_LIMIT',  description:'Students absent from 3 or more drives without excuse are excluded from further drives.',                  category:'general', value:{ maxAbsences: 3 },                          isActive:true },
    { ruleKey:'OFFER_DEADLINE_HRS', description:'Offer acceptance deadline is 24 hours from offer date unless company specifies otherwise.',               category:'general', value:{ defaultHours: 24 },                        isActive:true },
    { ruleKey:'REGISTRATION_REQ',   description:'Only students with registrationStatus=registered are eligible to receive offers.',                        category:'general', value:{ requiredStatus:'registered' },             isActive:true },
  ];

  for (const r of ruleDefs) {
    await upsert(PolicyRule, { ruleKey: r.ruleKey }, { ...r, updatedBy: admin._id });
    console.log(`  ✓ ${r.ruleKey}`);
  }

  // ── 7. RECRUITMENT DRIVES ────────────────────────────────────────────────────
  console.log('\n── Recruitment Drives ──');
  const allStudentIds = Object.values(students).map(s => s._id);

  const driveDefs = [
    { company:'TechCorp Solutions',   driveDate:'2024-12-10', activityType:'test',      studentIds: allStudentIds.slice(0,8) },
    { company:'Infosys Limited',      driveDate:'2024-12-15', activityType:'interview', studentIds: allStudentIds.slice(0,10) },
    { company:'CyberShield Inc.',     driveDate:'2024-12-20', activityType:'interview', studentIds: allStudentIds.slice(5,12) },
    { company:'DataVision Analytics', driveDate:'2025-01-05', activityType:'test',      studentIds: allStudentIds.slice(0,6) },
    { company:'Wipro Technologies',   driveDate:'2025-01-08', activityType:'ppt',       studentIds: allStudentIds.slice(3,14) },
  ];

  for (const d of driveDefs) {
    const company = companies[d.company];
    const exists = await RecruitmentActivity.findOne({ company: company._id, driveDate: new Date(d.driveDate) });
    if (exists) { console.log(`  ~ Drive exists: ${d.company} ${d.driveDate}`); continue; }

    const attendees = d.studentIds.map((id, i) => ({
      student: id,
      present: i % 3 !== 0,   // every 3rd student absent
      excused: false,
      excuseNote: null,
    }));

    await RecruitmentActivity.create({
      company: company._id, driveDate: new Date(d.driveDate),
      activityType: d.activityType, attendees, createdBy: admin._id,
    });
    console.log(`  ✓ ${d.company} — ${d.driveDate} (${attendees.length} students)`);
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────────
  console.log('\n✅ Demo seed complete.\n');
  console.log('── Login Credentials ──────────────────────────────────────────');
  console.log('  admin                  / Admin@1234   (full access)');
  console.log('  coord_mtcs             / Coord@1234   (MTCS coordinator)');
  console.log('  coord_mscdfis          / Coord@1234   (MSCDFIS coordinator)');
  console.log('  recruiter_techcorp     / Recruit@1234 (TechCorp recruiter)');
  console.log('  arjun.sharma           / Student@1234 (MTCS — FTE placed A+)');
  console.log('  ananya.joshi           / Student@1234 (MSCDFIS — FTE placed A)');
  console.log('  priya.patel            / Student@1234 (MTCS — Internship only)');
  console.log('  vikram.singh           / Student@1234 (MSCCS — Unplaced)');
  console.log('───────────────────────────────────────────────────────────────');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
