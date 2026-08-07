const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['Check-In', 'Check-Out'], required: true },
  dateTime: { type: Date, default: Date.now },
  reason: { type: String },
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.models.HostelCheckInOut || mongoose.model('HostelCheckInOut', schema);