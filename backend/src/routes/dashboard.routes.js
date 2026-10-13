const router = require('express').Router();
const ctrl = require('../controllers/dashboard.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);
router.get('/summary', authorize('admin', 'coordinator'), ctrl.summary);
router.get('/coursewise', authorize('admin', 'coordinator'), ctrl.coursewise);
router.get('/packages', authorize('admin', 'coordinator'), ctrl.packages);
router.get('/pending', authorize('admin', 'coordinator'), ctrl.pending);

module.exports = router;
