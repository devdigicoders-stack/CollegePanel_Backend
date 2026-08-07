const mongoose = require('mongoose');

const securityLogSchema = new mongoose.Schema({
  logType: { type: String, enum: ['Student', 'Visitor', 'Vehicle', 'Incident'], required: true },
  
  // For Student/Gatepass
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  gatepassId: { type: mongoose.Schema.Types.ObjectId, ref: 'Gatepass' },
  
  // For Visitor
  visitorName: { type: String },
  purpose: { type: String },
  contactNumber: { type: String },
  photoUrl: { type: String },
  
  // For Student
  movementType: { type: String, enum: ['Entry', 'Exit'] },
  
  // Details
  entryTime: { type: Date, default: Date.now },
  exitTime: { type: Date },
  remarks: { type: String },
  
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Security guard (optional for testing by admin)
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('SecurityLog', securityLogSchema);
