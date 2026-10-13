const AuditLog = require('../models/AuditLog.model');
const { success, error } = require('../utils/apiResponse');

exports.getLogs = async (req, res) => {
  try {
    const { action, page = 1, limit = 50 } = req.query;
    const filter = {};
    if (action) filter.action = action;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('actor', 'username role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments(filter),
    ]);

    return success(res, { logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getByTarget = async (req, res) => {
  try {
    const logs = await AuditLog.find({ targetId: req.params.targetId })
      .populate('actor', 'username role')
      .sort({ timestamp: -1 });

    return success(res, { logs });
  } catch (err) {
    return error(res, err.message);
  }
};
