const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  category: { type: String, required: true, enum: ['Hostel', 'Maintenance', 'Academics', 'Library', 'IT', 'Transport', 'Food', 'Other'] },
  submittedBy: { type: String, required: true },
  submittedById: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  status: { type: String, enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'], default: 'Pending' },
  description: { type: String, required: true },
  adminReply: { type: String },
  priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);