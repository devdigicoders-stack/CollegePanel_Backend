const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  totalFaculty: { type: Number, default: 0 },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: false } // Optional for Master departments
}, { timestamps: true });

departmentSchema.index({ name: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);