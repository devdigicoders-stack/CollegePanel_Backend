const mongoose = require('mongoose');

const purchaseRequestSchema = new mongoose.Schema({
  item: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  estimatedCost: { type: Number, required: true },
  urgency: { type: String, enum: ['Low', 'Normal', 'High'], default: 'Normal' },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected', 'Procured'], default: 'Pending' },
  requestDate: { type: Date, default: Date.now },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('MessPurchaseRequest', purchaseRequestSchema);
