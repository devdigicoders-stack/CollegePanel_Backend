const mongoose = require('mongoose');

const scholarshipApplicationSchema = new mongoose.Schema({
  schemeId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScholarshipScheme', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['Submitted', 'Under Verification', 'Verified', 'Approved', 'Rejected', 'Disbursed'], default: 'Submitted' },
  documents: [{
    name: String,
    status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' }
  }],
  amountDisbursed: { type: Number, default: 0 },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('ScholarshipApplication', scholarshipApplicationSchema);
