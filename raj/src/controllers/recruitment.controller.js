const RecruitmentActivity = require('../models/RecruitmentActivity.model');
const Student = require('../models/Student.model');
const { success, error } = require('../utils/apiResponse');

exports.createDrive = async (req, res) => {
  try {
    const { company, driveDate, activityType, studentIds } = req.body;
    const attendees = studentIds.map(id => ({ student: id, present: false }));
    const drive = await RecruitmentActivity.create({
      company, driveDate, activityType, attendees, createdBy: req.user._id,
    });
    return success(res, { drive }, 'Drive created', 201);
  } catch (err) {
    return error(res, err.message);
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { driveId, attendance } = req.body;
    // attendance: [{ studentId, present, excused, excuseNote }]

    const drive = await RecruitmentActivity.findById(driveId);
    if (!drive) return error(res, 'Drive not found', 404);

    for (const record of attendance) {
      const attendee = drive.attendees.find(a => a.student.toString() === record.studentId);
      if (attendee) {
        attendee.present = record.present;
        attendee.excused = record.excused || false;
        attendee.excuseNote = record.excuseNote || null;

        // Increment absenteeism if absent and not excused
        if (!record.present && !record.excused) {
          await Student.findByIdAndUpdate(record.studentId, { $inc: { absenteeismCount: 1 } });
        }
      }
    }

    await drive.save();
    return success(res, { drive }, 'Attendance marked');
  } catch (err) {
    return error(res, err.message);
  }
};

exports.getAbsentees = async (req, res) => {
  try {
    const filter = { isExcludedFromDrives: true };
    if (req.user.role === 'coordinator') filter.course = req.user.courseAssigned;

    const students = await Student.find(filter).select('placementId name course absenteeismCount');
    return success(res, { students });
  } catch (err) {
    return error(res, err.message);
  }
};
