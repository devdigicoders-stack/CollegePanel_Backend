const mongoose = require('mongoose');

const lessonPlanSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  teacherName: { type: String, required: true },
  department: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  week: { type: String, required: true },
  month: { type: String, required: true },
  topic: { type: String, required: true },
  description: { type: String, default: '' },
  objectives: { type: [String], default: [] },
  resources: { type: [String], default: [] },
  status: { type: String, enum: ['Pending', 'Submitted', 'Approved', 'Rejected'], default: 'Pending' },
  submittedDate: { type: Date },
  approvedDate: { type: Date },
  approvedBy: { type: String },
  rejectionReason: { type: String, default: '' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LessonPlan', lessonPlanSchema);
