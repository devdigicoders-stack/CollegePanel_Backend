const mongoose = require('mongoose');
const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  present: { type: Number, required: true },
  total: { type: Number, required: true },
  status: { type: String, enum: ['Completed', 'Pending'], default: 'Completed' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Attendance', attendanceSchema);