const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  day: { type: String, required: true, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  timeSlot: { type: String, required: true },
  subject: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  teacherName: { type: String, required: true },
  roomNo: { type: String, required: true },
  type: { type: String, enum: ['Theory', 'Lab'], required: true },
  course: { type: String, required: true },
  semester: { type: String, required: true },
  section: { type: String, required: true },
  eventType: { type: String, enum: ['Class', 'Meeting', 'Event'], default: 'Class' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Timetable', timetableSchema);
