const mongoose = require('mongoose');

const accountLedgerSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  account: { type: String, required: true },
  particulars: { type: String, required: true },
  dr: { type: Number, default: 0 },
  cr: { type: Number, default: 0 },
  balance: { type: Number, required: true },
  reference: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('AccountLedger', accountLedgerSchema);
