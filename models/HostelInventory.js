const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  itemName: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  condition: { type: String, enum: ['Good', 'Needs Repair', 'Damaged'], default: 'Good' },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'HostelRoom' },
  remarks: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.models.HostelInventory || mongoose.model('HostelInventory', schema);