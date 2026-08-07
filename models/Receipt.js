const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  receiptNo: { type: String, required: true, unique: true },
  reference: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  mode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Online'], default: 'Cash' },
  status: { type: String, enum: ['Active', 'Cancelled'], default: 'Active' },
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Receipt', receiptSchema);
