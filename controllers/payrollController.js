const SalaryStructure = require('../models/SalaryStructure');
const EmployeeSalary = require('../models/EmployeeSalary');
const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const { calculatePayroll } = require('../services/payrollCalculationService');

const getUserId = (req) => req.employee?._id || req.college?._id || req.superAdmin?._id;

// ==========================================
// Salary Structures
// ==========================================
exports.getSalaryStructures = async (req, res) => {
  try {
    const structures = await SalaryStructure.find({ collegeId: req.college._id }).sort({ createdAt: -1 });
    res.json(structures);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching salary structures', error: error.message });
  }
};

exports.createSalaryStructure = async (req, res) => {
  try {
    const structure = new SalaryStructure({
      ...req.body,
      collegeId: req.college._id,
      createdBy: getUserId(req)
    });
    await structure.save();
    res.status(201).json({ message: 'Salary structure created successfully', structure });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Salary structure name already exists' });
    res.status(500).json({ message: 'Error creating salary structure', error: error.message });
  }
};

// ==========================================
// Employee Salary Assignments
// ==========================================
exports.getEmployeeSalaries = async (req, res) => {
  try {
    const salaries = await EmployeeSalary.find({ collegeId: req.college._id, isActive: true })
      .populate('employeeId', 'name empId department role profilePhoto')
      .populate('salaryStructureId', 'name gross');
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employee salaries', error: error.message });
  }
};

exports.assignEmployeeSalary = async (req, res) => {
  try {
    const { employeeId, salaryStructureId, effectiveFrom, componentOverrides, grossSalary } = req.body;

    // Check if employee exists and belongs to college
    const employee = await Employee.findOne({ _id: employeeId, collegeId: req.college._id });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // End previous active salary if exists
    await EmployeeSalary.updateMany(
      { employeeId, isActive: true },
      { isActive: false, effectiveTo: new Date(effectiveFrom) }
    );

    const assignment = new EmployeeSalary({
      employeeId,
      salaryStructureId,
      effectiveFrom,
      componentOverrides,
      grossSalary,
      collegeId: req.college._id,
      createdBy: getUserId(req)
    });
    await assignment.save();

    res.status(201).json({ message: 'Salary assigned successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning salary', error: error.message });
  }
};

// ==========================================
// Payroll Generation & Processing
// ==========================================
exports.previewPayroll = async (req, res) => {
  try {
    const { month, year, employeeId } = req.body;
    
    const employeeSalary = await EmployeeSalary.findOne({ 
      employeeId, 
      collegeId: req.college._id,
      isActive: true 
    }).populate('salaryStructureId').populate('employeeId');

    if (!employeeSalary) {
      return res.status(400).json({ message: 'Salary structure is not assigned to this employee.' });
    }

    const previewData = await calculatePayroll(employeeSalary, month, year, { collegeId: req.college._id });
    // Add employee details for preview UX
    previewData.employee = {
      name: employeeSalary.employeeId.name,
      empId: employeeSalary.employeeId.empId,
      department: employeeSalary.employeeId.department
    };

    res.json(previewData);
  } catch (error) {
    res.status(500).json({ message: 'Error previewing payroll', error: error.message });
  }
};

exports.generatePayroll = async (req, res) => {
  try {
    const { month, year, employeeId } = req.body;

    // Duplicate check
    const existing = await Payroll.findOne({ employeeId, month, year, collegeId: req.college._id });
    if (existing) {
      return res.status(400).json({ message: `Payroll already exists for this employee for ${month}/${year}.` });
    }

    const employeeSalary = await EmployeeSalary.findOne({ 
      employeeId, 
      collegeId: req.college._id,
      isActive: true 
    }).populate('salaryStructureId').populate('employeeId');

    if (!employeeSalary) {
      return res.status(400).json({ message: 'Salary structure is not assigned to this employee.' });
    }

    const payrollData = await calculatePayroll(employeeSalary, month, year, { collegeId: req.college._id });

    const payroll = new Payroll({
      ...payrollData,
      employeeId,
      collegeId: req.college._id,
      generatedBy: getUserId(req),
      status: 'Generated' // Assuming direct generation. Can be 'Draft' based on config.
    });

    await payroll.save();
    res.status(201).json({ message: 'Payroll generated successfully', payroll });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: 'Payroll already exists for this employee for this month/year' });
    res.status(500).json({ message: 'Error generating payroll', error: error.message });
  }
};

exports.getPayrolls = async (req, res) => {
  try {
    const { month, year, status } = req.query;
    let filter = { collegeId: req.college._id };
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status) filter.status = status;

    const payrolls = await Payroll.find(filter)
      .populate('employeeId', 'name empId department role')
      .sort({ createdAt: -1 });
      
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payrolls', error: error.message });
  }
};

exports.getMyPayrolls = async (req, res) => {
  try {
    const employeeId = req.employee?._id || req.teacher?._id || (req.userRole === 'college_admin' ? req.college?._id : null);
    if (!employeeId) return res.status(403).json({ message: 'Only employees can access this route' });
    
    const { month, year } = req.query;
    let filter = { employeeId, collegeId: req.college._id };
    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);

    const payrolls = await Payroll.find(filter)
      .populate('employeeId', 'name empId department role')
      .sort({ createdAt: -1 });
      
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your payrolls', error: error.message });
  }
};

exports.approvePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, collegeId: req.college._id });
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    
    if (payroll.status === 'Approved' || payroll.status === 'Paid') {
      return res.status(400).json({ message: 'Payroll is already approved or paid.' });
    }

    payroll.status = 'Approved';
    payroll.approvedBy = getUserId(req);
    payroll.approvedAt = new Date();
    await payroll.save();

    res.json({ message: 'Payroll approved successfully', payroll });
  } catch (error) {
    res.status(500).json({ message: 'Error approving payroll', error: error.message });
  }
};

exports.markPaid = async (req, res) => {
  try {
    const { paymentMode, paymentDate, transactionId, bankReference, paymentNotes } = req.body;
    const payroll = await Payroll.findOne({ _id: req.params.id, collegeId: req.college._id });
    
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    if (payroll.status !== 'Approved') return res.status(400).json({ message: 'Only approved payrolls can be marked as paid.' });

    payroll.paymentStatus = 'Paid';
    payroll.status = 'Paid';
    payroll.paymentMode = paymentMode;
    payroll.paymentDate = paymentDate || new Date();
    payroll.transactionId = transactionId;
    payroll.bankReference = bankReference;
    payroll.paymentNotes = paymentNotes;
    payroll.paidBy = getUserId(req);
    
    await payroll.save();

    res.json({ message: 'Payroll marked as paid successfully', payroll });
  } catch (error) {
    res.status(500).json({ message: 'Error marking payroll as paid', error: error.message });
  }
};

exports.generatePayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findOne({ _id: req.params.id, collegeId: req.college._id })
      .populate('employeeId', 'name empId department designation role')
      .populate('collegeId', 'name address logo'); // assuming college has these fields
      
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    
    // In a real application, you might generate a PDF buffer here using a library like pdfkit.
    // For this ERP pattern, we usually return structured JSON and the React frontend renders the PDF using jspdf or directly formats a print view.
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: 'Error generating payslip', error: error.message });
  }
};
