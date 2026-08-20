const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['Present', 'Absent', 'Late'], required: true, default: 'Present' },
  remarks: { type: String, default: '' }
}, { _id: false });

const studentAttendanceSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubjectAllocation', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  date: { type: Date, required: true },
  records: [attendanceRecordSchema],
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

// Ensure one attendance record per class per day
studentAttendanceSchema.index({ classId: 1, date: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('StudentAttendance', studentAttendanceSchema);
