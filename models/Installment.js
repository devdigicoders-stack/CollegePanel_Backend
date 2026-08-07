const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  enrollNo: { type: String, required: true },
  name: { type: String, required: true },
  course: { type: String, required: true },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  installments: [{
    no: { type: Number, required: true },
    head: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date },
    paidDate: { type: Date },
    status: { type: String, enum: ['Pending', 'Paid', 'Overdue'], default: 'Pending' }
  }],
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Installment', installmentSchema);
