const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  meetingId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['Department Meeting', 'Parent Meeting', 'Academic Meeting', 'Staff Meeting'], required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number, default: 60 },
  location: { type: String, required: true },
  department: { type: String },
  organizer: { type: String, required: true },
  agenda: { type: String, required: true },
  attendees: { type: Number, default: 0 },
  status: { type: String, enum: ['Upcoming', 'Completed', 'Cancelled'], default: 'Upcoming' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);