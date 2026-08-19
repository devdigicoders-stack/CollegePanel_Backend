const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  noticeId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  targetAudience: { type: String, enum: ['All Students', 'All Staff', 'All Parents', 'Specific Department', 'Specific Course', 'Hostel Residents'], required: true },
  postedBy: { type: String, required: true },
  postedByRole: { type: String, required: true },
  department: { type: String },
  dateOfPublishing: { type: Date, required: true },
  details: { type: String, required: true },
  status: { type: String, enum: ['Published', 'Draft'], default: 'Draft' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  pdfs: [{ type: String }],
  images: [{ type: String }],
  link: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Notice', noticeSchema);