const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  assignmentId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  course: { type: String, required: true },
  branch: { type: String }, // Branch name
  department: { type: String }, // Maps to Student's branch for backwards compatibility
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  fileUrl: { type: String, default: '' }, // PDF or document attachment URL
  fileName: { type: String, default: '' }, // Original file name
  assignedDate: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  totalMarks: { type: Number, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  teacherName: { type: String, default: 'Admin' },
  totalStudents: { type: Number, default: 0 },
  submittedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Submitted', 'Graded', 'Overdue'], default: 'Pending' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

assignmentSchema.index({ assignmentId: 1, collegeId: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);

