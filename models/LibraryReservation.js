const mongoose = require('mongoose');

const libraryReservationSchema = new mongoose.Schema({
  reserveId: { type: String, unique: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  memberName: { type: String, required: true },
  memberType: { type: String, enum: ['Student', 'Teacher', 'HOD', 'Employee'], default: 'Student' },
  bookTitle: { type: String, required: true },
  requestDate: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Available for Pickup', 'Issued', 'Cancelled'], default: 'Pending' },
  queuePosition: { type: Number, default: 0 },
  notes: { type: String },
  notifiedAt: { type: Date },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LibraryReservation', libraryReservationSchema);
