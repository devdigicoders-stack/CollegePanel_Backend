const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  enrollNo: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  type: { type: String, required: true },
  amount: { type: Number, required: true },
  requestDate: { type: Date, default: Date.now },
  approvedBy: { type: String },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  appliedTo: { type: String },
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);
