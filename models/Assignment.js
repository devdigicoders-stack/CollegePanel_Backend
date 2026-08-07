const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  assignmentId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  course: { type: String, required: true },
  subject: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  assignedDate: { type: Date, required: true },
  dueDate: { type: Date, required: true },
  totalMarks: { type: Number, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  teacherName: { type: String, required: true },
  totalStudents: { type: Number, default: 0 },
  submittedCount: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending', 'Submitted', 'Graded', 'Overdue'], default: 'Pending' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', assignmentSchema);
