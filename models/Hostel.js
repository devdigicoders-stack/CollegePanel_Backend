const mongoose = require('mongoose');
const hostelSchema = new mongoose.Schema({
  blockName: { type: String, required: true },
  capacity: { type: Number, required: true },
  warden: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Hostel', hostelSchema);