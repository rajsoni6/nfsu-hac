const RecruitmentActivity = require('../models/RecruitmentActivity.model');
const Student = require('../models/Student.model');
const { success, error } = require('../utils/apiResponse');

exports.createDrive = async (req, res) => {
  try {
    const { companyId, driveDate, activityType, description } = req.body;
    if (!companyId || !driveDate || !activityType) {
      return error(res, 'companyId, driveDate and activityType are required', 422);
    }
    const drive = await RecruitmentActivity.create({
      company: companyId,
      driveDate,
      activityType,
      description: description || '',
      attendees: [],
      createdBy: req.user._id,
    });
    return success(res, { drive }, 'Drive created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getDrives = async (req, res) => {
  try {
    const drives = await RecruitmentActivity.find()
      .populate('company', 'name category')
      .sort({ driveDate: -1 })
      .limit(50);
    return success(res, { drives });
  } catch (err) {
    return error(res, err.message);
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { driveId, placementId, status, excused, excuseNote } = req.body;
    if (!driveId || !placementId || !status) {
      return error(res, 'driveId, placementId and status are required', 422);
    }

    const drive = await RecruitmentActivity.findById(driveId);
    if (!drive) return error(res, 'Drive not found', 404);

    const student = await Student.findOne({ placementId: placementId.toUpperCase() });
    if (!student) return error(res, 'Student not found with that Placement ID', 404);

    // upsert attendee record
    const existing = drive.attendees.find(a => a.student.toString() === student._id.toString());
    const isAbsent = status === 'absent';
    const isExcused = excused === true || excused === 'true';

    if (existing) {
      existing.present = !isAbsent;
      existing.excused = isExcused;
      existing.excuseNote = excuseNote || null;
    } else {
      drive.attendees.push({
        student: student._id,
        present: !isAbsent,
        excused: isExcused,
        excuseNote: excuseNote || null,
      });
    }
    await drive.save();

    // update absenteeism count
    if (isAbsent && !isExcused) {
      await Student.findByIdAndUpdate(student._id, { $inc: { absenteeismCount: 1 } });
      // auto-exclude after 3 absences
      const updated = await Student.findById(student._id);
      if (updated.absenteeismCount >= 3 && !updated.isExcludedFromDrives) {
        await Student.findByIdAndUpdate(student._id, { isExcludedFromDrives: true });
      }
    }

    return success(res, { drive }, 'Attendance logged');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getAbsentees = async (req, res) => {
  try {
    const filter = { absenteeismCount: { $gt: 0 } };
    if (req.user.role === 'coordinator') filter.course = req.user.courseAssigned;
    const absentees = await Student.find(filter)
      .select('placementId name course absenteeismCount isExcludedFromDrives')
      .sort({ absenteeismCount: -1 });
    return success(res, { absentees });
  } catch (err) {
    return error(res, err.message);
  }
};
