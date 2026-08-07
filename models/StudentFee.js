const mongoose = require('mongoose');

const studentFeeSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  enrollNo: { type: String, required: true },
  studentName: { type: String, required: true },
  course: { type: String, required: true },
  semester: { type: String },
  totalFee: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  scholarship: { type: Number, default: 0 },
  pending: { type: Number, default: 0 },
  fine: { type: Number, default: 0 },
  nextDue: { type: Date },
  status: { type: String, enum: ['Paid', 'Partial', 'Overdue', 'Pending'], default: 'Pending' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('StudentFee', studentFeeSchema);
