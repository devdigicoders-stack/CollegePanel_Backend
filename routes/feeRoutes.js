const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { protect, collegeProtect } = require('../middlewares/authMiddleware');

// Apply collegeProtect middleware to all fee routes
router.use(collegeProtect);

// Fee Structure
router.get('/fee-structures', feeController.getFeeStructures);
router.get('/structure', feeController.getFeeStructures); // alias
router.post('/fee-structures', feeController.createFeeStructure);
router.put('/fee-structures/:id', feeController.updateFeeStructure);
router.delete('/fee-structures/:id', feeController.deleteFeeStructure);

// Student Fees
router.get('/student-fees', feeController.getStudentFees);

// Fee Collections
router.get('/collections', feeController.getFeeCollections);
router.get('/payments', feeController.getFeeCollections); // alias
router.post('/collections', feeController.createFeeCollection);

// Pending Dues
router.get('/pending-dues', feeController.getPendingDues);
router.put('/pending-dues/:id', feeController.updatePendingDue);

// Installments
router.get('/installments', feeController.getInstallments);
router.post('/installments/extension', feeController.requestExtension);
router.put('/installments/:id', feeController.updateInstallment);

// Discounts
router.get('/discounts', feeController.getDiscounts);
router.post('/discounts', feeController.createDiscount);
router.put('/discounts/:id', feeController.updateDiscount);
router.delete('/discounts/:id', feeController.deleteDiscount);

// Scholarships
router.get('/scholarships', feeController.getScholarships);
router.post('/scholarships', feeController.createScholarship);
router.put('/scholarships/:id', feeController.updateScholarship);
router.delete('/scholarships/:id', feeController.deleteScholarship);

// Refunds
router.get('/refunds', feeController.getRefunds);
router.post('/refunds', feeController.createRefund);
router.put('/refunds/:id', feeController.updateRefund);

// Expenses
router.get('/expenses', feeController.getExpenses);
router.post('/expenses', feeController.createExpense);
router.put('/expenses/:id', feeController.updateExpense);

// Income
router.get('/income', feeController.getIncomes);
router.post('/income', feeController.createIncome);
router.put('/income/:id', feeController.updateIncome);

// Vendor Payments
router.get('/vendor-payments', feeController.getVendorPayments);
router.post('/vendor-payments', feeController.createVendorPayment);
router.put('/vendor-payments/:id', feeController.updateVendorPayment);

// Payroll
router.get('/payroll', feeController.getPayrolls);
router.post('/payroll', feeController.createPayroll);
router.put('/payroll/:id', feeController.updatePayroll);

// Receipts
router.get('/receipts', feeController.getReceipts);
router.post('/receipts', feeController.createReceipt);
router.put('/receipts/:id', feeController.updateReceipt);

// Cash / Bank
router.get('/cash-bank', feeController.getCashBanks);
router.post('/cash-bank', feeController.createCashBank);
router.put('/cash-bank/:id', feeController.updateCashBank);

// Transactions
router.get('/transactions', feeController.getTransactions);
router.post('/transactions', feeController.createTransaction);

// Account Ledger
router.get('/ledger', feeController.getAccountLedger);

// Financial Reports
router.get('/reports', feeController.getFinancialReports);

module.exports = router;
