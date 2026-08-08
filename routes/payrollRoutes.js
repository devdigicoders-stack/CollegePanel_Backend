const express = require('express');
const router = express.Router();
const { collegeProtect } = require('../middlewares/authMiddleware');

const {
  getSalaryStructures,
  createSalaryStructure,
  getEmployeeSalaries,
  assignEmployeeSalary,
  previewPayroll,
  generatePayroll,
  getPayrolls,
  approvePayroll,
  markPaid,
  generatePayslip,
  getMyPayrolls
} = require('../controllers/payrollController');

// For simplicity in this implementation, we use generic HR/Admin roles. 
// A robust RBAC system would map custom roles via authorize('payroll.view') etc.
// Assuming collegeProtect handles standard college identification.

router.route('/salary-structures')
  .get(collegeProtect, getSalaryStructures)
  .post(collegeProtect, createSalaryStructure);

router.route('/employee-salaries')
  .get(collegeProtect, getEmployeeSalaries);

router.route('/employee-salaries/assign')
  .post(collegeProtect, assignEmployeeSalary);

router.route('/preview')
  .post(collegeProtect, previewPayroll);

router.route('/generate')
  .post(collegeProtect, generatePayroll);

router.route('/')
  .get(collegeProtect, getPayrolls);

router.route('/my-history')
  .get(collegeProtect, getMyPayrolls);

router.route('/:id/approve')
  .post(collegeProtect, approvePayroll);

router.route('/:id/mark-paid')
  .post(collegeProtect, markPaid);

router.route('/:id/payslip')
  .get(collegeProtect, generatePayslip);

module.exports = router;
