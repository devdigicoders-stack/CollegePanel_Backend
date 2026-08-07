const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  requestId: { type: String, required: true, unique: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  applicantName: { type: String, required: true },
  applicantType: { type: String, enum: ['Faculty', 'Staff', 'Student'], required: true },
  department: { type: String, required: true },
  leaveType: { type: String, enum: ['Casual Leave', 'Medical Leave', 'Earned Leave', 'Emergency Leave'], required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  days: { type: Number, required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  appliedDate: { type: Date, default: Date.now },
  approvedBy: { type: String },
  approvedDate: { type: Date },
  rejectedBy: { type: String },
  rejectedDate: { type: Date },
  rejectionReason: { type: String },
  attachments: [{ type: String }],
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);