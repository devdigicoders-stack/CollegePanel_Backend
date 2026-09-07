const mongoose = require('mongoose');

const hostelAttendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom', required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], default: 'Present' },
  remarks: { type: String, default: '' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

hostelAttendanceSchema.index({ date: 1, studentId: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('HostelAttendance', hostelAttendanceSchema);
