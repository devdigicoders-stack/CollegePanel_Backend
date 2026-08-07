const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, required: true }, // 'ID Card', 'Marksheet', 'Receipt', etc.
  name: { type: String, required: true }, // 'Semester 1 Marksheet'
  date: { type: String, required: true }, // 'Generated on 12 Aug 2024'
  fileUrl: { type: String, required: true }, // URL path
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('DownloadDocument', downloadSchema);
