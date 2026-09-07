const mongoose = require('mongoose');

const libraryTransactionSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  memberType: { type: String, enum: ['Student', 'Teacher', 'HOD', 'Employee'], default: 'Student' },
  memberName: { type: String },
  issueDate: { type: Date, required: true, default: Date.now },
  dueDate: { type: Date, required: true },
  returnDate: { type: Date },
  status: { type: String, enum: ['Issued', 'Returned', 'Overdue', 'Renewed'], default: 'Issued' },
  borrowType: { type: String, enum: ['Standard', 'Reference Only', 'Book Bank'], default: 'Standard' },
  condition: { type: String },
  remarks: { type: String },
  fineAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  fineStatus: { type: String, enum: ['None', 'Pending', 'Partially Paid', 'Paid', 'Waived'], default: 'None' },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Waived', 'None'], default: 'None' },
  receiptNumber: { type: String },
  waivedReason: { type: String },
  collectedBy: { type: String },
  paidAt: { type: Date },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('LibraryTransaction', libraryTransactionSchema);
