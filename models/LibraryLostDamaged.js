const mongoose = require('mongoose');

const libraryLostDamagedSchema = new mongoose.Schema({
  caseNo: { type: String, unique: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
  accessionNo: { type: String, required: true },
  bookTitle: { type: String, required: true },
  reportedBy: { type: String, required: true },
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  memberType: { type: String },
  type: { type: String, enum: ['Lost', 'Damaged'], required: true },
  cost: { type: Number, required: true },
  penalty: { type: Number, default: 0 },
  status: { type: String, enum: ['Pending Cost Recovery', 'Book Cost Recovered', 'Replacement Received', 'Closed'], default: 'Pending Cost Recovery' },
  resolutionDate: { type: Date },
  notes: { type: String },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LibraryLostDamaged', libraryLostDamagedSchema);
