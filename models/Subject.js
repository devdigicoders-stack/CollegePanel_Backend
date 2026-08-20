const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  department: { type: String, required: true },
  courseName: { type: String, required: true },
  semester: { type: Number, required: true },
  credits: { type: Number, required: true },
  theory: { type: Number, default: 0 },
  practical: { type: Number, default: 0 },
  syllabusCompletion: { type: Number, default: 0 },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Subject', subjectSchema);
