const mongoose = require('mongoose');

const facultyAttendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  records: [{
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['Present', 'Absent', 'On Leave'], default: 'Present' },
    remarks: { type: String, default: '' }
  }],
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

// Prevent duplicate attendance for the same day in the same college
facultyAttendanceSchema.index({ date: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('FacultyAttendance', facultyAttendanceSchema);
