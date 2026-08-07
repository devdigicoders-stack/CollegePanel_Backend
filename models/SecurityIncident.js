const mongoose = require('mongoose');

const securityIncidentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, default: 'Forwarded to Admin' },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Security guard
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.models.SecurityIncident || mongoose.model('SecurityIncident', securityIncidentSchema);
