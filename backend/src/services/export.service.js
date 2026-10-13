const ExcelJS = require('exceljs');
const AuditLog = require('../models/AuditLog.model');
const { AUDIT_ACTIONS } = require('../utils/constants');

const exportStudents = async (students, actor, filters, req) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Students');

  sheet.columns = [
    { header: 'Placement ID', key: 'placementId', width: 18 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Course', key: 'course', width: 12 },
    { header: 'Batch', key: 'batch', width: 10 },
    { header: 'Registration', key: 'registrationStatus', width: 16 },
    { header: 'Eligibility', key: 'eligibilityStatus', width: 14 },
    { header: 'Placement Status', key: 'placementStatus', width: 18 },
    { header: 'Category', key: 'currentCategory', width: 10 },
    { header: 'Package (LPA)', key: 'currentPackageLPA', width: 14 },
  ];

  students.forEach(s => sheet.addRow({
    placementId: s.placementId,
    name: s.name,
    course: s.course,
    batch: s.batch,
    registrationStatus: s.registrationStatus,
    eligibilityStatus: s.eligibilityStatus,
    placementStatus: s.placementStatus,
    currentCategory: s.currentCategory || 'N/A',
    currentPackageLPA: s.currentPackageLPA,
  }));

  // Audit the export
  await AuditLog.create({
    actor: actor._id,
    action: AUDIT_ACTIONS.EXPORT_GENERATED,
    targetModel: 'Student',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
    meta: { filters, rowCount: students.length },
  });

  return workbook;
};

module.exports = { exportStudents };
