const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema({
  courseName: { type: String, required: true },
  semester: { type: String, required: true },
  admissionFee: { type: Number, default: 0 },
  tuitionFee: { type: Number, default: 0 },
  registrationFee: { type: Number, default: 0 },
  examFee: { type: Number, default: 0 },
  labFee: { type: Number, default: 0 },
  total: { type: Number, required: true },
  installments: { type: Number, default: 1 },
  dueDate: { type: Date },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true }
}, { timestamps: true });

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
