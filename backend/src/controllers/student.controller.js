const Student = require('../models/Student.model');
const User = require('../models/User.model');
const AuditLog = require('../models/AuditLog.model');
const { generateUnique } = require('../utils/placementId');
const { exportStudents } = require('../services/export.service');
const { success, error } = require('../utils/apiResponse');
const { AUDIT_ACTIONS } = require('../utils/constants');

const auditLog = async (actor, action, req, before = null, after = null, targetId = null) => {
  await AuditLog.create({
    actor: actor._id,
    action,
    targetModel: 'Student',
    targetId,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || '',
    before,
    after,
  });
};

exports.getMe = async (req, res) => {
  try {
    if (!req.user.studentRef) return error(res, 'No student profile linked', 404);
    const student = await Student.findById(req.user.studentRef);
    if (!student || student.isArchived) return error(res, 'Student not found', 404);
    return success(res, { student: student.toObject() });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getAll = async (req, res) => {
  try {
    const filter = { isArchived: false };

    // Coordinator can only see own course
    if (req.user.role === 'coordinator') {
      filter.course = req.user.courseAssigned;
    }

    const { course, status, search, page = 1, limit = 20 } = req.query;
    if (course) filter.course = course;
    if (status) filter.placementStatus = status;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { placementId: { $regex: search, $options: 'i' } },
    ];

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [students, total] = await Promise.all([
      Student.find(filter).select('-mobile -email').skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }),
      Student.countDocuments(filter),
    ]);

    return success(res, { students, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getOne = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.isArchived) return error(res, 'Student not found', 404);

    // Student can only view own record
    if (req.user.role === 'student') {
      if (!req.user.studentRef || req.user.studentRef.toString() !== student._id.toString()) {
        return error(res, 'Access denied', 403);
      }
    }

    // Coordinator can only view own course
    if (req.user.role === 'coordinator' && student.course !== req.user.courseAssigned) {
      return error(res, 'Access denied', 403);
    }

    // Mask PII for non-admin/coordinator roles
    const data = student.toObject();
    if (!['admin', 'coordinator'].includes(req.user.role)) {
      delete data.mobile;
      delete data.email;
    } else {
      // Log PII access
      await auditLog(req.user, AUDIT_ACTIONS.PII_VIEWED, req, null, null, student._id);
    }

    return success(res, { student: data });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const { password, ...studentData } = req.body;
    const placementId = await generateUnique(studentData.course, studentData.batch);

    // Derive a username from email (part before @)
    const username = studentData.email.split('@')[0].toLowerCase();
    const existing = await User.findOne({ username });
    if (existing) return error(res, `Username '${username}' already exists`, 409);

    const student = await Student.create({ ...studentData, placementId, createdBy: req.user._id });

    const passwordHash = await User.hashPassword(password);
    await User.create({ username, passwordHash, role: 'student', studentRef: student._id, isActive: true });

    await auditLog(req.user, AUDIT_ACTIONS.STUDENT_CREATED, req, null, student.toObject(), student._id);
    return success(res, { student, username }, 'Student created', 201);
  } catch (err) {
    if (err.code === 11000) return error(res, 'Placement ID or email already exists', 409);
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student || student.isArchived) return error(res, 'Student not found', 404);

    // Coordinator can only update own course
    if (req.user.role === 'coordinator' && student.course !== req.user.courseAssigned) {
      return error(res, 'Access denied', 403);
    }

    // Prevent students from updating placement-sensitive fields
    const forbidden = ['placementStatus', 'currentCategory', 'currentPackageLPA', 'eligibilityStatus', 'registrationStatus'];
    if (req.user.role === 'student') {
      forbidden.forEach(f => delete req.body[f]);
    }

    const before = student.toObject();
    Object.assign(student, req.body);
    student.updatedBy = req.user._id;
    await student.save();

    await auditLog(req.user, AUDIT_ACTIONS.STUDENT_UPDATED, req, before, student.toObject(), student._id);
    return success(res, { student }, 'Student updated');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.archive = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return error(res, 'Student not found', 404);

    const before = student.toObject();
    student.isArchived = true;
    student.updatedBy = req.user._id;
    await student.save();

    await auditLog(req.user, AUDIT_ACTIONS.STUDENT_ARCHIVED, req, before, null, student._id);
    return success(res, {}, 'Student archived');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.exportData = async (req, res) => {
  try {
    const filter = { isArchived: false };
    if (req.query.course) filter.course = req.query.course;

    const students = await Student.find(filter);
    const workbook = await exportStudents(students, req.user, req.query, req);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    return error(res, err.message);
  }
};
