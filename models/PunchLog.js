const mongoose = require('mongoose');

const punchLogSchema = new mongoose.Schema({
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  date: { type: Date, required: true }, // The calendar date of the punch (normalized to 00:00:00)
  
  punchInTime: { type: Date },
  punchInLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  
  punchOutTime: { type: Date },
  punchOutLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  
  status: { 
    type: String, 
    enum: ['Present', 'Absent', 'Half Day'], 
    default: 'Present' 
  }
}, { timestamps: true });

// Compound index to quickly find an employee's punch log for a specific date
punchLogSchema.index({ collegeId: 1, employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PunchLog', punchLogSchema);
