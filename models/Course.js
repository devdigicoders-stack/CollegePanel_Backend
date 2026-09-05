const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  hod: { type: String, required: false },
  duration: { type: String, required: true }, // e.g., "4 Years", "3 Years"
  totalSemesters: { type: Number, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: false }, // Optional for Master courses
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

// Ensure course code is unique per college (and unique for masters where collegeId is null)
courseSchema.index({ code: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);
