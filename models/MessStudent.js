const mongoose = require('mongoose');

const messStudentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  plan: { type: String, enum: ['Monthly Plan', 'Semester Plan', 'Yearly Plan'], default: 'Semester Plan' },
  preference: { type: String, enum: ['Veg', 'Non-Veg', 'Jain'], default: 'Veg' },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('MessStudent', messStudentSchema);
