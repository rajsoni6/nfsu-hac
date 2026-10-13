const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/students', require('./student.routes'));
router.use('/offers', require('./offer.routes'));
router.use('/companies', require('./company.routes'));
router.use('/recruitment', require('./recruitment.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/policy', require('./policy.routes'));
router.use('/audit', require('./audit.routes'));

module.exports = router;
