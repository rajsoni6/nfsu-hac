const router = require('express').Router();
const ctrl = require('../controllers/recruitment.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');

router.use(authenticate);
router.post('/drive', authorize('admin'), ctrl.createDrive);
router.post('/attendance', authorize('admin'), ctrl.markAttendance);
router.get('/absentees', authorize('admin', 'coordinator'), ctrl.getAbsentees);

module.exports = router;
