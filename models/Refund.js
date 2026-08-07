const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema({
  refundNo: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  enrollNo: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String },
  reason: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },
  totalPaid: { type: Number, required: true },
  deduction: { type: Number, default: 0 },
  refundAmount: { type: Number, required: true },
  payMode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Online'], default: 'Cash' },
  bankDetails: { type: String },
  status: { type: String, enum: ['Requested', 'Under Review', 'Approved', 'Rejected', 'Processing', 'Completed'], default: 'Requested' },
  txnRef: { type: String },
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Refund', refundSchema);
