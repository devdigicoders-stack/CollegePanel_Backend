const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  empId: { type: String, required: true },
  name: { type: String, required: true },
  designation: { type: String, required: true },
  basic: { type: Number, required: true },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  net: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
  datePaid: { type: Date },
  month: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
