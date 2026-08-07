const mongoose = require('mongoose');

const hostelRoomSchema = new mongoose.Schema({
  blockName: { type: String, required: true },
  roomNumber: { type: String, required: true },
  capacity: { type: Number, required: true },
  occupancy: { type: Number, default: 0 },
  type: { type: String, enum: ['AC', 'Non-AC'], default: 'Non-AC' },
  status: { type: String, enum: ['Available', 'Full', 'Maintenance'], default: 'Available' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('HostelRoom', hostelRoomSchema);
