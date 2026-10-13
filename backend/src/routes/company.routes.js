const router = require('express').Router();
const ctrl = require('../controllers/company.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateCompany } = require('../validators/company.validator');

router.use(authenticate);

router.get('/', authorize('admin', 'coordinator', 'recruiter', 'student'), ctrl.getAll);
router.post('/', authorize('admin'), validateCompany, ctrl.create);
router.get('/:id', authorize('admin', 'coordinator', 'recruiter', 'student'), ctrl.getOne);
router.get('/:id/stats', authorize('admin', 'coordinator', 'recruiter', 'student'), ctrl.getStats);
router.put('/:id', authorize('admin'), validateCompany, ctrl.update);

module.exports = router;
