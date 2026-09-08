const mongoose = require('mongoose');

const liveNotificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Store employeeId, studentId, admin _id, or 'admin'
  role: { type: String, default: 'Admin' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'General' },
  link: { type: String }, // Optional link to redirect user when clicked
  isRead: { type: Boolean, default: false },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LiveNotification', liveNotificationSchema);
