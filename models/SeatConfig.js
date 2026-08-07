const mongoose = require('mongoose');

const seatConfigSchema = new mongoose.Schema({
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  courseName: { type: String, required: true },
  department: { type: String },
  academicSession: { type: String, required: true },
  totalSeats: { type: Number, required: true, default: 60 },
  // Category-wise seat distribution
  generalSeats: { type: Number, default: 30 },
  obcSeats: { type: Number, default: 16 },
  scSeats: { type: Number, default: 9 },
  stSeats: { type: Number, default: 5 },
  ewsSeats: { type: Number, default: 0 },
  mgmtSeats: { type: Number, default: 0 },
  // Waiting list capacity
  waitingListCapacity: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Unique per college + course + session
seatConfigSchema.index({ collegeId: 1, courseName: 1, academicSession: 1 }, { unique: true });

module.exports = mongoose.model('SeatConfig', seatConfigSchema);
