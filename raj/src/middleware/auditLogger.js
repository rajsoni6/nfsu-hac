const AuditLog = require('../models/AuditLog.model');

const auditLogger = (action, targetModel) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode >= 400) return; // only log successful actions
    try {
      await AuditLog.create({
        actor: req.user._id,
        action,
        targetModel,
        targetId: req.params.id || null,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'] || '',
        before: req.auditBefore || null,
        after: req.auditAfter || null,
        meta: req.auditMeta || null,
      });
    } catch (_) {
      // Audit failure must never break the main flow
    }
  });
  next();
};

module.exports = auditLogger;
