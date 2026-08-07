const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'PlacementCompany', required: true },
  title: { type: String, required: true },
  description: { type: String },
  roleType: { type: String, enum: ['Full Time', 'Part Time', 'Internship'], default: 'Full Time' },
  salaryPkg: { type: String }, // e.g. "5 LPA"
  locations: [{ type: String }],
  eligibleCourses: [{ type: String }],
  minCgpa: { type: Number },
  deadline: { type: Date },
  status: { type: String, enum: ['Open', 'Closed', 'Cancelled'], default: 'Open' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('JobOpportunity', jobSchema);
