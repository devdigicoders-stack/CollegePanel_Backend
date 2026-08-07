const mongoose = require('mongoose');

const mealMenuSchema = new mongoose.Schema({
  day: { type: String, required: true },
  breakfast: { type: String, required: true },
  lunch: { type: String, required: true },
  snacks: { type: String, required: true },
  dinner: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('MealMenu', mealMenuSchema);
