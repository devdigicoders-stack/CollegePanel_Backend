const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobOpportunity', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['Applied', 'Shortlisted', 'Interviewing', 'Selected', 'Accepted', 'Rejected'], default: 'Applied' },
  appliedAt: { type: Date, default: Date.now },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('PlacementApplication', applicationSchema);
