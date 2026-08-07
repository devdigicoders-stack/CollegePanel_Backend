const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expNo: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  vendor: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  mode: { type: String, enum: ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card'], default: 'Cash' },
  invoiceNo: { type: String },
  dept: { type: String },
  description: { type: String },
  approvalStatus: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  approvedBy: { type: String },
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
