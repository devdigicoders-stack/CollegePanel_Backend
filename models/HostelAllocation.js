const mongoose = require('mongoose');

const hostelAllocationSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  allotmentDate: { type: Date, required: true, default: Date.now },
  status: { type: String, enum: ['Active', 'Vacated'], default: 'Active' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('HostelAllocation', hostelAllocationSchema);
