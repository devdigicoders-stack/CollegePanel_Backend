const mongoose = require('mongoose');

const examResultSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Examination', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  rollNo: { type: String, required: true },
  studentName: { type: String, required: true },
  course: { type: String, required: true },
  theoryMarks: { type: Number, default: 0 },
  practicalMarks: { type: Number, default: 0 },
  totalMarks: { type: Number, default: 0 },
  grade: { type: String },
  status: { type: String, enum: ['Pass', 'Fail', 'Pending', 'Submitted', 'Approved'], default: 'Pending' },
  revaluationRequested: { type: Boolean, default: false },
  remarks: { type: String, default: '' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('ExamResult', examResultSchema);
