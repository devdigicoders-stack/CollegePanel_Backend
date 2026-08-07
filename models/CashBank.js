const mongoose = require('mongoose');

const cashBankSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String, required: true },
  type: { type: String, enum: ['Cash', 'Bank', 'Wallet'], default: 'Bank' },
  balance: { type: Number, default: 0 },
  bankName: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('CashBank', cashBankSchema);
