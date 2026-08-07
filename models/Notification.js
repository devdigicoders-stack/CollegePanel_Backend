const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notificationId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  audience: { type: String, enum: ['All Students', 'Specific Department', 'Specific Course', 'All Staff'], required: true },
  type: { type: String, enum: ['Announcement', 'SMS / Email', 'Notification'], default: 'Announcement' },
  publishedBy: { type: String, required: true },
  dateOfPublishing: { type: Date, required: true },
  status: { type: String, enum: ['Published', 'Draft'], default: 'Draft' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);