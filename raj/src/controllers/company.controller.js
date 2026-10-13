const Company = require('../models/Company.model');
const Offer = require('../models/Offer.model');
const AuditLog = require('../models/AuditLog.model');
const { success, error } = require('../utils/apiResponse');
const { AUDIT_ACTIONS } = require('../utils/constants');

exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === 'recruiter') filter._id = req.user.companyAssigned;

    // Students get read-only view — no PII, no eligibility criteria details
    const select = ['student'].includes(req.user.role)
      ? 'name category minPackageLPA maxPackageLPA isActive'
      : undefined;

    const companies = await Company.find(filter).select(select);
    return success(res, { companies });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getStats = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).select('name category minPackageLPA maxPackageLPA');
    if (!company) return error(res, 'Company not found', 404);

    const placedCount = await Offer.countDocuments({
      company: company._id,
      acceptanceStatus: 'accepted',
    });

    return success(res, { company, placedCount });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.create = async (req, res) => {
  try {
    const company = await Company.create({ ...req.body, createdBy: req.user._id });
    await AuditLog.create({
      actor: req.user._id, action: AUDIT_ACTIONS.COMPANY_CREATED,
      targetModel: 'Company', targetId: company._id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'] || '',
      after: company.toObject(),
    });
    return success(res, { company }, 'Company created', 201);
  } catch (err) {
    if (err.code === 11000) return error(res, 'Company name already exists', 409);
    return error(res, err.message);
  }
};

exports.update = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return error(res, 'Company not found', 404);

    const before = company.toObject();
    Object.assign(company, req.body);
    await company.save();

    await AuditLog.create({
      actor: req.user._id, action: AUDIT_ACTIONS.COMPANY_UPDATED,
      targetModel: 'Company', targetId: company._id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'] || '',
      before, after: company.toObject(),
    });
    return success(res, { company }, 'Company updated');
  } catch (err) {
    return error(res, err.message);
  }
};
