const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  semesterNumber: { type: Number, required: true },
  startDate: { type: Date, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  status: { type: String, enum: ['Active', 'Upcoming', 'Completed'], default: 'Upcoming' }
}, { timestamps: true });

module.exports = mongoose.model('Semester', semesterSchema);
