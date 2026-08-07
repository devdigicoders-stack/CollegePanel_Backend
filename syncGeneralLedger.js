const mongoose = require('mongoose');
const CashBank = require('./models/CashBank');
const AccountLedger = require('./models/AccountLedger');
const FeePayment = require('./models/FeePayment');
const Expense = require('./models/Expense');
const Income = require('./models/Income');
const VendorPayment = require('./models/VendorPayment');
const Payroll = require('./models/Payroll');
const Refund = require('./models/Refund');

const MONGODB_URI = 'mongodb+srv://digicodersdevelopment_db_user:KoJGvdKsGU9IQQvk@cluster0.9ssqshr.mongodb.net/crm_clg_dct?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB.');

  const postToLedger = async (collegeId, { accountType, mode, particulars, dr, cr, reference, date }) => {
    const existing = await AccountLedger.findOne({ reference, collegeId });
    if (existing) {
      console.log(`[Skip] Reference ${reference} already exists in General Ledger.`);
      return;
    }

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
    console.log(`[Synced] ${particulars} (Dr: ${drAmt}, Cr: ${crAmt}, Ref: ${reference})`);
  };

  // 1. Sync Fee Payments
  const payments = await FeePayment.find({ status: 'Completed' });
  console.log(`Found ${payments.length} completed fee payments.`);
  for (const p of payments) {
    const headsStr = p.feeHeads ? p.feeHeads.map(h => h.head).join(', ') : 'Fees';
    await postToLedger(p.collegeId, {
      mode: p.mode,
      particulars: `Fee received: ${p.studentName} (${p.enrollNo}) - ${headsStr}`,
      cr: p.amount,
      dr: 0,
      reference: p.receiptNo,
      date: p.date
    });
  }

  // 2. Sync Approved Expenses
  const expenses = await Expense.find({ approvalStatus: 'Approved' });
  console.log(`Found ${expenses.length} approved expenses.`);
  for (const e of expenses) {
    await postToLedger(e.collegeId, {
      mode: e.mode,
      particulars: `Expense: ${e.vendor} - ${e.category} (${e.description || ''})`,
      cr: 0,
      dr: e.amount,
      reference: e.expNo,
      date: e.date
    });
  }

  // 3. Sync Received Incomes
  const incomes = await Income.find({ status: 'Received' });
  console.log(`Found ${incomes.length} received incomes.`);
  for (const inc of incomes) {
    await postToLedger(inc.collegeId, {
      mode: inc.mode,
      particulars: `Income: ${inc.source} - ${inc.category} (${inc.description || ''})`,
      cr: inc.amount,
      dr: 0,
      reference: inc.receiptNo,
      date: inc.date
    });
  }

  // 4. Sync Paid Vendor Payments
  const vendorPayments = await VendorPayment.find({ status: 'Paid' });
  console.log(`Found ${vendorPayments.length} paid vendor payments.`);
  for (const vp of vendorPayments) {
    await postToLedger(vp.collegeId, {
      mode: vp.mode,
      particulars: `Vendor Payment: ${vp.vendor} - ${vp.category} (${vp.description || ''})`,
      cr: 0,
      dr: vp.amount,
      reference: vp.invoiceNo,
      date: vp.datePaid || vp.createdAt
    });
  }

  // 5. Sync Paid Payroll
  const payrolls = await Payroll.find({ status: 'Paid' });
  console.log(`Found ${payrolls.length} paid payrolls.`);
  for (const pr of payrolls) {
    await postToLedger(pr.collegeId, {
      mode: 'Bank Transfer',
      particulars: `Payroll Disbursed: ${pr.name} (${pr.empId}) - ${pr.month}`,
      cr: 0,
      dr: pr.net,
      reference: `PAY-${pr._id.toString().slice(-6)}`,
      date: pr.datePaid || pr.createdAt
    });
  }

  // 6. Sync Completed Refunds
  const refunds = await Refund.find({ status: 'Completed' });
  console.log(`Found ${refunds.length} completed refunds.`);
  for (const ref of refunds) {
    await postToLedger(ref.collegeId, {
      mode: ref.payMode,
      particulars: `Fee Refund: ${ref.name} (${ref.enrollNo}) - Reason: ${ref.reason || ''}`,
      cr: 0,
      dr: ref.refundAmount,
      reference: ref.refundNo,
      date: ref.createdAt
    });
  }

  console.log('Sync process completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Database connection failed:', err);
  process.exit(1);
});
