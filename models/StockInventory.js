const mongoose = require('mongoose');

const stockInventorySchema = new mongoose.Schema({
  item: { type: String, required: true },
  category: { type: String, enum: ['Grains', 'Vegetables', 'Dairy', 'Spices', 'Others'], default: 'Others' },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
  threshold: { type: Number, required: true },
  lastRestocked: { type: Date, default: Date.now },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('StockInventory', stockInventorySchema);
