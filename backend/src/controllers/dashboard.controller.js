const Student = require('../models/Student.model');
const Offer = require('../models/Offer.model');
const { success, error } = require('../utils/apiResponse');

exports.summary = async (req, res) => {
  try {
    const [total, registered, eligible, placed, internshipOnly, internshipFte, unplaced, pkgAgg, catAgg] = await Promise.all([
      Student.countDocuments({ isArchived: false }),
      Student.countDocuments({ registrationStatus: 'registered', isArchived: false }),
      Student.countDocuments({ eligibilityStatus: 'eligible', isArchived: false }),
      Student.countDocuments({ placementStatus: { $in: ['fte_only','internship_fte'] }, isArchived: false }),
      Student.countDocuments({ placementStatus: 'internship_only', isArchived: false }),
      Student.countDocuments({ placementStatus: 'internship_fte', isArchived: false }),
      Student.countDocuments({ placementStatus: 'unplaced', isArchived: false }),
      Student.aggregate([{ $match: { currentPackageLPA: { $gt: 0 }, isArchived: false } }, { $group: { _id: null, avg: { $avg: '$currentPackageLPA' } } }]),
      Student.aggregate([{ $match: { currentCategory: { $ne: null }, isArchived: false } }, { $group: { _id: '$currentCategory', count: { $sum: 1 } } }]),
    ]);
    const avgPackage = pkgAgg[0]?.avg || 0;
    const categories = catAgg.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {});
    return success(res, { total, registered, eligible, placed, internshipOnly, internshipFte, unplaced, avgPackage, categories });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.coursewise = async (req, res) => {
  try {
    const filter = { isArchived: false };
    if (req.user.role === 'coordinator') filter.course = req.user.courseAssigned;

    const raw = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$course',
          total: { $sum: 1 },
          placed: { $sum: { $cond: [{ $ne: ['$placementStatus', 'unplaced'] }, 1, 0] } },
          internshipOnly: { $sum: { $cond: [{ $eq: ['$placementStatus', 'internship_only'] }, 1, 0] } },
          fteOnly: { $sum: { $cond: [{ $eq: ['$placementStatus', 'fte_only'] }, 1, 0] } },
          internshipFte: { $sum: { $cond: [{ $eq: ['$placementStatus', 'internship_fte'] }, 1, 0] } },
          unplaced: { $sum: { $cond: [{ $eq: ['$placementStatus', 'unplaced'] }, 1, 0] } },
          registered: { $sum: { $cond: [{ $eq: ['$registrationStatus', 'registered'] }, 1, 0] } },
          eligible: { $sum: { $cond: [{ $eq: ['$eligibilityStatus', 'eligible'] }, 1, 0] } },
          avgPackage: { $avg: { $cond: [{ $gt: ['$currentPackageLPA', 0] }, '$currentPackageLPA', null] } },
        },
      },
    ]);
    const courses = raw.map(r => ({ ...r, course: r._id }));
    return success(res, { courses });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.packages = async (req, res) => {
  try {
    const [agg, catAgg, above10] = await Promise.all([
      Offer.aggregate([
        { $match: { acceptanceStatus: 'accepted', ctcLPA: { $gt: 0 } } },
        { $sort: { ctcLPA: 1 } },
        { $group: { _id: null, highest: { $max: '$ctcLPA' }, average: { $avg: '$ctcLPA' }, count: { $sum: 1 }, packages: { $push: '$ctcLPA' } } },
        { $project: { highest: 1, average: 1, count: 1, median: { $arrayElemAt: ['$packages', { $floor: { $divide: [{ $size: '$packages' }, 2] } }] } } },
      ]),
      Offer.aggregate([
        { $match: { acceptanceStatus: 'accepted', ctcLPA: { $gt: 0 } } },
        { $group: { _id: '$category', count: { $sum: 1 }, avg: { $avg: '$ctcLPA' }, min: { $min: '$ctcLPA' }, max: { $max: '$ctcLPA' } } },
        { $project: { category: '$_id', count: 1, avg: 1, min: 1, max: 1 } },
      ]),
      Offer.countDocuments({ acceptanceStatus: 'accepted', ctcLPA: { $gte: 10 } }),
    ]);
    const base = agg[0] || {};
    return success(res, { highest: base.highest, average: base.average, median: base.median, above10, byCategory: catAgg });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.pending = async (req, res) => {
  try {
    const [pendingAcceptance, pendingJoining, expiredOffers] = await Promise.all([
      Offer.countDocuments({ acceptanceStatus: 'pending' }),
      Offer.countDocuments({ acceptanceStatus: 'accepted', joiningStatus: 'pending' }),
      Offer.countDocuments({ acceptanceStatus: 'expired' }),
    ]);
    const items = [];
    if (pendingAcceptance) items.push({ type: 'PENDING_ACCEPTANCE', description: `${pendingAcceptance} offer(s) awaiting student acceptance` });
    if (pendingJoining)    items.push({ type: 'PENDING_JOINING',    description: `${pendingJoining} accepted offer(s) with joining status pending` });
    if (expiredOffers)     items.push({ type: 'EXPIRED_OFFERS',     description: `${expiredOffers} offer(s) have expired without acceptance` });
    return success(res, { items, pendingAcceptance, pendingJoining });
  } catch (err) {
    return error(res, err.message);
  }
};
