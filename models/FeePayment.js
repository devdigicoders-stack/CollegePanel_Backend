const mongoose = require('mongoose');

const feePaymentSchema = new mongoose.Schema({
  receiptNo: { type: String, required: true, unique: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentName: { type: String, required: true },
  enrollNo: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  mode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Online'], default: 'Cash' },
  status: { type: String, enum: ['Completed', 'Pending', 'Failed', 'Refunded'], default: 'Completed' },
  feeHeads: [{ head: String, amount: Number }],
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('FeePayment', feePaymentSchema);
