const FeeStructure = require('../models/FeeStructure');
const StudentFee = require('../models/StudentFee');
const FeePayment = require('../models/FeePayment');
const PendingDue = require('../models/PendingDue');
const Installment = require('../models/Installment');
const Discount = require('../models/Discount');
const Scholarship = require('../models/Scholarship');
const Refund = require('../models/Refund');
const Expense = require('../models/Expense');
const Income = require('../models/Income');
const VendorPayment = require('../models/VendorPayment');
const Payroll = require('../models/Payroll');
const Receipt = require('../models/Receipt');
const CashBank = require('../models/CashBank');
const AccountLedger = require('../models/AccountLedger');

const collegeFilter = (req) => ({ collegeId: req.college._id });

// Helper to automate posting to General Ledger & updating Cash/Bank accounts
const postToLedger = async (collegeId, { accountType, mode, particulars, dr, cr, reference, date }) => {
  try {
    let searchType = 'Bank';
    if (accountType) {
      searchType = accountType;
    } else if (mode) {
      const m = mode.toLowerCase();
      if (m === 'cash') searchType = 'Cash';
      else if (m === 'wallet') searchType = 'Wallet';
    }

    let acc = await CashBank.findOne({ type: searchType, collegeId, status: 'Active' });
    if (!acc) {
      acc = await CashBank.findOne({ collegeId, status: 'Active' });
    }

    if (!acc) {
      acc = await CashBank.create({
        name: searchType === 'Cash' ? 'Cash Book' : 'SBI Bank A/C',
        number: searchType === 'Cash' ? 'CASH-001' : 'SBI-300100200',
        type: searchType,
        balance: 0,
        status: 'Active',
        collegeId
      });
    }

    const drAmt = Number(dr) || 0;
    const crAmt = Number(cr) || 0;

    // Update account balance
    acc.balance = (acc.balance || 0) + crAmt - drAmt;
    await acc.save();

    // Create General Ledger record
    await AccountLedger.create({
      date: date || new Date(),
      account: acc.name,
      particulars,
      dr: drAmt,
      cr: crAmt,
      balance: acc.balance,
      reference,
      collegeId
    });
  } catch (err) {
    console.error('postToLedger failed:', err);
  }
};

// ─── FEE STRUCTURE ───────────────────────────────────────────────
exports.getFeeStructures = async (req, res) => {
  try {
    const { course, semester, search } = req.query;
    const filter = collegeFilter(req);
    if (course && course !== 'All') filter.courseName = course;
    if (semester && semester !== 'All') filter.semester = semester;
    if (search) filter.$or = [{ courseName: new RegExp(search, 'i') }, { semester: new RegExp(search, 'i') }];
    const data = await FeeStructure.find(filter).sort({ courseName: 1, semester: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFeeStructure = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    const item = await FeeStructure.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFeeStructure = async (req, res) => {
  try {
    const item = await FeeStructure.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Fee structure not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteFeeStructure = async (req, res) => {
  try {
    const item = await FeeStructure.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!item) return res.status(404).json({ success: false, message: 'Fee structure not found' });
    res.json({ success: true, message: 'Fee structure deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── STUDENT FEES ────────────────────────────────────────────────
exports.getStudentFees = async (req, res) => {
  try {
    const { search, status, course } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (course && course !== 'All') filter.course = course;
    if (search) filter.$or = [{ studentName: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }];
    const data = await StudentFee.find(filter).sort({ studentName: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── FEE COLLECTION ──────────────────────────────────────────────
exports.getFeeCollections = async (req, res) => {
  try {
    const { startDate, endDate, mode, search } = req.query;
    const filter = collegeFilter(req);
    if (mode) filter.mode = mode;
    if (search) filter.$or = [{ studentName: new RegExp(search, 'i') }, { receiptNo: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }];
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const data = await FeePayment.find(filter).sort({ date: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createFeeCollection = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    if (!payload.receiptNo) payload.receiptNo = `RCP/${Date.now().toString().slice(-6)}`;
    const item = await FeePayment.create(payload);

    // Post to General Ledger
    await postToLedger(req.college._id, {
      mode: item.mode,
      particulars: `Fee received: ${item.studentName || 'Student'} (${item.enrollNo || ''}) - ${item.feeHeads ? item.feeHeads.map(h => h.head).join(', ') : 'Fees'}`,
      cr: item.amount,
      dr: 0,
      reference: item.receiptNo,
      date: item.date
    });

    // Update StudentFee Ledger
    if (item.enrollNo) {
      const feeLedger = await StudentFee.findOne({ enrollNo: item.enrollNo, collegeId: req.college._id });
      if (feeLedger) {
        feeLedger.paid = (feeLedger.paid || 0) + item.amount;
        feeLedger.pending = (feeLedger.totalFee || 0) - feeLedger.paid - (feeLedger.discount || 0) - (feeLedger.scholarship || 0) + (feeLedger.fine || 0);
        if (feeLedger.pending < 0) feeLedger.pending = 0;
        
        if (feeLedger.pending === 0) feeLedger.status = 'Paid';
        else if (feeLedger.paid > 0) feeLedger.status = 'Partial';
        else feeLedger.status = 'Pending';
        
        await feeLedger.save();
      }

      // Update Installments if applicable
      if (item.feeHeads && item.feeHeads.length > 0) {
        const instRecord = await Installment.findOne({ enrollNo: item.enrollNo, collegeId: req.college._id });
        if (instRecord && instRecord.installments) {
          let updated = false;
          for (let fh of item.feeHeads) {
            const inst = instRecord.installments.find(i => i.head === fh.head && i.status !== 'Paid');
            if (inst) {
              inst.status = 'Paid';
              inst.paidDate = item.date;
              inst.amount = fh.amount; // update just in case
              instRecord.paidAmount = (instRecord.paidAmount || 0) + fh.amount;
              updated = true;
            }
          }
          if (updated) await instRecord.save();
        }

        // Update PendingDues if applicable
        for (let fh of item.feeHeads) {
          await PendingDue.findOneAndUpdate(
            { enrollNo: item.enrollNo, dueHead: fh.head, collegeId: req.college._id, status: { $ne: 'Paid' } },
            { $set: { status: 'Paid' } }
          );
        }
      }
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PENDING DUES ────────────────────────────────────────────────
exports.getPendingDues = async (req, res) => {
  try {
    const { status, course, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (course && course !== 'All') filter.course = course;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }];
    const data = await PendingDue.find(filter).sort({ dueDate: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePendingDue = async (req, res) => {
  try {
    const item = await PendingDue.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Pending due not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── INSTALLMENTS ────────────────────────────────────────────────
exports.getInstallments = async (req, res) => {
  try {
    const { course, search } = req.query;
    const filter = collegeFilter(req);
    if (course && course !== 'All') filter.course = course;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }];
    const data = await Installment.find(filter).sort({ enrollNo: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateInstallment = async (req, res) => {
  try {
    const item = await Installment.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Installment not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.requestExtension = async (req, res) => {
  try {
    const { enrollNo, installmentNo, newDueDate, reason } = req.body;
    const instRecord = await Installment.findOne({ enrollNo, ...collegeFilter(req) });
    if (!instRecord) return res.status(404).json({ success: false, message: 'Installment record not found for this enrollment number' });
    
    let updated = false;
    for (let inst of instRecord.installments) {
      if (inst.no == installmentNo) {
        inst.dueDate = newDueDate;
        updated = true;
        break;
      }
    }
    
    if (!updated) return res.status(404).json({ success: false, message: 'Installment number not found' });
    
    await instRecord.save();
    res.json({ success: true, message: 'Extension applied successfully', data: instRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DISCOUNTS ───────────────────────────────────────────────────
exports.getDiscounts = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (type) filter.type = type;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }];
    const data = await Discount.find(filter).sort({ requestDate: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDiscount = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    const item = await Discount.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateDiscount = async (req, res) => {
  try {
    const item = await Discount.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Discount not found' });
    
    // Apply discount to student fee ledger if approved
    if (req.body.status === 'Approved' && item.studentId) {
      const feeLedger = await StudentFee.findOne({ studentId: item.studentId, collegeId: req.college._id });
      if (feeLedger) {
        feeLedger.discount = (feeLedger.discount || 0) + item.amount;
        feeLedger.pending = (feeLedger.totalFee || 0) - (feeLedger.paid || 0) - feeLedger.discount - (feeLedger.scholarship || 0) + (feeLedger.fine || 0);
        if (feeLedger.pending < 0) feeLedger.pending = 0;
        if (feeLedger.pending === 0) feeLedger.status = 'Paid';
        else if (feeLedger.paid > 0) feeLedger.status = 'Partial';
        else feeLedger.status = 'Pending';
        await feeLedger.save();
      }
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteDiscount = async (req, res) => {
  try {
    const item = await Discount.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!item) return res.status(404).json({ success: false, message: 'Discount not found' });
    res.json({ success: true, message: 'Discount deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── SCHOLARSHIPS ────────────────────────────────────────────────
exports.getScholarships = async (req, res) => {
  try {
    const { sanctionStatus, category, search } = req.query;
    const filter = collegeFilter(req);
    if (sanctionStatus && sanctionStatus !== 'All') filter.sanctionStatus = sanctionStatus;
    if (category) filter.category = category;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }, { scheme: new RegExp(search, 'i') }];
    const data = await Scholarship.find(filter).sort({ requestDate: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createScholarship = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    const item = await Scholarship.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateScholarship = async (req, res) => {
  try {
    const item = await Scholarship.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    
    // Apply scholarship to student fee ledger if sanctioned
    if (req.body.sanctionStatus === 'Sanctioned' && item.studentId && !item.ledgerAdjusted) {
      const feeLedger = await StudentFee.findOne({ studentId: item.studentId, collegeId: req.college._id });
      if (feeLedger) {
        feeLedger.scholarship = (feeLedger.scholarship || 0) + item.amount;
        feeLedger.pending = (feeLedger.totalFee || 0) - (feeLedger.paid || 0) - (feeLedger.discount || 0) - feeLedger.scholarship + (feeLedger.fine || 0);
        if (feeLedger.pending < 0) feeLedger.pending = 0;
        if (feeLedger.pending === 0) feeLedger.status = 'Paid';
        else if (feeLedger.paid > 0) feeLedger.status = 'Partial';
        else feeLedger.status = 'Pending';
        await feeLedger.save();
        
        // Mark as adjusted
        item.ledgerAdjusted = true;
        await item.save();
      }
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteScholarship = async (req, res) => {
  try {
    const item = await Scholarship.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!item) return res.status(404).json({ success: false, message: 'Scholarship not found' });
    res.json({ success: true, message: 'Scholarship deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── REFUNDS ─────────────────────────────────────────────────────
exports.getRefunds = async (req, res) => {
  try {
    const { status, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }, { refundNo: new RegExp(search, 'i') }];
    const data = await Refund.find(filter).sort({ requestDate: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createRefund = async (req, res) => {
  try {
    const { studentId: enrollNo, reason, refundAmount, deduction, payMode, bankDetails } = req.body;
    
    // Find student fee ledger to get details
    const studentFee = await StudentFee.findOne({ enrollNo, ...collegeFilter(req) });
    if (!studentFee) return res.status(404).json({ success: false, message: 'Student Fee record not found for this enrollment number' });

    const payload = {
      refundNo: `REF/${Date.now().toString().slice(-6)}`,
      enrollNo: studentFee.enrollNo,
      name: studentFee.studentName,
      course: studentFee.course,
      reason,
      totalPaid: studentFee.paid || 0,
      deduction: Number(deduction) || 0,
      refundAmount: Number(refundAmount) || 0,
      payMode,
      bankDetails,
      collegeId: req.college._id
    };

    const item = await Refund.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRefund = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...collegeFilter(req) };
    const prevItem = await Refund.findOne(filter);

    const item = await Refund.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Refund not found' });

    // If refund is completed, deduct from student paid fees and post to general ledger
    if (req.body.status === 'Completed' && item.enrollNo && (!prevItem || prevItem.status !== 'Completed')) {
      const feeLedger = await StudentFee.findOne({ enrollNo: item.enrollNo, collegeId: req.college._id });
      if (feeLedger) {
        feeLedger.paid = Math.max(0, (feeLedger.paid || 0) - (item.refundAmount || 0));
        feeLedger.pending = (feeLedger.totalFee || 0) - feeLedger.paid - (feeLedger.discount || 0) - (feeLedger.scholarship || 0) + (feeLedger.fine || 0);
        if (feeLedger.pending < 0) feeLedger.pending = 0;
        feeLedger.status = feeLedger.pending === 0 ? 'Paid' : (feeLedger.paid > 0 ? 'Partial' : 'Pending');
        await feeLedger.save();
      }

      // Post to General Ledger
      await postToLedger(req.college._id, {
        mode: item.payMode,
        particulars: `Fee Refund: ${item.name} (${item.enrollNo}) - Reason: ${item.reason || ''}`,
        cr: 0,
        dr: item.refundAmount,
        reference: item.refundNo,
        date: new Date()
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── EXPENSES ────────────────────────────────────────────────────
exports.getExpenses = async (req, res) => {
  try {
    const { approvalStatus, category, startDate, endDate, search } = req.query;
    const filter = collegeFilter(req);
    if (approvalStatus && approvalStatus !== 'All') filter.approvalStatus = approvalStatus;
    if (category) filter.category = category;
    if (search) filter.$or = [{ vendor: new RegExp(search, 'i') }, { invoiceNo: new RegExp(search, 'i') }, { expNo: new RegExp(search, 'i') }];
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const data = await Expense.find(filter).sort({ date: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createExpense = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    if (!payload.expNo) payload.expNo = `EXP/${Date.now().toString().slice(-6)}`;
    const item = await Expense.create(payload);

    if (item.approvalStatus === 'Approved') {
      await postToLedger(req.college._id, {
        mode: item.mode,
        particulars: `Expense: ${item.vendor} - ${item.category} (${item.description || ''})`,
        cr: 0,
        dr: item.amount,
        reference: item.expNo,
        date: item.date
      });
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...collegeFilter(req) };
    const prevItem = await Expense.findOne(filter);

    const item = await Expense.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Expense not found' });

    if (item.approvalStatus === 'Approved' && (!prevItem || prevItem.approvalStatus !== 'Approved')) {
      await postToLedger(req.college._id, {
        mode: item.mode,
        particulars: `Expense: ${item.vendor} - ${item.category} (${item.description || ''})`,
        cr: 0,
        dr: item.amount,
        reference: item.expNo,
        date: item.date
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── INCOME ──────────────────────────────────────────────────────
exports.getIncomes = async (req, res) => {
  try {
    const { status, category, startDate, endDate, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$or = [{ source: new RegExp(search, 'i') }, { receiptNo: new RegExp(search, 'i') }];
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const data = await Income.find(filter).sort({ date: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createIncome = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    if (!payload.receiptNo) payload.receiptNo = `INC/${Date.now().toString().slice(-6)}`;
    const item = await Income.create(payload);

    if (item.status === 'Received') {
      await postToLedger(req.college._id, {
        mode: item.mode,
        particulars: `Income: ${item.source} - ${item.category} (${item.description || ''})`,
        cr: item.amount,
        dr: 0,
        reference: item.receiptNo,
        date: item.date
      });
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateIncome = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...collegeFilter(req) };
    const prevItem = await Income.findOne(filter);

    const item = await Income.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Income not found' });

    if (item.status === 'Received' && (!prevItem || prevItem.status !== 'Received')) {
      await postToLedger(req.college._id, {
        mode: item.mode,
        particulars: `Income: ${item.source} - ${item.category} (${item.description || ''})`,
        cr: item.amount,
        dr: 0,
        reference: item.receiptNo,
        date: item.date
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── VENDOR PAYMENTS ─────────────────────────────────────────────
exports.getVendorPayments = async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (category) filter.category = category;
    if (search) filter.$or = [{ vendor: new RegExp(search, 'i') }, { invoiceNo: new RegExp(search, 'i') }];
    const data = await VendorPayment.find(filter).sort({ dueDate: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createVendorPayment = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    if (!payload.invoiceNo) payload.invoiceNo = `VP/${Date.now().toString().slice(-6)}`;
    const item = await VendorPayment.create(payload);

    if (item.status === 'Paid') {
      await postToLedger(req.college._id, {
        mode: item.mode,
        particulars: `Vendor Payment: ${item.vendor} - ${item.category} (${item.description || ''})`,
        cr: 0,
        dr: item.amount,
        reference: item.invoiceNo,
        date: item.datePaid || item.createdAt
      });
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateVendorPayment = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...collegeFilter(req) };
    const prevItem = await VendorPayment.findOne(filter);

    const item = await VendorPayment.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Vendor payment not found' });

    if (item.status === 'Paid' && (!prevItem || prevItem.status !== 'Paid')) {
      await postToLedger(req.college._id, {
        mode: item.mode,
        particulars: `Vendor Payment: ${item.vendor} - ${item.category} (${item.description || ''})`,
        cr: 0,
        dr: item.amount,
        reference: item.invoiceNo,
        date: item.datePaid || new Date()
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── PAYROLL ─────────────────────────────────────────────────────
exports.getPayrolls = async (req, res) => {
  try {
    const { status, month, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (month) filter.month = month;
    if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { empId: new RegExp(search, 'i') }];
    const data = await Payroll.find(filter).sort({ month: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createPayroll = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    const item = await Payroll.create(payload);

    if (item.status === 'Paid') {
      await postToLedger(req.college._id, {
        mode: 'Bank Transfer',
        particulars: `Payroll Disbursed: ${item.name} (${item.empId}) - ${item.month}`,
        cr: 0,
        dr: item.net,
        reference: `PAY-${Date.now().toString().slice(-6)}`,
        date: item.datePaid || item.createdAt
      });
    }

    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updatePayroll = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...collegeFilter(req) };
    const prevItem = await Payroll.findOne(filter);

    const item = await Payroll.findOneAndUpdate(filter, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Payroll not found' });

    if (item.status === 'Paid' && (!prevItem || prevItem.status !== 'Paid')) {
      await postToLedger(req.college._id, {
        mode: 'Bank Transfer',
        particulars: `Payroll Disbursed: ${item.name} (${item.empId}) - ${item.month}`,
        cr: 0,
        dr: item.net,
        reference: `PAY-${Date.now().toString().slice(-6)}`,
        date: item.datePaid || new Date()
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── RECEIPTS ────────────────────────────────────────────────────
exports.getReceipts = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (type) filter.type = type;
    if (search) filter.$or = [{ receiptNo: new RegExp(search, 'i') }, { reference: new RegExp(search, 'i') }];
    let data = await Receipt.find(filter).lean();
    
    // Also fetch FeePayments if type allows
    if (!type || type === 'All' || type === 'Fee Receipt') {
       const feeFilter = collegeFilter(req);
       if (status && status !== 'All') feeFilter.status = status;
       if (search) feeFilter.$or = [{ receiptNo: new RegExp(search, 'i') }, { studentName: new RegExp(search, 'i') }, { enrollNo: new RegExp(search, 'i') }];
       const feePayments = await FeePayment.find(feeFilter).lean();
       
       const mappedFees = feePayments.map(f => ({
         _id: f._id,
         receiptNo: f.receiptNo,
         reference: `${f.studentName} (${f.enrollNo})`,
         type: 'Fee Receipt',
         amount: f.amount,
         mode: f.mode,
         status: f.status,
         date: f.date,
         remarks: f.remarks
       }));
       
       data = [...data, ...mappedFees];
    }
    
    // Sort combined data descending by date
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createReceipt = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    if (!payload.receiptNo) payload.receiptNo = `RCT/${Date.now().toString().slice(-6)}`;
    const item = await Receipt.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateReceipt = async (req, res) => {
  try {
    let item = await Receipt.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { returnDocument: 'after' });
    if (!item) {
      item = await FeePayment.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { returnDocument: 'after' });
      if (!item) return res.status(404).json({ success: false, message: 'Receipt not found' });
      
      // If it was a FeePayment that got cancelled, update the StudentFee ledger
      if (req.body.status === 'Cancelled' && item.enrollNo) {
        const feeLedger = await StudentFee.findOne({ enrollNo: item.enrollNo, collegeId: req.college._id });
        if (feeLedger) {
          feeLedger.paid = Math.max(0, (feeLedger.paid || 0) - item.amount);
          feeLedger.pending = (feeLedger.totalFee || 0) - feeLedger.paid - (feeLedger.discount || 0) - (feeLedger.scholarship || 0) + (feeLedger.fine || 0);
          if (feeLedger.pending < 0) feeLedger.pending = 0;
          feeLedger.status = feeLedger.pending === 0 ? 'Paid' : (feeLedger.paid > 0 ? 'Partial' : 'Pending');
          await feeLedger.save();
        }
      }
    }
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── CASH / BANK ─────────────────────────────────────────────────
exports.getCashBanks = async (req, res) => {
  try {
    const data = await CashBank.find(collegeFilter(req)).sort({ name: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCashBank = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    const item = await CashBank.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCashBank = async (req, res) => {
  try {
    const item = await CashBank.findOneAndUpdate({ _id: req.params.id, ...collegeFilter(req) }, req.body, { returnDocument: 'after' });
    if (!item) return res.status(404).json({ success: false, message: 'Account not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const { type, startDate, endDate, search } = req.query;
    const filter = collegeFilter(req);
    if (type) filter.type = type;
    if (search) filter.$or = [{ desc: new RegExp(search, 'i') }, { from: new RegExp(search, 'i') }, { to: new RegExp(search, 'i') }];
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const data = await AccountLedger.find(filter).sort({ date: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const collegeId = req.college._id;

    // 1. Manual Ledger Entry
    if (req.body.account) {
      const { account, particulars, dr, cr, date, reference } = req.body;
      const drAmt = Number(dr) || 0;
      const crAmt = Number(cr) || 0;

      if (drAmt === 0 && crAmt === 0) {
        return res.status(400).json({ success: false, message: 'Either Debit (Dr) or Credit (Cr) must be greater than zero' });
      }

      // Update the account balance in CashBank
      const acc = await CashBank.findOne({ name: account, collegeId });
      let balance = 0;
      if (acc) {
        acc.balance = (acc.balance || 0) + crAmt - drAmt;
        await acc.save();
        balance = acc.balance;
      } else {
        // Fallback: calculate running balance from last ledger entry
        const lastEntry = await AccountLedger.findOne({ account, collegeId }).sort({ date: -1, createdAt: -1 });
        const lastBalance = lastEntry ? lastEntry.balance : 0;
        balance = lastBalance + crAmt - drAmt;
      }

      const item = await AccountLedger.create({
        date: date || new Date(),
        account,
        particulars,
        dr: drAmt,
        cr: crAmt,
        balance,
        reference: reference || `MAN-${Date.now()}`,
        collegeId
      });

      return res.status(201).json({ success: true, data: item });
    }

    // 2. Contra Transfer Entry
    const { from, to, amount, date, desc } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, message: 'Invalid amount' });

    // Debit from-account
    if (from) {
      const fromAcc = await CashBank.findOne({ name: from, collegeId });
      if (fromAcc) {
        fromAcc.balance = (fromAcc.balance || 0) - amt;
        await fromAcc.save();
        await AccountLedger.create({ date: date || new Date(), account: from, particulars: desc || `Transfer to ${to}`, dr: amt, cr: 0, balance: fromAcc.balance, reference: `CONTRA-${Date.now()}`, collegeId });
      }
    }
    // Credit to-account
    if (to) {
      const toAcc = await CashBank.findOne({ name: to, collegeId });
      if (toAcc) {
        toAcc.balance = (toAcc.balance || 0) + amt;
        await toAcc.save();
        await AccountLedger.create({ date: date || new Date(), account: to, particulars: desc || `Transfer from ${from}`, dr: 0, cr: amt, balance: toAcc.balance, reference: `CONTRA-${Date.now()}`, collegeId });
      }
    }

    res.status(201).json({ success: true, message: 'Transfer recorded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ACCOUNT LEDGER ──────────────────────────────────────────────
exports.getAccountLedger = async (req, res) => {
  try {
    const { account, startDate, endDate } = req.query;
    const filter = collegeFilter(req);
    if (account) filter.account = account;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const data = await AccountLedger.find(filter).sort({ date: 1 });
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── FINANCIAL REPORTS ───────────────────────────────────────────
exports.getFinancialReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const filter = { ...collegeFilter(req), date: { $gte: start, $lte: end } };

    const totalFeeCollected = await FeePayment.aggregate([
      { $match: { ...filter, status: 'Completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalExpenses = await Expense.aggregate([
      { $match: { ...filter, approvalStatus: 'Approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalIncome = await Income.aggregate([
      { $match: { ...filter, status: 'Received' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingDuesTotal = await PendingDue.aggregate([
      { $match: { ...filter, status: 'Overdue' } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } }
    ]);

    const monthlyCollections = await FeePayment.aggregate([
      { $match: { ...filter, status: 'Completed', date: { $gte: start, $lte: end } } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
      { $sort: { '_id': 1 } }
    ]);

    const monthlyExpenses = await Expense.aggregate([
      { $match: { ...filter, approvalStatus: 'Approved', date: { $gte: start, $lte: end } } },
      { $group: { _id: { $month: '$date' }, total: { $sum: '$amount' } } },
      { $sort: { '_id': 1 } }
    ]);

    const feeCollectedAmt = totalFeeCollected[0]?.total || 0;
    const miscIncomeAmt = totalIncome[0]?.total || 0;
    const expensesAmt = totalExpenses[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalFeeCollected: feeCollectedAmt,
        totalExpenses: expensesAmt,
        totalIncome: feeCollectedAmt + miscIncomeAmt,
        pendingDuesTotal: pendingDuesTotal[0]?.total || 0,
        netBalance: (feeCollectedAmt + miscIncomeAmt) - expensesAmt,
        monthlyCollections,
        monthlyExpenses
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
