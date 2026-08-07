const mongoose = require('mongoose');
const leadSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  source: { type: String, required: true },
  status: { type: String, enum: ['New', 'Contacted', 'Converted', 'Lost'], default: 'New' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Lead', leadSchema);