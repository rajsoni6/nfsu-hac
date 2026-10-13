const router = require('express').Router();
const ctrl = require('../controllers/policy.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);
router.get('/rules', authorize('admin'), ctrl.getRules);
router.put('/rules/:id', authorize('admin'), ctrl.updateRule);
router.post('/check', authorize('admin'), ctrl.dryRun);

module.exports = router;
