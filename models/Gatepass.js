const mongoose = require('mongoose');

const gatepassSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  reason: { type: String, required: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Used'], default: 'Pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // E.g. Warden or Principal
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Gatepass', gatepassSchema);
