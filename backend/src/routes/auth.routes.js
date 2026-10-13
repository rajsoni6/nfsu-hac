const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../config/rateLimit.config');
const { validateLogin, validateChangePassword, validateMfaVerify } = require('../validators/auth.validator');

router.post('/login', authLimiter, validateLogin, ctrl.login);
router.post('/mfa/verify', authLimiter, validateMfaVerify, ctrl.verifyMfa);
router.post('/refresh', ctrl.refresh);
router.post('/logout', authenticate, ctrl.logout);
router.post('/change-password', authenticate, validateChangePassword, ctrl.changePassword);
router.post('/mfa/setup', authenticate, ctrl.setupMfa);
router.post('/mfa/enable', authenticate, ctrl.enableMfa);

module.exports = router;
