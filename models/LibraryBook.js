const mongoose = require('mongoose');

const libraryBookSchema = new mongoose.Schema({
  accessionNo: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  isbn: { type: String },
  category: { type: String, required: true },
  subject: { type: String },
  edition: { type: String },
  publisher: { type: String },
  publishYear: { type: Number },
  shelf: { type: String },
  rack: { type: String },
  totalCopies: { type: Number, required: true, default: 1 },
  availableCopies: { type: Number, required: true, default: 1 },
  price: { type: Number, default: 0 },
  status: { type: String, enum: ['Available', 'Issued', 'Lost', 'Damaged', 'Reserved'], default: 'Available' },
  description: { type: String },
  lastVerified: { type: Date },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LibraryBook', libraryBookSchema);
