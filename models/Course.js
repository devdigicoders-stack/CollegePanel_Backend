const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  duration: { type: String, required: true }, // e.g., "4 Years", "3 Years"
  totalSemesters: { type: Number, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
