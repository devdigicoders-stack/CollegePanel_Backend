const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
  activityName: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Activity', activitySchema);