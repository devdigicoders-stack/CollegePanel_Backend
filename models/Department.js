const mongoose = require('mongoose');
const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hod: { type: String, required: true },
  totalFaculty: { type: Number, default: 0 },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Department', departmentSchema);