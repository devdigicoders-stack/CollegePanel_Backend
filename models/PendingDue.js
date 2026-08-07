const mongoose = require('mongoose');

const pendingDueSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  enrollNo: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  semester: { type: String },
  dueHead: { type: String, required: true },
  dueAmount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  overdueDays: { type: Number, default: 0 },
  fine: { type: Number, default: 0 },
  promiseDate: { type: Date },
  status: { type: String, enum: ['Upcoming', 'Overdue', 'Paid'], default: 'Upcoming' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('PendingDue', pendingDueSchema);
