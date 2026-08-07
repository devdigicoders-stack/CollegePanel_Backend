const mongoose = require('mongoose');

const vehicleLogSchema = new mongoose.Schema({
  plateNo: { type: String, required: true },
  ownerName: { type: String, required: true },
  vehicleType: { type: String, required: true },
  parkingZone: { type: String },
  checkInTime: { type: Date, default: Date.now },
  checkOutTime: { type: Date },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }, // Security guard
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.models.VehicleLog || mongoose.model('VehicleLog', vehicleLogSchema);
