const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: String, required: true },
  course: { type: String, required: true },
  type: { type: String, required: true }, // e.g., 'PDF', 'Video', 'PPT'
  size: { type: String, default: 'Unknown' },
  fileUrl: { type: String, required: true }, // URL or path to download
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);
