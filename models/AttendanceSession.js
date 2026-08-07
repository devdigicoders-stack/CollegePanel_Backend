const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  className: { type: String, required: true },
  subject: { type: String, required: true },
  date: { type: Date, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  teacherName: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
