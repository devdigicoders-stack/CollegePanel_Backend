const mongoose = require('mongoose');

const componentOverrideSchema = new mongoose.Schema({
  code: { type: String, required: true }, // e.g., 'BASIC'
  amount: { type: Number, required: true } // The exact overridden amount
}, { _id: false });

const employeeSalarySchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure', required: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null }, // Null means currently active
  
  // Array of overridden components for this specific employee
  // (e.g., specific basic salary amount instead of structure's default)
  componentOverrides: [componentOverrideSchema],
  
  grossSalary: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true },
  
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' }, // or Employee ID based on auth
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' }
}, { timestamps: true });

// Help prevent multiple active salaries for the same employee
// Though effectiveFrom logic handles this, a basic index helps
employeeSalarySchema.index({ employeeId: 1, collegeId: 1 });

module.exports = mongoose.model('EmployeeSalary', employeeSalarySchema);
