const mongoose = require('mongoose');

const componentSnapshotSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  amount: { type: Number, required: true }
}, { _id: false });

const manualAdjustmentSchema = new mongoose.Schema({
  type: { type: String, enum: ['Earning', 'Deduction'], required: true },
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  reason: { type: String, default: '' },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' }, // or Employee
  date: { type: Date, default: Date.now }
}, { _id: false });

const payrollSchema = new mongoose.Schema({
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: 'College', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  
  month: { type: Number, required: true }, // 1 to 12
  year: { type: Number, required: true },  // e.g., 2026
  
  payrollPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  
  // Snapshots to freeze historical calculation
  salarySnapshot: {
    salaryStructureId: { type: mongoose.Schema.Types.ObjectId, ref: 'SalaryStructure' },
    calculationBasis: { type: String, default: 'calendar_days' }
  },
  
  attendanceSummary: {
    calendarDays: { type: Number, default: 0 },
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 }, // Used for LOP
    halfDays: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    weekOffs: { type: Number, default: 0 }
  },
  
  // Calculated financial components
  earnings: [componentSnapshotSchema],
  deductions: [componentSnapshotSchema],
  adjustments: [manualAdjustmentSchema],
  
  // Financial Totals
  grossSalary: { type: Number, required: true }, // Original full salary
  totalEarnings: { type: Number, required: true }, // Adjusted earnings based on attendance
  totalDeductions: { type: Number, required: true }, // Taxes + PF + LOP
  netSalary: { type: Number, required: true }, // Final take-home pay
  
  status: { type: String, enum: ['Draft', 'Generated', 'Approved', 'Cancelled'], default: 'Draft' },
  
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' },
  generatedAt: { type: Date, default: Date.now },
  
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' },
  approvedAt: { type: Date },
  
  // Payment specifics
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paymentMode: { type: String, enum: ['Bank Transfer', 'Cash', 'Cheque', 'UPI', 'Other'] },
  paymentDate: { type: Date },
  transactionId: { type: String },
  bankReference: { type: String },
  paymentNotes: { type: String },
  paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' }
}, { timestamps: true });

// Prevent duplicate payroll for the same employee in the same month/year
payrollSchema.index({ employeeId: 1, month: 1, year: 1, collegeId: 1 }, { unique: true });

module.exports = mongoose.model('Payroll', payrollSchema);
