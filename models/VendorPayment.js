const mongoose = require('mongoose');

const vendorPaymentSchema = new mongoose.Schema({
  invoiceNo: { type: String, required: true, unique: true },
  vendor: { type: String, required: true },
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'Paid', 'Overdue', 'Cancelled'], default: 'Pending' },
  datePaid: { type: Date },
  category: { type: String },
  description: { type: String },
  mode: { type: String, enum: ['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Card'], default: 'Bank Transfer' },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('VendorPayment', vendorPaymentSchema);
