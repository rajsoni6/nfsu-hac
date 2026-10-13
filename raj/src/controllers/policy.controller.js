const PolicyRule = require('../models/PolicyRule.model');
const Student = require('../models/Student.model');
const Company = require('../models/Company.model');
const policyEngine = require('../services/policyEngine.service');
const AuditLog = require('../models/AuditLog.model');
const { success, error } = require('../utils/apiResponse');
const { AUDIT_ACTIONS } = require('../utils/constants');

exports.getRules = async (req, res) => {
  try {
    const rules = await PolicyRule.find();
    return success(res, { rules });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.updateRule = async (req, res) => {
  try {
    const rule = await PolicyRule.findById(req.params.id);
    if (!rule) return error(res, 'Rule not found', 404);

    const before = rule.toObject();
    Object.assign(rule, req.body);
    rule.updatedBy = req.user._id;
    await rule.save();

    await AuditLog.create({
      actor: req.user._id, action: AUDIT_ACTIONS.POLICY_RULE_CHANGED,
      targetModel: 'PolicyRule', targetId: rule._id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'] || '',
      before, after: rule.toObject(),
    });

    return success(res, { rule }, 'Policy rule updated');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.dryRun = async (req, res) => {
  try {
    const { studentId, companyId, offerType } = req.body;
    const student = await Student.findById(studentId);
    const company = await Company.findById(companyId);

    if (!student) return error(res, 'Student not found', 404);
    if (!company) return error(res, 'Company not found', 404);

    const result = await policyEngine.evaluate(student, company, offerType);
    return success(res, { policyCheckResult: result });
  } catch (err) {
    return error(res, err.message);
  }
};
