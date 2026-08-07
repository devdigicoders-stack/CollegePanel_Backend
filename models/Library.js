const mongoose = require('mongoose');
const librarySchema = new mongoose.Schema({
  bookName: { type: String, required: true },
  author: { type: String, required: true },
  availableCopies: { type: Number, required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Library', librarySchema);