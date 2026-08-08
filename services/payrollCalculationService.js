const FacultyAttendance = require('../models/FacultyAttendance');
// If there's a separate EmployeeAttendance model, it should be required here too.

/**
 * Calculate payroll for a given employee and month.
 * @param {Object} employeeSalary - Populated EmployeeSalary document
 * @param {Number} month - Month (1-12)
 * @param {Number} year - Year (e.g. 2026)
 * @param {Object} options - { collegeId }
 * @returns {Object} - Calculated payroll data ready to be saved/previewed
 */
exports.calculatePayroll = async (employeeSalary, month, year, options) => {
  const { collegeId } = options;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of the month
  const calendarDays = endDate.getDate();

  // 1. Calculate Base Components from Salary Structure & Overrides
  let basic = 0;
  const earningsSnapshot = [];
  const deductionsSnapshot = [];
  
  // Merge overrides into structure
  const getComponentValue = (component) => {
    const override = employeeSalary.componentOverrides?.find(o => o.code === component.code);
    if (override) return override.amount;
    
    if (component.calculationType === 'fixed') {
      return component.amount;
    } else if (component.calculationType === 'percentage') {
      // Assuming percentage is of BASIC for now
      return (basic * component.percentage) / 100;
    }
    return 0;
  };

  // Find BASIC first
  const basicComponent = employeeSalary.salaryStructureId.earnings.find(e => e.code === 'BASIC');
  if (basicComponent) {
    const override = employeeSalary.componentOverrides?.find(o => o.code === 'BASIC');
    basic = override ? override.amount : basicComponent.amount;
    earningsSnapshot.push({ name: basicComponent.name, code: 'BASIC', amount: basic });
  }

  let grossSalary = basic;

  // Process other earnings
  employeeSalary.salaryStructureId.earnings.forEach(e => {
    if (e.code !== 'BASIC') {
      const val = getComponentValue(e);
      grossSalary += val;
      earningsSnapshot.push({ name: e.name, code: e.code, amount: val });
    }
  });

  // Process deductions
  let standardDeductions = 0;
  employeeSalary.salaryStructureId.deductions.forEach(d => {
    const val = getComponentValue(d);
    standardDeductions += val;
    deductionsSnapshot.push({ name: d.name, code: d.code, amount: val });
  });

  // 2. Fetch Attendance
  // Assuming FacultyAttendance tracks all employees for now, or adapt as needed
  const attendanceRecords = await FacultyAttendance.find({
    collegeId,
    date: { $gte: startDate, $lte: endDate },
    'records.facultyId': employeeSalary.employeeId._id
  });

  let presentDays = 0;
  let absentDays = 0;
  let paidLeaveDays = 0;
  
  // Sundays are typically weekOffs
  let weekOffs = 0;
  for (let d = 1; d <= calendarDays; d++) {
    const date = new Date(year, month - 1, d);
    if (date.getDay() === 0) weekOffs++; // Sunday
  }

  attendanceRecords.forEach(dayRecord => {
    const record = dayRecord.records.find(r => r.facultyId.toString() === employeeSalary.employeeId._id.toString());
    if (record) {
      if (record.status === 'Present') presentDays += 1;
      else if (record.status === 'Half Day') presentDays += 0.5;
      else if (record.status === 'Absent') absentDays += 1;
      else if (record.status === 'On Leave') paidLeaveDays += 1; // Simplified: Assuming 'On Leave' is paid for now. Real logic might check LeaveRequest status.
    }
  });

  const workingDays = calendarDays - weekOffs;
  
  // The user wants strictly attendance-based calculation:
  // Paid Days = Present + Paid Leaves
  // Proportionate WeekOffs = (Paid Days / Working Days) * WeekOffs
  const actualPaidDays = presentDays + paidLeaveDays;
  let earnedWeekOffs = 0;
  
  if (actualPaidDays > 0) {
    earnedWeekOffs = Math.round((actualPaidDays / workingDays) * weekOffs);
  }
  
  const totalPaidDays = actualPaidDays + earnedWeekOffs;
  let unpaidLeaveDays = calendarDays - totalPaidDays;
  if (unpaidLeaveDays < 0) unpaidLeaveDays = 0; // Sanity check
  
  // 3. Apply Attendance LOP (Loss of Pay)
  // Per day salary = Gross / calendarDays (as per configuration, assuming calendar_days)
  const perDaySalary = grossSalary / calendarDays;
  const lopDeduction = perDaySalary * unpaidLeaveDays;
  
  if (lopDeduction > 0) {
    deductionsSnapshot.push({ name: 'Loss of Pay', code: 'LOP', amount: Math.round(lopDeduction) });
  }

  const totalDeductions = Math.round(standardDeductions + lopDeduction);
  
  // Assuming no manual adjustments yet, totalEarnings = grossSalary (base)
  const totalEarnings = Math.round(grossSalary);
  const netSalary = Math.round(totalEarnings - totalDeductions);

  return {
    month,
    year,
    payrollPeriod: { startDate, endDate },
    salarySnapshot: {
      salaryStructureId: employeeSalary.salaryStructureId._id,
      calculationBasis: 'calendar_days'
    },
    attendanceSummary: {
      calendarDays,
      workingDays,
      presentDays,
      absentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      halfDays: 0,
      holidays: 0,
      weekOffs
    },
    earnings: earningsSnapshot,
    deductions: deductionsSnapshot,
    adjustments: [],
    grossSalary: Math.round(grossSalary),
    totalEarnings,
    totalDeductions,
    netSalary,
    status: 'Draft'
  };
};
