const mongoose = require('mongoose');

const scholarshipSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  enrollNo: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  scheme: { type: String, required: true },
  type: { type: String },
  category: { type: String },
  income: { type: Number },
  amount: { type: Number, required: true },
  received: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  sanctionStatus: { type: String, enum: ['Sanctioned', 'Pending', 'Rejected'], default: 'Pending' },
  ledgerAdjusted: { type: Boolean, default: false },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Scholarship', scholarshipSchema);
