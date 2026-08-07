const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  level: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  status: { type: String, default: 'Active', enum: ['Active', 'Inactive'] }
}, { timestamps: true });

// Ensure name is unique per college
designationSchema.index({ name: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Designation', designationSchema);
