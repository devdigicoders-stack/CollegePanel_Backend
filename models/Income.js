const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
  receiptNo: { type: String, required: true, unique: true },
  category: { type: String, required: true },
  source: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  mode: { type: String, enum: ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Online'], default: 'Cash' },
  status: { type: String, enum: ['Received', 'Pending', 'Cancelled'], default: 'Received' },
  description: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Income', incomeSchema);
