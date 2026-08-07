const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  semesterNumber: { type: Number, required: true },
  courseName: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalWeeks: { type: Number, default: 16 },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  status: { type: String, enum: ['Active', 'Upcoming', 'Completed'], default: 'Upcoming' }
}, { timestamps: true });

module.exports = mongoose.model('Semester', semesterSchema);
