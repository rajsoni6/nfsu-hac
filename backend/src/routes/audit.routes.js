const router = require('express').Router();
const ctrl = require('../controllers/audit.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate, authorize('admin'));
router.get('/logs', ctrl.getLogs);
router.get('/logs/:targetId', ctrl.getByTarget);

module.exports = router;
