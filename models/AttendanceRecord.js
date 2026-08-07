const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  rollNo: { type: String, required: true },
  studentName: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], required: true },
  remarks: { type: String, default: '' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);
