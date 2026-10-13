const Offer = require('../models/Offer.model');
const Student = require('../models/Student.model');
const Company = require('../models/Company.model');
const AuditLog = require('../models/AuditLog.model');
const policyEngine = require('../services/policyEngine.service');
const { success, error } = require('../utils/apiResponse');
const { AUDIT_ACTIONS } = require('../utils/constants');

const auditLog = async (actor, action, req, before, after, targetId) => {
  await AuditLog.create({
    actor: actor._id, action, targetModel: 'Offer', targetId,
    ipAddress: req.ip, userAgent: req.headers['user-agent'] || '',
    before, after,
  });
};

const updateStudentPlacementStatus = async (student, offerType, category, packageLPA) => {
  const map = { 'I': 'internship_only', 'F': 'fte_only', 'I+F': 'internship_fte' };
  student.placementStatus = map[offerType] || student.placementStatus;
  student.currentCategory = category;
  student.currentPackageLPA = packageLPA || student.currentPackageLPA;
  await student.save();
};

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'coordinator') {
      const students = await Student.find({ course: req.user.courseAssigned }).select('_id');
      filter.student = { $in: students.map(s => s._id) };
    }
    if (req.user.role === 'recruiter') {
      filter.company = req.user.companyAssigned;
    }
    if (req.user.role === 'student') {
      const studentDoc = await Student.findById(req.user.studentRef);
      if (!studentDoc) return error(res, 'Student record not found', 404);
      filter.student = studentDoc._id;
    }

    const offers = await Offer.find(filter)
      .populate('student', 'placementId name course')
      .populate('company', 'name category')
      .sort({ createdAt: -1 });

    return success(res, { offers });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getOne = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id)
      .populate('student', 'placementId name course')
      .populate('company', 'name category');

    if (!offer) return error(res, 'Offer not found', 404);

    if (req.user.role === 'student') {
      if (!req.user.studentRef || offer.student._id.toString() !== req.user.studentRef.toString()) {
        return error(res, 'Access denied', 403);
      }
    }
    if (req.user.role === 'recruiter') {
      if (offer.company._id.toString() !== req.user.companyAssigned?.toString()) {
        return error(res, 'Access denied', 403);
      }
    }

    return success(res, { offer });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const student = await Student.findById(req.body.student);
    if (!student || student.isArchived) return error(res, 'Student not found', 404);

    const company = await Company.findById(req.body.company);
    if (!company || !company.isActive) return error(res, 'Company not found or inactive', 404);

    const policyResult = await policyEngine.evaluate(student, company, req.body.offerType);

    if (!policyResult.allowed) {
      return success(res, { policyCheckResult: policyResult }, 'Offer blocked by policy', 200);
    }

    const offer = await Offer.create({
      ...req.body,
      category: company.category,
      policyCheckResult: policyResult,
      createdBy: req.user._id,
    });

    // Update student placement status on accepted offer
    if (req.body.acceptanceStatus === 'accepted') {
      await updateStudentPlacementStatus(student, req.body.offerType, company.category, req.body.ctcLPA);
    }

    await auditLog(req.user, AUDIT_ACTIONS.OFFER_CREATED, req, null, offer.toObject(), offer._id);
    return success(res, { offer }, 'Offer created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.updateAcceptance = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('student').populate('company');
    if (!offer) return error(res, 'Offer not found', 404);

    const { acceptanceStatus } = req.body;
    if (!['accepted', 'declined'].includes(acceptanceStatus)) {
      return error(res, 'Invalid acceptance status', 422);
    }

    const before = offer.toObject();
    offer.acceptanceStatus = acceptanceStatus;
    await offer.save();

    if (acceptanceStatus === 'accepted') {
      await updateStudentPlacementStatus(offer.student, offer.offerType, offer.company.category, offer.ctcLPA);
    }

    await auditLog(req.user, AUDIT_ACTIONS.OFFER_UPDATED, req, before, offer.toObject(), offer._id);
    return success(res, { offer }, 'Acceptance status updated');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.updateJoining = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return error(res, 'Offer not found', 404);

    const { joiningStatus } = req.body;
    if (!['joined', 'not_joined'].includes(joiningStatus)) {
      return error(res, 'Invalid joining status', 422);
    }

    const before = offer.toObject();
    offer.joiningStatus = joiningStatus;
    await offer.save();

    await auditLog(req.user, AUDIT_ACTIONS.OFFER_UPDATED, req, before, offer.toObject(), offer._id);
    return success(res, { offer }, 'Joining status updated');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.override = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate('student').populate('company');
    if (!offer) return error(res, 'Offer not found', 404);

    const { overrideNote } = req.body;
    const before = offer.toObject();

    offer.policyCheckResult.allowed = true;
    offer.policyCheckResult.overriddenBy = req.user._id;
    offer.policyCheckResult.overrideNote = overrideNote;
    await offer.save();

    await auditLog(req.user, AUDIT_ACTIONS.OFFER_OVERRIDE, req, before, offer.toObject(), offer._id);
    return success(res, { offer }, 'Policy override applied');
  } catch (err) {
    return error(res, err.message);
  }
};
