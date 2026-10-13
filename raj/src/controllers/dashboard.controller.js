const Student = require('../models/Student.model');
const Offer = require('../models/Offer.model');
const { success, error } = require('../utils/apiResponse');

exports.summary = async (req, res) => {
  try {
    const [total, registered, eligible, placed, unplaced] = await Promise.all([
      Student.countDocuments({ isArchived: false }),
      Student.countDocuments({ registrationStatus: 'registered', isArchived: false }),
      Student.countDocuments({ eligibilityStatus: 'eligible', isArchived: false }),
      Student.countDocuments({ placementStatus: { $ne: 'unplaced' }, isArchived: false }),
      Student.countDocuments({ placementStatus: 'unplaced', isArchived: false }),
    ]);

    return success(res, { total, registered, eligible, placed, unplaced });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.coursewise = async (req, res) => {
  try {
    const filter = { isArchived: false };
    if (req.user.role === 'coordinator') filter.course = req.user.courseAssigned;

    const data = await Student.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$course',
          total: { $sum: 1 },
          placed: { $sum: { $cond: [{ $ne: ['$placementStatus', 'unplaced'] }, 1, 0] } },
          internshipOnly: { $sum: { $cond: [{ $eq: ['$placementStatus', 'internship_only'] }, 1, 0] } },
          fteOnly: { $sum: { $cond: [{ $eq: ['$placementStatus', 'fte_only'] }, 1, 0] } },
          internshipFte: { $sum: { $cond: [{ $eq: ['$placementStatus', 'internship_fte'] }, 1, 0] } },
        },
      },
    ]);

    return success(res, { coursewise: data });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.packages = async (req, res) => {
  try {
    const data = await Offer.aggregate([
      { $match: { acceptanceStatus: 'accepted', ctcLPA: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          highest: { $max: '$ctcLPA' },
          average: { $avg: '$ctcLPA' },
          count: { $sum: 1 },
          packages: { $push: '$ctcLPA' },
        },
      },
      {
        $project: {
          highest: 1, average: 1, count: 1,
          median: { $arrayElemAt: ['$packages', { $floor: { $divide: [{ $size: '$packages' }, 2] } }] },
        },
      },
    ]);

    return success(res, { packages: data[0] || {} });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.pending = async (req, res) => {
  try {
    const [pendingAcceptance, pendingJoining] = await Promise.all([
      Offer.countDocuments({ acceptanceStatus: 'pending' }),
      Offer.countDocuments({ acceptanceStatus: 'accepted', joiningStatus: 'pending' }),
    ]);

    return success(res, { pendingAcceptance, pendingJoining });
  } catch (err) {
    return error(res, err.message);
  }
};
