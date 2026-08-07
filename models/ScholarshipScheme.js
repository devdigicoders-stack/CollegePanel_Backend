const mongoose = require('mongoose');

const scholarshipSchemeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['Government (State)', 'AICTE', 'NSP (National)', 'College'], default: 'College' },
  eligibility: { type: String, required: true },
  reward: { type: String, required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['Applications Open', 'Applications Closed'], default: 'Applications Open' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('ScholarshipScheme', scholarshipSchemeSchema);
