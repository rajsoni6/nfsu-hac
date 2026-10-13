const router = require('express').Router();
const ctrl = require('../controllers/student.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateCreate, validateUpdate } = require('../validators/student.validator');

router.use(authenticate);

router.get('/me', authorize('student'), ctrl.getMe);
router.get('/', authorize('admin', 'coordinator'), ctrl.getAll);
router.post('/', authorize('admin'), validateCreate, ctrl.create);
router.get('/export', authorize('admin'), ctrl.exportData);
router.get('/:id', authorize('admin', 'coordinator', 'student'), ctrl.getOne);
router.put('/:id', authorize('admin', 'coordinator'), validateUpdate, ctrl.update);
router.patch('/:id/archive', authorize('admin'), ctrl.archive);

module.exports = router;
