const router = require('express').Router();
const ctrl = require('../controllers/offer.controller');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { validateCreate, validateOverride } = require('../validators/offer.validator');

router.use(authenticate);

router.get('/', authorize('admin', 'coordinator', 'recruiter', 'student'), ctrl.getAll);
router.post('/', authorize('admin'), validateCreate, ctrl.create);
router.get('/:id', authorize('admin', 'coordinator', 'recruiter', 'student'), ctrl.getOne);
router.patch('/:id/acceptance', authorize('admin'), ctrl.updateAcceptance);
router.patch('/:id/joining', authorize('admin'), ctrl.updateJoining);
router.post('/:id/override', authorize('admin'), validateOverride, ctrl.override);

module.exports = router;
