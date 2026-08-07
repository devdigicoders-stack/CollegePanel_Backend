const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  date: { type: Date, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  incidentType: { type: String, required: true },
  description: { type: String, required: true },
  actionTaken: { type: String },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.models.HostelIncident || mongoose.model('HostelIncident', schema);