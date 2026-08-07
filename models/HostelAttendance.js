const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  date: { type: Date, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom' },
  status: { type: String, enum: ['Present', 'Absent', 'On Leave'], required: true },
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.models.HostelAttendance || mongoose.model('HostelAttendance', schema);