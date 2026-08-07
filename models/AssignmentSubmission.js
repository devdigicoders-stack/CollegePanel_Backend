const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  submissionDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Submitted', 'Graded', 'Late'], default: 'Submitted' },
  grade: { type: String },
  remarks: { type: String },
  fileUrl: { type: String }, // URL if file is uploaded
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
