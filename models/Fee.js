const mongoose = require('mongoose');
const feeSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Paid', 'Pending', 'Overdue'], default: 'Paid' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Fee', feeSchema);