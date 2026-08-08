const mongoose = require('mongoose');

const componentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true }, // e.g., 'BASIC', 'HRA', 'PF'
  calculationType: { type: String, enum: ['fixed', 'percentage'], required: true },
  amount: { type: Number, default: 0 }, // For fixed
  percentage: { type: Number, default: 0 }, // For percentage
  percentageOf: { type: String, default: 'BASIC' } // For percentage calculation reference
}, { _id: false });

const salaryStructureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  earnings: [componentSchema],
  deductions: [componentSchema],
  isActive: { type: Boolean, default: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' }, // or Employee
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' }
}, { timestamps: true });

// Prevent duplicate structure names in the same college
salaryStructureSchema.index({ name: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
