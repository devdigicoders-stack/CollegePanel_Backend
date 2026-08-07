const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  visitorName: { type: String, required: true },
  contactNumber: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  relation: { type: String },
  inTime: { type: Date, default: Date.now },
  outTime: { type: Date },
  purpose: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.models.HostelVisitor || mongoose.model('HostelVisitor', schema);