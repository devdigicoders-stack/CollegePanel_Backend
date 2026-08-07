const mongoose = require('mongoose');

const examinationSchema = new mongoose.Schema({
  examName: { type: String, required: true },
  course: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: String },
  date: { type: Date, required: true },
  startTime: { type: String },
  endTime: { type: String },
  totalMarks: { type: Number, default: 100 },
  passingMarks: { type: Number, default: 40 },
  totalStudents: { type: Number, default: 0 },
  status: { type: String, enum: ['Upcoming', 'Ongoing', 'Completed'], default: 'Upcoming' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Examination', examinationSchema);
