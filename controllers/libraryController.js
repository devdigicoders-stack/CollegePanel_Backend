const LibraryBook = require('../models/LibraryBook');
const LibraryTransaction = require('../models/LibraryTransaction');
const LibraryLostDamaged = require('../models/LibraryLostDamaged');
const Student = require('../models/Student');

const generateTransactionId = async () => {
  const count = await LibraryTransaction.countDocuments();
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `TXN-${date}-${String(count + 1).padStart(4, '0')}`;
};

const generateCaseNo = async () => {
  const count = await LibraryLostDamaged.countDocuments();
  return `LD-${String(count + 1).padStart(4, '0')}`;
};

const getStats = async (req, res) => {
  try {
    const books = await LibraryBook.find({ collegeId: req.college._id });
    const transactions = await LibraryTransaction.find({ collegeId: req.college._id })
      .populate('bookId', 'title')
      .populate('studentId', 'firstName lastName')
      .sort({ createdAt: -1 });

    const total = books.reduce((acc, b) => acc + (b.totalCopies || 0), 0);
    const available = books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
    const issued = total - available;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayTransactions = transactions.filter(t => {
      const issueDate = new Date(t.issueDate);
      issueDate.setHours(0, 0, 0, 0);
      return issueDate.getTime() === today.getTime();
    });

    const todayIssuesCount = todayTransactions.filter(t => t.status === 'Issued' || t.status === 'Renewed').length;
    const todayReturnsCount = todayTransactions.filter(t => t.status === 'Returned').length;

    const overdueTxnsRaw = transactions.filter(t => t.status === 'Overdue');
    const overdueBooks = overdueTxnsRaw.length;

    const lostBooks = books.filter(b => b.status === 'Lost').length;
    const damagedBooks = books.filter(b => b.status === 'Damaged').length;

    const pendingFines = transactions.reduce((acc, t) => {
      const remaining = (t.fineAmount || 0) - (t.paidAmount || 0);
      return acc + (remaining > 0 ? remaining : 0);
    }, 0);

    const Teacher = require('../models/Teacher');
    const Employee = require('../models/Employee');

    const activeStudents = await Student.countDocuments({ collegeId: req.college._id, status: 'Active' });
    const activeTeachers = await Teacher.countDocuments({ collegeId: req.college._id, status: 'Active' });
    const activeEmployees = await Employee.countDocuments({ collegeId: req.college._id, status: 'Active' });
    const activeMembers = activeStudents + activeTeachers + activeEmployees;

    // Format top 5 recent issues
    const recentIssues = transactions.slice(0, 5).map(t => ({
      book: t.bookId?.title || 'Unknown Book',
      member: t.memberName || (t.studentId ? `${t.studentId.firstName} ${t.studentId.lastName}` : 'Unknown Member'),
      time: new Date(t.createdAt).toLocaleDateString()
    }));

    // Format top 5 overdue members
    const overdueTransactions = overdueTxnsRaw.slice(0, 5).map(t => {
      const daysOverdue = Math.floor((new Date() - new Date(t.dueDate)) / (1000 * 60 * 60 * 24));
      return {
        name: t.memberName || (t.studentId ? `${t.studentId.firstName} ${t.studentId.lastName}` : 'Unknown Member'),
        book: t.bookId?.title || 'Unknown Book',
        days: `${daysOverdue > 0 ? daysOverdue : 1} days overdue`
      };
    });

    res.status(200).json({
      totalBooks: total,
      totalTitles: books.length,
      availableBooks: available,
      issuedBooks: issued,
      overdueBooks,
      todayIssues: todayIssuesCount,
      todayReturns: todayReturnsCount,
      lostBooks,
      damagedBooks,
      pendingFines,
      activeMembers,
      recentIssues,
      overdueTransactions
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching library stats', error: error.message });
  }
};

exports.getStats = getStats;

// --- Books Management ---
exports.getBooks = async (req, res) => {
  try {
    const { search, category, status, stockFilter, page = 1, limit = 10 } = req.query;
    let query = { collegeId: req.college._id };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { accessionNo: { $regex: search, $options: 'i' } }
      ];
    }
    if (category && category !== 'All') query.category = category;
    if (status && status !== 'All') query.status = status;

    // Apply stock/inventory vs issued filter
    if (stockFilter === 'inventory' || stockFilter === 'available') {
      query.availableCopies = { $gt: 0 };
      query.status = { $nin: ['Lost', 'Damaged'] };
    } else if (stockFilter === 'issued') {
      query.$expr = { $gt: [{ $subtract: ['$totalCopies', '$availableCopies'] }, 0] };
    } else if (stockFilter === 'out_of_stock') {
      query.availableCopies = { $lte: 0 };
    } else if (stockFilter === 'lost_damaged') {
      query.status = { $in: ['Lost', 'Damaged'] };
    }

    const skip = (page - 1) * limit;
    const books = await LibraryBook.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await LibraryBook.countDocuments(query);

    // Live counts for tabs/badges under current search & category
    const baseCountQuery = { collegeId: req.college._id };
    if (category && category !== 'All') baseCountQuery.category = category;
    if (search) {
      baseCountQuery.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } },
        { accessionNo: { $regex: search, $options: 'i' } }
      ];
    }

    const [allCount, inventoryCount, issuedCount, outOfStockCount, activeCirculationCount] = await Promise.all([
      LibraryBook.countDocuments(baseCountQuery),
      LibraryBook.countDocuments({
        ...baseCountQuery,
        availableCopies: { $gt: 0 },
        status: { $nin: ['Lost', 'Damaged'] }
      }),
      LibraryBook.countDocuments({
        ...baseCountQuery,
        $expr: { $gt: [{ $subtract: ['$totalCopies', '$availableCopies'] }, 0] }
      }),
      LibraryBook.countDocuments({
        ...baseCountQuery,
        availableCopies: { $lte: 0 }
      }),
      LibraryTransaction.countDocuments({
        collegeId: req.college._id,
        status: { $in: ['Issued', 'Renewed', 'Overdue'] }
      })
    ]);

    // Attach active issue details for each book
    const bookIds = books.map(b => b._id);
    const activeTransactions = await LibraryTransaction.find({
      bookId: { $in: bookIds },
      status: { $in: ['Issued', 'Renewed', 'Overdue'] },
      collegeId: req.college._id
    }).populate('studentId', 'studentName firstName lastName studentId enrollmentNo rollNumber branch');

    const transactionsByBook = {};
    activeTransactions.forEach(txn => {
      const bId = txn.bookId.toString();
      if (!transactionsByBook[bId]) transactionsByBook[bId] = [];
      transactionsByBook[bId].push({
        _id: txn._id,
        transactionId: txn.transactionId,
        memberName: (txn.memberName && txn.memberName !== 'undefined') ? txn.memberName : (txn.studentId ? (txn.studentId.studentName || `${txn.studentId.firstName || ''} ${txn.studentId.lastName || ''}`.trim()) : 'Student'),
        memberType: txn.memberType,
        enrollmentNo: txn.studentId?.studentId || txn.studentId?.enrollmentNo || txn.studentId?.rollNumber || 'N/A',
        issueDate: txn.issueDate,
        dueDate: txn.dueDate,
        status: txn.status
      });
    });

    const enhancedBooks = books.map(b => {
      const bObj = b.toObject();
      const activeIssues = transactionsByBook[b._id.toString()] || [];
      const issued = activeIssues.length > 0 ? activeIssues.length : Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0));
      bObj.issuedCopies = issued > 0 ? issued : 0;
      bObj.activeIssues = activeIssues;
      return bObj;
    });

    res.status(200).json({
      books: enhancedBooks,
      counts: {
        all: allCount,
        inventory: inventoryCount,
        issued: issuedCount,
        activeCirculation: activeCirculationCount,
        outOfStock: outOfStockCount
      },
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching books', error: error.message });
  }
};

exports.getBookById = async (req, res) => {
  try {
    const book = await LibraryBook.findOne({ _id: req.params.id, collegeId: req.college._id });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json(book);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching book details', error: error.message });
  }
};

exports.addBook = async (req, res) => {
  try {
    const { accessionNo } = req.body;
    const existing = await LibraryBook.findOne({ accessionNo, collegeId: req.college._id });
    if (existing) return res.status(400).json({ message: 'Accession number already exists' });

    const newBook = new LibraryBook({ ...req.body, collegeId: req.college._id });
    if (req.body.totalCopies) {
       newBook.availableCopies = req.body.totalCopies;
    }
    await newBook.save();
    res.status(201).json({ message: 'Book added successfully', book: newBook });
  } catch (error) {
    res.status(500).json({ message: 'Error adding book', error: error.message });
  }
};

exports.importBooks = async (req, res) => {
  try {
    const { books } = req.body;
    if (!books || !Array.isArray(books)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    let importedCount = 0;
    for (const item of books) {
      if (!item.accessionNo || !item.title) continue;
      
      const existing = await LibraryBook.findOne({ accessionNo: item.accessionNo, collegeId: req.college._id });
      if (existing) continue;

      const newBook = new LibraryBook({
        collegeId: req.college._id,
        accessionNo: item.accessionNo,
        title: item.title,
        author: item.author || 'Unknown',
        isbn: item.isbn || '',
        category: item.category || 'General',
        totalCopies: Number(item.totalCopies) || 1,
        availableCopies: Number(item.totalCopies) || 1,
        price: Number(item.price) || 0,
        shelf: item.shelf || '',
        rack: item.rack || '',
        status: item.status || 'Available'
      });
      await newBook.save();
      importedCount++;
    }

    res.status(200).json({ message: `Successfully imported ${importedCount} books.` });
  } catch (error) {
    res.status(500).json({ message: 'Error importing books', error: error.message });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const book = await LibraryBook.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json({ message: 'Book updated successfully', book });
  } catch (error) {
    res.status(500).json({ message: 'Error updating book', error: error.message });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const book = await LibraryBook.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    res.status(200).json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting book', error: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await LibraryBook.aggregate([
      { $match: { collegeId: req.college._id } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching categories', error: error.message });
  }
};



// --- Transactions ---
exports.getTransactions = async (req, res) => {
  try {
    const { status, studentId, search } = req.query;
    let query = { collegeId: req.college._id };
    
    if (status === 'active' || status === 'Issued') {
      query.status = { $in: ['Issued', 'Renewed', 'Overdue'] };
    } else if (status && status !== 'All') {
      query.status = status;
    }
    if (studentId) query.studentId = studentId;
    
    let transactions = await LibraryTransaction.find(query)
      .populate('bookId', 'title accessionNo author isbn')
      .populate('studentId', 'studentName firstName lastName enrollmentNo rollNo studentId')
      .sort({ issueDate: -1 });
      
    if (search) {
      const lowerSearch = search.toLowerCase().trim();
      transactions = transactions.filter(t => 
        (t.transactionId && t.transactionId.toLowerCase().includes(lowerSearch)) ||
        (t._id && t._id.toString().toLowerCase().includes(lowerSearch)) ||
        (t.bookId?.title && t.bookId.title.toLowerCase().includes(lowerSearch)) ||
        (t.bookId?.accessionNo && t.bookId.accessionNo.toLowerCase().includes(lowerSearch)) ||
        (t.bookId?.isbn && t.bookId.isbn.toLowerCase().includes(lowerSearch)) ||
        (t.memberName && t.memberName.toLowerCase().includes(lowerSearch)) ||
        (t.studentId?.studentName && t.studentId.studentName.toLowerCase().includes(lowerSearch)) ||
        (t.studentId?.firstName && t.studentId.firstName.toLowerCase().includes(lowerSearch)) ||
        (t.studentId?.enrollmentNo && t.studentId.enrollmentNo.toLowerCase().includes(lowerSearch)) ||
        (t.studentId?.rollNo && t.studentId.rollNo.toLowerCase().includes(lowerSearch))
      );
    }
    
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await LibraryTransaction.findOne({ _id: req.params.id, collegeId: req.college._id })
      .populate('bookId')
      .populate('studentId');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    res.status(200).json(transaction);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transaction', error: error.message });
  }
};

exports.issueBook = async (req, res) => {
  try {
    const { bookId, memberId, dueDate, remarks } = req.body;
    
    const book = await LibraryBook.findOne({ _id: bookId, collegeId: req.college._id });
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (book.availableCopies <= 0) return res.status(400).json({ message: 'Book is out of stock' });
    
    let member = await Student.findOne({ _id: memberId, collegeId: req.college._id });
    if (!member) {
      const Teacher = require('../models/Teacher');
      member = await Teacher.findOne({ _id: memberId, collegeId: req.college._id });
    }
    if (!member) {
      const Employee = require('../models/Employee');
      member = await Employee.findOne({ _id: memberId, collegeId: req.college._id });
    }
    
    const transactionId = await generateTransactionId();
    
    const resolvedName = member ? (member.studentName || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.name || 'Member') : 'Unknown Member';

    const transaction = new LibraryTransaction({
      transactionId,
      bookId,
      studentId: memberId,
      memberName: resolvedName,
      dueDate,
      remarks,
      collegeId: req.college._id,
      status: 'Issued'
    });
    
    await transaction.save();
    
    book.availableCopies -= 1;
    if (book.availableCopies === 0) {
      book.status = 'Issued';
    }
    await book.save();
    
    res.status(201).json({ message: 'Book issued successfully', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error issuing book', error: error.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const { 
      condition, 
      remarks, 
      fineAmount, 
      returnDate, 
      fineAction, // 'collect_now' | 'pay_later' | 'waive' | 'none'
      paidAmount, 
      paymentMode, 
      waivedReason,
      collectorName
    } = req.body;
    
    // Support POST body { transactionId, returnDate, fineAmount, condition, remarks }
    const transactionIdParam = req.body.transactionId || req.params.id;
    
    const transaction = await LibraryTransaction.findOne({ _id: transactionIdParam, collegeId: req.college._id })
      .populate('studentId', 'firstName lastName studentName studentId enrollmentNo')
      .populate('bookId', 'title accessionNo');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    if (transaction.status === 'Returned') return res.status(400).json({ message: 'Book already returned' });
    
    transaction.status = 'Returned';
    transaction.returnDate = returnDate || Date.now();
    transaction.condition = condition || transaction.condition;
    transaction.remarks = remarks || transaction.remarks;
    
    const totalFine = Number(fineAmount) || 0;
    transaction.fineAmount = totalFine;

    const loggedInAdmin = req.admin?.name || req.college?.name || 'Librarian';
    const collector = collectorName || loggedInAdmin;

    if (totalFine > 0) {
      if (fineAction === 'collect_now') {
        const paid = Number(paidAmount) !== undefined && !isNaN(Number(paidAmount)) ? Number(paidAmount) : totalFine;
        transaction.paidAmount = paid;
        transaction.paymentMode = paymentMode || 'Cash';
        transaction.fineStatus = paid >= totalFine ? 'Paid' : 'Partially Paid';
        transaction.paidAt = new Date();
        transaction.collectedBy = collector;
        
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randStr = Math.floor(1000 + Math.random() * 9000);
        transaction.receiptNumber = `LIB-RCP-${dateStr}-${randStr}`;
      } else if (fineAction === 'waive') {
        transaction.paidAmount = 0;
        transaction.fineStatus = 'Waived';
        transaction.paymentMode = 'Waived';
        transaction.waivedReason = waivedReason || 'Authorized waiver';
        transaction.collectedBy = collector;
      } else {
        // 'pay_later' or default
        transaction.paidAmount = 0;
        transaction.fineStatus = 'Pending';
        transaction.paymentMode = 'None';
      }
    } else {
      transaction.fineStatus = 'None';
      transaction.paymentMode = 'None';
      transaction.paidAmount = 0;
    }
    
    await transaction.save();
    
    const book = await LibraryBook.findOne({ _id: transaction.bookId });
    if (book) {
      book.availableCopies += 1;
      if (book.status === 'Issued' && book.availableCopies > 0) {
         book.status = 'Available';
      }
      await book.save();
    }
    
    const receipt = transaction.receiptNumber ? {
      receiptNumber: transaction.receiptNumber,
      transactionId: transaction.transactionId,
      bookTitle: transaction.bookId?.title,
      accessionNo: transaction.bookId?.accessionNo,
      memberName: transaction.memberName || (transaction.studentId?.studentName || `${transaction.studentId?.firstName || ''} ${transaction.studentId?.lastName || ''}`.trim()),
      memberId: transaction.studentId?.studentId || transaction.studentId?.enrollmentNo || 'N/A',
      fineAmount: transaction.fineAmount,
      paidAmount: transaction.paidAmount,
      balance: Math.max(0, transaction.fineAmount - transaction.paidAmount),
      paymentMode: transaction.paymentMode,
      fineStatus: transaction.fineStatus,
      paidAt: transaction.paidAt,
      collectedBy: transaction.collectedBy,
      dueDate: transaction.dueDate,
      returnDate: transaction.returnDate
    } : null;

    res.status(200).json({ message: 'Book returned successfully', transaction, receipt });
  } catch (error) {
    res.status(500).json({ message: 'Error returning book', error: error.message });
  }
};

exports.renewTransaction = async (req, res) => {
  try {
    const { dueDate } = req.body;
    const transaction = await LibraryTransaction.findOne({ _id: req.params.id, collegeId: req.college._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    if (transaction.status === 'Returned') return res.status(400).json({ message: 'Cannot renew a returned book' });
    
    transaction.dueDate = dueDate;
    transaction.status = 'Renewed';
    await transaction.save();
    
    res.status(200).json({ message: 'Transaction renewed successfully', transaction });
  } catch (error) {
    res.status(500).json({ message: 'Error renewing transaction', error: error.message });
  }
};

// --- Fines ---
exports.getFines = async (req, res) => {
  try {
    const transactions = await LibraryTransaction.find({
      collegeId: req.college._id,
      fineAmount: { $gt: 0 }
    })
      .populate('studentId', 'firstName lastName studentName studentId enrollmentNo rollNo branch')
      .populate('bookId', 'title accessionNo author')
      .sort({ updatedAt: -1 });
    
    const fines = transactions.map(t => {
      const studentName = t.studentId?.studentName || (t.studentId ? `${t.studentId.firstName || ''} ${t.studentId.lastName || ''}`.trim() : '');
      const memberName = (t.memberName && t.memberName !== 'undefined') ? t.memberName : (studentName || 'Student');
      const memberId = t.studentId?.studentId || t.studentId?.enrollmentNo || t.studentId?.rollNo || 'N/A';
      const fineAmount = t.fineAmount || 0;
      const paidAmount = t.paidAmount || 0;
      const balance = Math.max(0, fineAmount - paidAmount);

      let fineStatus = t.fineStatus || 'Pending';
      if (t.fineStatus === 'Waived') fineStatus = 'Waived';
      else if (balance <= 0 && paidAmount > 0) fineStatus = 'Paid';
      else if (paidAmount > 0 && balance > 0) fineStatus = 'Partially Paid';
      else fineStatus = 'Pending';

      return {
        transactionId: t._id,
        txnId: t.transactionId,
        memberName,
        memberId,
        memberType: t.memberType || 'Student',
        bookTitle: t.bookId ? t.bookId.title : 'Unknown',
        accessionNo: t.bookId ? t.bookId.accessionNo : 'N/A',
        fineAmount,
        paidAmount,
        balance,
        fineStatus,
        paymentMode: t.paymentMode || 'None',
        receiptNumber: t.receiptNumber || null,
        waivedReason: t.waivedReason || null,
        collectedBy: t.collectedBy || null,
        paidAt: t.paidAt || null,
        issueDate: t.issueDate,
        dueDate: t.dueDate,
        returnDate: t.returnDate,
        status: t.status
      };
    });
    
    res.status(200).json(fines);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fines', error: error.message });
  }
};

exports.collectFine = async (req, res) => {
  try {
    const { transactionId, amount, paymentMode, collectorName, remarks } = req.body;
    const transaction = await LibraryTransaction.findOne({ _id: transactionId, collegeId: req.college._id })
      .populate('studentId', 'firstName lastName studentName studentId enrollmentNo')
      .populate('bookId', 'title accessionNo');
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    const payAmt = Number(amount) || 0;
    if (payAmt <= 0) {
      return res.status(400).json({ message: 'Invalid payment amount' });
    }

    transaction.paidAmount = (transaction.paidAmount || 0) + payAmt;
    transaction.paymentMode = paymentMode || 'Cash';
    transaction.fineStatus = transaction.paidAmount >= transaction.fineAmount ? 'Paid' : 'Partially Paid';
    transaction.paidAt = new Date();
    transaction.collectedBy = collectorName || req.admin?.name || req.college?.name || 'Librarian';
    if (remarks) {
      transaction.remarks = (transaction.remarks ? `${transaction.remarks} | ` : '') + remarks;
    }
    
    if (!transaction.receiptNumber) {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randStr = Math.floor(1000 + Math.random() * 9000);
      transaction.receiptNumber = `LIB-RCP-${dateStr}-${randStr}`;
    }

    await transaction.save();
    
    const receipt = {
      receiptNumber: transaction.receiptNumber,
      transactionId: transaction.transactionId,
      bookTitle: transaction.bookId?.title,
      accessionNo: transaction.bookId?.accessionNo,
      memberName: transaction.memberName || (transaction.studentId?.studentName || `${transaction.studentId?.firstName || ''} ${transaction.studentId?.lastName || ''}`.trim()),
      memberId: transaction.studentId?.studentId || transaction.studentId?.enrollmentNo || 'N/A',
      fineAmount: transaction.fineAmount,
      paidAmount: transaction.paidAmount,
      balance: Math.max(0, transaction.fineAmount - transaction.paidAmount),
      paymentMode: transaction.paymentMode,
      fineStatus: transaction.fineStatus,
      paidAt: transaction.paidAt,
      collectedBy: transaction.collectedBy,
      dueDate: transaction.dueDate,
      returnDate: transaction.returnDate
    };

    res.status(200).json({ message: 'Fine collected successfully', transaction, receipt });
  } catch (error) {
    res.status(500).json({ message: 'Error collecting fine', error: error.message });
  }
};

// --- Lost & Damaged ---
exports.getLostDamaged = async (req, res) => {
  try {
    const records = await LibraryLostDamaged.find({ collegeId: req.college._id })
      .populate('bookId', 'title accessionNo price')
      .sort({ reportDate: -1 })
      .lean();

    const Teacher = require('../models/Teacher');
    const Employee = require('../models/Employee');
    const Student = require('../models/Student');

    for (let i = 0; i < records.length; i++) {
      let r = records[i];
      if (r.memberId) {
        let member = await Student.findById(r.memberId).select('studentName firstName lastName enrollmentNo studentId rollNo').lean();
        if (!member) {
          member = await Teacher.findById(r.memberId).select('name firstName lastName employeeId').lean();
        }
        if (!member) {
          member = await Employee.findById(r.memberId).select('name firstName lastName employeeId').lean();
        }
        if (member) {
          r.memberId = {
            ...member,
            firstName: member.studentName || member.name || member.firstName || 'Student',
            lastName: member.lastName || ''
          };
        } else {
          r.memberId = { firstName: r.reportedBy || 'Student', lastName: '' };
        }
      } else if (r.reportedBy) {
        r.memberId = { firstName: r.reportedBy, lastName: '' };
      }
    }

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching records', error: error.message });
  }
};

exports.addLostDamaged = async (req, res) => {
  try {
    const { bookId, memberId, type, cost, penalty, status, notes } = req.body;
    
    // Fetch Book details if not provided
    let book = null;
    if (bookId) {
      book = await LibraryBook.findOne({ _id: bookId, collegeId: req.college._id });
    }
    const accessionNo = req.body.accessionNo || book?.accessionNo || 'N/A';
    const bookTitle = req.body.bookTitle || book?.title || 'Unknown Book';

    // Resolve Member & Reporter
    let reportedBy = req.body.reportedBy;
    let memberType = req.body.memberType;

    if (memberId) {
      const Student = require('../models/Student');
      const Teacher = require('../models/Teacher');
      const Employee = require('../models/Employee');

      let member = await Student.findOne({ _id: memberId, collegeId: req.college._id });
      if (member) {
        memberType = memberType || 'Student';
        if (!reportedBy) {
          reportedBy = member.studentName || `${member.firstName || ''} ${member.lastName || ''}`.trim();
        }
      } else {
        member = await Teacher.findOne({ _id: memberId, collegeId: req.college._id });
        if (member) {
          memberType = memberType || 'Teacher';
          if (!reportedBy) reportedBy = member.name;
        } else {
          member = await Employee.findOne({ _id: memberId, collegeId: req.college._id });
          if (member) {
            memberType = memberType || 'Staff';
            if (!reportedBy) reportedBy = member.name;
          }
        }
      }
    }

    if (!reportedBy) {
      reportedBy = req.admin?.name || req.college?.adminName || req.college?.name || 'Library Admin';
    }

    const caseNo = await generateCaseNo();
    const record = new LibraryLostDamaged({
      ...req.body,
      caseNo,
      bookId,
      accessionNo,
      bookTitle,
      reportedBy,
      memberId: memberId || undefined,
      memberType: memberType || 'Student',
      cost: Number(cost) || 0,
      penalty: Number(penalty) || 0,
      type: type || 'Lost',
      status: status || 'Pending Cost Recovery',
      notes,
      collegeId: req.college._id
    });
    await record.save();
    
    if (book) {
       book.status = type === 'Lost' ? 'Lost' : 'Damaged';
       if (book.availableCopies > 0) {
          book.availableCopies -= 1;
       }
       await book.save();
    }
    
    res.status(201).json({ message: 'Record added successfully', record });
  } catch (error) {
    res.status(500).json({ message: 'Error adding record', error: error.message });
  }
};

exports.updateLostDamagedStatus = async (req, res) => {
  try {
    const record = await LibraryLostDamaged.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { returnDocument: 'after' }
    );
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.status(200).json({ message: 'Record updated', record });
  } catch (error) {
    res.status(500).json({ message: 'Error updating record', error: error.message });
  }
};

exports.deleteLostDamaged = async (req, res) => {
  try {
    const record = await LibraryLostDamaged.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    if (!record) return res.status(404).json({ message: 'Record not found' });
    res.status(200).json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting record', error: error.message });
  }
};


// --- Reports ---
exports.getReportData = async (req, res) => {
  try {
    const transactions = await LibraryTransaction.find({ collegeId: req.college._id });
    const books = await LibraryBook.find({ collegeId: req.college._id });
    
    const lowStock = books.filter(b => b.availableCopies === 0).slice(0, 5);
    
    const dailyTransactions = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const dayIssues = transactions.filter(t => t.issueDate && t.issueDate.toISOString().startsWith(dateStr)).length;
      const dayReturns = transactions.filter(t => t.returnDate && t.returnDate.toISOString().startsWith(dateStr)).length;
      
      dailyTransactions.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        issues: dayIssues,
        returns: dayReturns
      });
    }

    res.status(200).json({
      dailyTransactions,
      lowStock,
      pages: 1
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reports', error: error.message });
  }
};

exports.getDailyTransactions = async (req, res) => {
  try {
    const transactions = await LibraryTransaction.find({ collegeId: req.college._id })
      .populate('bookId', 'title')
      .populate('studentId', 'firstName lastName')
      .sort({ issueDate: -1 })
      .limit(50);
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching daily transactions', error: error.message });
  }
};

exports.getCustomReportData = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const collegeId = req.college._id;
    
    // Parse dates or default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(end.getDate() - 30));
    start.setHours(0, 0, 0, 0);

    const Teacher = require('../models/Teacher');
    const Employee = require('../models/Employee');

    let metrics = [];
    let chartData = { title: '', categories: [], series: [] };
    let columns = [];
    let records = [];

    switch (reportType) {
      case 'Book Inventory Report': {
        const books = await LibraryBook.find({ collegeId }).sort({ accessionNo: 1 }).lean();
        const totalCopies = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);
        const availableCopies = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
        const issuedCopies = books.reduce((sum, b) => sum + Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0)), 0);
        const lostDamagedCopies = books.filter(b => b.status === 'Lost' || b.status === 'Damaged').length;
        
        metrics = [
          { label: 'Total Cataloged Titles', value: books.length.toLocaleString(), iconType: 'file' },
          { label: 'Total Physical Copies', value: totalCopies.toLocaleString(), iconType: 'up' },
          { label: 'Available on Shelf', value: availableCopies.toLocaleString(), iconType: 'chart' },
          { label: 'Currently Circulating', value: issuedCopies.toLocaleString(), iconType: 'down' }
        ];

        const categoriesMap = {};
        books.forEach(b => {
          const cat = b.category || 'General';
          categoriesMap[cat] = (categoriesMap[cat] || 0) + (b.totalCopies || 1);
        });

        chartData = {
          title: 'Copies by Book Category',
          categories: Object.keys(categoriesMap),
          series: [
            { name: 'Total Copies', data: Object.values(categoriesMap), color: '#0A6C54' }
          ]
        };

        columns = [
          { key: 'accessionNo', header: 'Accession No' },
          { key: 'title', header: 'Book Title' },
          { key: 'author', header: 'Author' },
          { key: 'category', header: 'Category' },
          { key: 'location', header: 'Shelf Location' },
          { key: 'totalCopies', header: 'Total Copies', align: 'center' },
          { key: 'availableCopies', header: 'Available', align: 'center' },
          { key: 'issuedCopies', header: 'Issued', align: 'center' },
          { key: 'status', header: 'Status', align: 'center' }
        ];

        records = books.map(b => ({
          _id: b._id,
          accessionNo: b.accessionNo || 'N/A',
          title: b.title || 'Untitled',
          author: b.author || 'N/A',
          category: b.category || 'General',
          location: b.shelf ? `${b.shelf} ${b.rack ? '- ' + b.rack : ''}` : (b.shelfLocation || 'Main Stack'),
          totalCopies: b.totalCopies || 0,
          availableCopies: b.availableCopies || 0,
          issuedCopies: Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0)),
          status: b.status || (b.availableCopies > 0 ? 'Available' : 'Issued')
        }));
        break;
      }

      case 'Issued Books Report': {
        const txns = await LibraryTransaction.find({ 
          collegeId,
          issueDate: { $gte: start, $lte: end }
        })
          .populate('bookId', 'title accessionNo author')
          .populate('studentId', 'studentName firstName lastName enrollmentNo rollNo branch')
          .sort({ issueDate: -1 })
          .lean();

        const activeCount = txns.filter(t => t.status === 'Issued' || t.status === 'Renewed').length;
        const returnedCount = txns.filter(t => t.status === 'Returned').length;
        const overdueCount = txns.filter(t => (t.status === 'Issued' || t.status === 'Overdue') && new Date(t.dueDate) < new Date()).length;

        metrics = [
          { label: 'Books Issued in Period', value: txns.length.toLocaleString(), iconType: 'up' },
          { label: 'Currently Active Issues', value: activeCount.toLocaleString(), iconType: 'chart' },
          { label: 'Returned from Period', value: returnedCount.toLocaleString(), iconType: 'file' },
          { label: 'Currently Overdue', value: overdueCount.toLocaleString(), iconType: 'down' }
        ];

        const dateMap = {};
        txns.forEach(t => {
          if (t.issueDate) {
            const d = new Date(t.issueDate).toISOString().split('T')[0];
            dateMap[d] = (dateMap[d] || 0) + 1;
          }
        });
        const sortedDates = Object.keys(dateMap).sort();

        chartData = {
          title: 'Daily Issue Activity',
          categories: sortedDates.length ? sortedDates : [start.toISOString().split('T')[0]],
          series: [
            { name: 'Books Issued', data: sortedDates.length ? sortedDates.map(d => dateMap[d]) : [0], color: '#0A6C54' }
          ]
        };

        columns = [
          { key: 'transactionId', header: 'TXN ID' },
          { key: 'accessionNo', header: 'Accession No' },
          { key: 'title', header: 'Book Title' },
          { key: 'borrower', header: 'Borrower Name' },
          { key: 'branch', header: 'Branch / Dept' },
          { key: 'issueDate', header: 'Issue Date' },
          { key: 'dueDate', header: 'Due Date' },
          { key: 'status', header: 'Status', align: 'center' }
        ];

        records = txns.map(t => {
          const borrower = (t.memberName && t.memberName !== 'undefined') ? t.memberName : (t.studentId?.studentName || `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim() || 'Student');
          const isOverdue = (t.status === 'Issued' || t.status === 'Renewed') && new Date() > new Date(t.dueDate);
          return {
            _id: t._id,
            transactionId: t.transactionId,
            accessionNo: t.bookId?.accessionNo || 'N/A',
            title: t.bookId?.title || 'Unknown',
            borrower,
            branch: t.studentId?.branch || 'Academics',
            issueDate: new Date(t.issueDate).toLocaleDateString(),
            dueDate: new Date(t.dueDate).toLocaleDateString(),
            status: isOverdue ? 'Overdue' : t.status
          };
        });
        break;
      }

      case 'Returned Books Report': {
        const txns = await LibraryTransaction.find({
          collegeId,
          status: 'Returned',
          returnDate: { $gte: start, $lte: end }
        })
          .populate('bookId', 'title accessionNo author')
          .populate('studentId', 'studentName firstName lastName enrollmentNo branch')
          .sort({ returnDate: -1 })
          .lean();

        const onTime = txns.filter(t => new Date(t.returnDate) <= new Date(t.dueDate)).length;
        const late = txns.filter(t => new Date(t.returnDate) > new Date(t.dueDate)).length;
        const totalFinePaid = txns.reduce((s, t) => s + (t.paidAmount || 0), 0);

        metrics = [
          { label: 'Total Books Returned', value: txns.length.toLocaleString(), iconType: 'up' },
          { label: 'Returned On-Time', value: onTime.toLocaleString(), iconType: 'chart' },
          { label: 'Returned Overdue', value: late.toLocaleString(), iconType: 'down' },
          { label: 'Fine Collected on Return', value: `₹${totalFinePaid.toLocaleString()}`, iconType: 'file' }
        ];

        const dateMap = {};
        txns.forEach(t => {
          if (t.returnDate) {
            const d = new Date(t.returnDate).toISOString().split('T')[0];
            dateMap[d] = (dateMap[d] || 0) + 1;
          }
        });
        const sortedDates = Object.keys(dateMap).sort();

        chartData = {
          title: 'Daily Return Activity',
          categories: sortedDates.length ? sortedDates : [start.toISOString().split('T')[0]],
          series: [
            { name: 'Books Returned', data: sortedDates.length ? sortedDates.map(d => dateMap[d]) : [0], color: '#3B82F6' }
          ]
        };

        columns = [
          { key: 'transactionId', header: 'TXN ID' },
          { key: 'bookTitle', header: 'Book Title' },
          { key: 'borrower', header: 'Borrower' },
          { key: 'issueDate', header: 'Issue Date' },
          { key: 'dueDate', header: 'Due Date' },
          { key: 'returnDate', header: 'Return Date' },
          { key: 'condition', header: 'Condition' },
          { key: 'finePaid', header: 'Fine Paid', align: 'right' },
          { key: 'paymentMode', header: 'Payment Mode', align: 'center' }
        ];

        records = txns.map(t => ({
          _id: t._id,
          transactionId: t.transactionId,
          bookTitle: t.bookId?.title || 'Unknown',
          borrower: (t.memberName && t.memberName !== 'undefined') ? t.memberName : (t.studentId?.studentName || `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim() || 'Student'),
          issueDate: new Date(t.issueDate).toLocaleDateString(),
          dueDate: new Date(t.dueDate).toLocaleDateString(),
          returnDate: new Date(t.returnDate).toLocaleDateString(),
          condition: t.condition || 'Good',
          finePaid: `₹${t.paidAmount || 0}`,
          paymentMode: t.paymentMode || 'None'
        }));
        break;
      }

      case 'Overdue Books Report': {
        const txns = await LibraryTransaction.find({
          collegeId,
          status: { $in: ['Issued', 'Renewed', 'Overdue'] },
          dueDate: { $lt: new Date() }
        })
          .populate('bookId', 'title accessionNo author')
          .populate('studentId', 'studentName firstName lastName enrollmentNo rollNo branch phone')
          .sort({ dueDate: 1 })
          .lean();

        let totalAccruedFine = 0;
        let maxLateDays = 0;
        const defaultersSet = new Set();
        const delayBuckets = { '< 7 Days': 0, '7-14 Days': 0, '15-30 Days': 0, '> 30 Days': 0 };

        records = txns.map(t => {
          const today = new Date();
          const due = new Date(t.dueDate);
          const lateDays = Math.max(1, Math.floor((today - due) / (1000 * 60 * 60 * 24)));
          const fine = lateDays * 10;
          totalAccruedFine += fine;
          if (lateDays > maxLateDays) maxLateDays = lateDays;

          const borrower = (t.memberName && t.memberName !== 'undefined') ? t.memberName : (t.studentId?.studentName || `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim() || 'Student');
          defaultersSet.add(t.studentId?._id?.toString() || borrower);

          if (lateDays < 7) delayBuckets['< 7 Days']++;
          else if (lateDays <= 14) delayBuckets['7-14 Days']++;
          else if (lateDays <= 30) delayBuckets['15-30 Days']++;
          else delayBuckets['> 30 Days']++;

          return {
            _id: t._id,
            transactionId: t.transactionId,
            accessionNo: t.bookId?.accessionNo || 'N/A',
            bookTitle: t.bookId?.title || 'Unknown',
            borrower,
            contact: t.studentId?.enrollmentNo || t.studentId?.studentId || t.studentId?.phone || 'N/A',
            dueDate: due.toLocaleDateString(),
            lateDays: `${lateDays} Days`,
            fine: `₹${fine}`,
            status: 'Overdue'
          };
        });

        metrics = [
          { label: 'Total Overdue Copies', value: txns.length.toLocaleString(), iconType: 'down' },
          { label: 'Defaulter Borrowers', value: defaultersSet.size.toLocaleString(), iconType: 'chart' },
          { label: 'Total Accrued Penalty', value: `₹${totalAccruedFine.toLocaleString()}`, iconType: 'up' },
          { label: 'Maximum Days Overdue', value: `${maxLateDays} Days`, iconType: 'file' }
        ];

        chartData = {
          title: 'Overdue Aging Distribution',
          categories: Object.keys(delayBuckets),
          series: [
            { name: 'Overdue Books', data: Object.values(delayBuckets), color: '#DC2626' }
          ]
        };

        columns = [
          { key: 'transactionId', header: 'TXN ID' },
          { key: 'accessionNo', header: 'Accession No' },
          { key: 'bookTitle', header: 'Book Title' },
          { key: 'borrower', header: 'Defaulter Member' },
          { key: 'contact', header: 'Roll / Contact' },
          { key: 'dueDate', header: 'Due Date' },
          { key: 'lateDays', header: 'Overdue Delay', align: 'center' },
          { key: 'fine', header: 'Accrued Penalty', align: 'right' },
          { key: 'status', header: 'Status', align: 'center' }
        ];
        break;
      }

      case 'Fine Collection Report': {
        const txns = await LibraryTransaction.find({
          collegeId,
          fineAmount: { $gt: 0 }
        })
          .populate('bookId', 'title accessionNo')
          .populate('studentId', 'studentName firstName lastName enrollmentNo')
          .sort({ updatedAt: -1 })
          .lean();

        const filteredTxns = txns.filter(t => {
          const date = t.paidAt || t.returnDate || t.updatedAt;
          if (!date) return true;
          const d = new Date(date);
          return d >= start && d <= end;
        });

        const totalLevied = filteredTxns.reduce((s, t) => s + (t.fineAmount || 0), 0);
        const totalCollected = filteredTxns.reduce((s, t) => s + (t.paidAmount || 0), 0);
        const totalPending = filteredTxns.reduce((s, t) => s + Math.max(0, (t.fineAmount || 0) - (t.paidAmount || 0)), 0);
        const waivedCount = filteredTxns.filter(t => t.fineStatus === 'Waived').length;

        metrics = [
          { label: 'Total Fines Levied', value: `₹${totalLevied.toLocaleString()}`, iconType: 'up' },
          { label: 'Total Fines Collected', value: `₹${totalCollected.toLocaleString()}`, iconType: 'chart' },
          { label: 'Outstanding Dues', value: `₹${totalPending.toLocaleString()}`, iconType: 'down' },
          { label: 'Fines Waived', value: waivedCount.toLocaleString(), iconType: 'file' }
        ];

        const modeMap = { 'Cash': 0, 'UPI': 0, 'Card': 0, 'Bank Transfer': 0, 'Waived': 0, 'Pending': 0 };
        filteredTxns.forEach(t => {
          if (t.fineStatus === 'Waived') modeMap['Waived'] += t.fineAmount || 0;
          else if (t.paymentMode && modeMap[t.paymentMode] !== undefined) modeMap[t.paymentMode] += t.paidAmount || 0;
          else if ((t.fineAmount || 0) > (t.paidAmount || 0)) modeMap['Pending'] += ((t.fineAmount || 0) - (t.paidAmount || 0));
        });

        chartData = {
          title: 'Fine Collections by Mode',
          categories: Object.keys(modeMap),
          series: [
            { name: 'Amount (₹)', data: Object.values(modeMap), color: '#3B82F6' }
          ]
        };

        columns = [
          { key: 'receiptNumber', header: 'Receipt No' },
          { key: 'transactionId', header: 'TXN ID' },
          { key: 'bookTitle', header: 'Book Title' },
          { key: 'borrower', header: 'Member Name' },
          { key: 'fineAmount', header: 'Fine Levied', align: 'right' },
          { key: 'paidAmount', header: 'Amount Paid', align: 'right' },
          { key: 'balance', header: 'Balance Due', align: 'right' },
          { key: 'fineStatus', header: 'Status', align: 'center' },
          { key: 'paymentMode', header: 'Mode', align: 'center' },
          { key: 'date', header: 'Settlement Date' }
        ];

        records = filteredTxns.map(t => ({
          _id: t._id,
          receiptNumber: t.receiptNumber || 'N/A',
          transactionId: t.transactionId,
          bookTitle: t.bookId?.title || 'Unknown',
          borrower: (t.memberName && t.memberName !== 'undefined') ? t.memberName : (t.studentId?.studentName || `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim() || 'Student'),
          fineAmount: `₹${t.fineAmount || 0}`,
          paidAmount: `₹${t.paidAmount || 0}`,
          balance: `₹${Math.max(0, (t.fineAmount || 0) - (t.paidAmount || 0))}`,
          fineStatus: t.fineStatus || 'Pending',
          paymentMode: t.paymentMode || 'None',
          date: t.paidAt ? new Date(t.paidAt).toLocaleDateString() : (t.returnDate ? new Date(t.returnDate).toLocaleDateString() : new Date(t.updatedAt).toLocaleDateString())
        }));
        break;
      }

      case 'Lost Books Report': {
        const cases = await LibraryLostDamaged.find({
          collegeId,
          type: 'Lost',
          createdAt: { $gte: start, $lte: end }
        }).populate('bookId', 'title accessionNo author price').lean();

        const totalCost = cases.reduce((s, c) => s + (c.cost || 0), 0);
        const totalPenalty = cases.reduce((s, c) => s + (c.penalty || 0), 0);
        const resolvedCases = cases.filter(c => c.status === 'Book Cost Recovered' || c.status === 'Replacement Received' || c.status === 'Closed').length;

        metrics = [
          { label: 'Total Lost Books Reported', value: cases.length.toLocaleString(), iconType: 'down' },
          { label: 'Total Book Replacement Cost', value: `₹${totalCost.toLocaleString()}`, iconType: 'up' },
          { label: 'Total Lost Penalties Imposed', value: `₹${totalPenalty.toLocaleString()}`, iconType: 'chart' },
          { label: 'Cases Resolved / Recovered', value: resolvedCases.toLocaleString(), iconType: 'file' }
        ];

        const statusMap = { 'Pending Cost Recovery': 0, 'Book Cost Recovered': 0, 'Replacement Received': 0, 'Closed': 0 };
        cases.forEach(c => {
          const st = c.status || 'Pending Cost Recovery';
          statusMap[st] = (statusMap[st] || 0) + 1;
        });

        chartData = {
          title: 'Lost Cases by Resolution Status',
          categories: Object.keys(statusMap),
          series: [
            { name: 'Cases Count', data: Object.values(statusMap), color: '#DC2626' }
          ]
        };

        columns = [
          { key: 'caseNo', header: 'Case ID' },
          { key: 'accessionNo', header: 'Accession No' },
          { key: 'bookTitle', header: 'Book Title' },
          { key: 'reportedBy', header: 'Reported By / Borrower' },
          { key: 'cost', header: 'Book Cost', align: 'right' },
          { key: 'penalty', header: 'Penalty', align: 'right' },
          { key: 'total', header: 'Total Impact', align: 'right' },
          { key: 'status', header: 'Status', align: 'center' },
          { key: 'date', header: 'Reported Date' }
        ];

        records = cases.map(c => ({
          _id: c._id,
          caseNo: c.caseNo || 'N/A',
          accessionNo: c.accessionNo || c.bookId?.accessionNo || 'N/A',
          bookTitle: c.bookTitle || c.bookId?.title || 'Unknown',
          reportedBy: c.reportedBy || 'Student',
          cost: `₹${c.cost || 0}`,
          penalty: `₹${c.penalty || 0}`,
          total: `₹${(c.cost || 0) + (c.penalty || 0)}`,
          status: c.status || 'Pending Cost Recovery',
          date: new Date(c.createdAt).toLocaleDateString()
        }));
        break;
      }

      case 'Damaged Books Report': {
        const cases = await LibraryLostDamaged.find({
          collegeId,
          type: 'Damaged',
          createdAt: { $gte: start, $lte: end }
        }).populate('bookId', 'title accessionNo author price').lean();

        const totalCost = cases.reduce((s, c) => s + (c.cost || 0), 0);
        const totalPenalty = cases.reduce((s, c) => s + (c.penalty || 0), 0);
        const pendingCount = cases.filter(c => c.status === 'Pending Cost Recovery').length;

        metrics = [
          { label: 'Total Damaged Books Reported', value: cases.length.toLocaleString(), iconType: 'down' },
          { label: 'Total Repair / Loss Cost', value: `₹${totalCost.toLocaleString()}`, iconType: 'up' },
          { label: 'Damaged Penalties Collected', value: `₹${totalPenalty.toLocaleString()}`, iconType: 'chart' },
          { label: 'Cases Pending Action', value: pendingCount.toLocaleString(), iconType: 'file' }
        ];

        const statusMap = { 'Pending Cost Recovery': 0, 'Book Cost Recovered': 0, 'Replacement Received': 0, 'Closed': 0 };
        cases.forEach(c => {
          const st = c.status || 'Pending Cost Recovery';
          statusMap[st] = (statusMap[st] || 0) + 1;
        });

        chartData = {
          title: 'Damaged Cases Resolution Status',
          categories: Object.keys(statusMap),
          series: [
            { name: 'Cases Count', data: Object.values(statusMap), color: '#F59E0B' }
          ]
        };

        columns = [
          { key: 'caseNo', header: 'Case ID' },
          { key: 'accessionNo', header: 'Accession No' },
          { key: 'bookTitle', header: 'Book Title' },
          { key: 'reportedBy', header: 'Reported By' },
          { key: 'cost', header: 'Repair Cost', align: 'right' },
          { key: 'penalty', header: 'Penalty', align: 'right' },
          { key: 'total', header: 'Total Due', align: 'right' },
          { key: 'status', header: 'Status', align: 'center' },
          { key: 'date', header: 'Reported Date' }
        ];

        records = cases.map(c => ({
          _id: c._id,
          caseNo: c.caseNo || 'N/A',
          accessionNo: c.accessionNo || c.bookId?.accessionNo || 'N/A',
          bookTitle: c.bookTitle || c.bookId?.title || 'Unknown',
          reportedBy: c.reportedBy || 'Student',
          cost: `₹${c.cost || 0}`,
          penalty: `₹${c.penalty || 0}`,
          total: `₹${(c.cost || 0) + (c.penalty || 0)}`,
          status: c.status || 'Pending Cost Recovery',
          date: new Date(c.createdAt).toLocaleDateString()
        }));
        break;
      }

      case 'Member Activity Report': {
        const students = await Student.find({ collegeId, status: 'Active' }).select('studentName firstName lastName studentId enrollmentNo branch semester').lean();
        const activeTxns = await LibraryTransaction.find({ collegeId }).select('studentId status dueDate').lean();

        const holdingMap = {};
        const lifetimeMap = {};
        const overdueMap = {};

        activeTxns.forEach(t => {
          if (!t.studentId) return;
          const sId = t.studentId.toString();
          lifetimeMap[sId] = (lifetimeMap[sId] || 0) + 1;
          if (t.status === 'Issued' || t.status === 'Renewed') {
            holdingMap[sId] = (holdingMap[sId] || 0) + 1;
            if (new Date() > new Date(t.dueDate)) {
              overdueMap[sId] = (overdueMap[sId] || 0) + 1;
            }
          }
        });

        const activeBorrowersCount = Object.keys(holdingMap).length;
        const overdueBorrowersCount = Object.keys(overdueMap).length;

        metrics = [
          { label: 'Active Registered Students', value: students.length.toLocaleString(), iconType: 'up' },
          { label: 'Currently Active Borrowers', value: activeBorrowersCount.toLocaleString(), iconType: 'chart' },
          { label: 'Members with Overdues', value: overdueBorrowersCount.toLocaleString(), iconType: 'down' },
          { label: 'Lifetime Borrowings Logged', value: activeTxns.length.toLocaleString(), iconType: 'file' }
        ];

        chartData = {
          title: 'Member Circulation Engagement',
          categories: ['Active Borrowers', 'Inactive Members', 'Defaulters'],
          series: [
            { name: 'Members Count', data: [activeBorrowersCount, Math.max(0, students.length - activeBorrowersCount), overdueBorrowersCount], color: '#0A6C54' }
          ]
        };

        columns = [
          { key: 'code', header: 'Roll / Member ID' },
          { key: 'name', header: 'Student Name' },
          { key: 'branch', header: 'Branch / Sem' },
          { key: 'currentlyHolding', header: 'Currently Borrowed', align: 'center' },
          { key: 'lifetimeIssues', header: 'Lifetime Issues', align: 'center' },
          { key: 'overdueCount', header: 'Overdue Books', align: 'center' },
          { key: 'status', header: 'Status', align: 'center' }
        ];

        records = students.map(s => {
          const sId = s._id.toString();
          const holding = holdingMap[sId] || 0;
          const lifetime = lifetimeMap[sId] || 0;
          const overdue = overdueMap[sId] || 0;
          return {
            _id: s._id,
            code: s.enrollmentNo || s.studentId || 'N/A',
            name: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
            branch: `${s.branch || 'General'} (${s.semester || 'Sem 1'})`,
            currentlyHolding: holding,
            lifetimeIssues: lifetime,
            overdueCount: overdue,
            status: overdue > 0 ? 'Defaulter' : (holding > 0 ? 'Borrowing' : 'Clear')
          };
        }).sort((a, b) => (b.currentlyHolding + b.lifetimeIssues) - (a.currentlyHolding + a.lifetimeIssues));
        break;
      }

      case 'Most Issued Books': {
        const issueAggregation = await LibraryTransaction.aggregate([
          { $match: { collegeId } },
          { $group: { _id: '$bookId', totalIssues: { $sum: 1 } } },
          { $sort: { totalIssues: -1 } },
          { $limit: 25 }
        ]);

        const bookIds = issueAggregation.map(a => a._id).filter(Boolean);
        const books = await LibraryBook.find({ _id: { $in: bookIds } }).lean();
        const bookMap = {};
        books.forEach(b => bookMap[b._id.toString()] = b);

        const totalTransactions = await LibraryTransaction.countDocuments({ collegeId });
        const topTitle = books.length ? (bookMap[issueAggregation[0]?._id?.toString()]?.title || 'N/A') : 'N/A';
        const maxIssues = issueAggregation[0]?.totalIssues || 0;

        metrics = [
          { label: 'Most Popular Title', value: topTitle, iconType: 'up' },
          { label: 'Max Issues for Single Book', value: maxIssues.toLocaleString(), iconType: 'chart' },
          { label: 'Total Circulation Events', value: totalTransactions.toLocaleString(), iconType: 'file' },
          { label: 'Titles Circulated', value: issueAggregation.length.toLocaleString(), iconType: 'down' }
        ];

        const top7 = issueAggregation.slice(0, 7);
        chartData = {
          title: 'Top Circulated Book Titles',
          categories: top7.map(a => {
            const t = bookMap[a._id?.toString()]?.title || 'Unknown';
            return t.length > 15 ? t.slice(0, 15) + '...' : t;
          }),
          series: [
            { name: 'Times Issued', data: top7.map(a => a.totalIssues), color: '#0A6C54' }
          ]
        };

        columns = [
          { key: 'rank', header: 'Rank', align: 'center' },
          { key: 'accessionNo', header: 'Accession No' },
          { key: 'title', header: 'Book Title' },
          { key: 'author', header: 'Author' },
          { key: 'category', header: 'Category' },
          { key: 'totalIssues', header: 'Total Issues', align: 'center' },
          { key: 'copies', header: 'Stock (Avail / Total)', align: 'center' }
        ];

        records = issueAggregation.map((a, idx) => {
          const b = bookMap[a._id?.toString()] || {};
          return {
            _id: a._id || idx,
            rank: `#${idx + 1}`,
            accessionNo: b.accessionNo || 'N/A',
            title: b.title || 'Unknown Title',
            author: b.author || 'N/A',
            category: b.category || 'General',
            totalIssues: a.totalIssues,
            copies: `${b.availableCopies || 0} / ${b.totalCopies || 0}`
          };
        });
        break;
      }

      case 'Department-wise Usage': {
        const students = await Student.find({ collegeId }).select('_id branch').lean();
        const branchMap = {};
        students.forEach(s => {
          const b = s.branch || 'General';
          if (!branchMap[b]) branchMap[b] = { branch: b, studentIds: new Set(), totalIssues: 0, currentIssues: 0, overdues: 0 };
          branchMap[b].studentIds.add(s._id.toString());
        });

        const txns = await LibraryTransaction.find({ collegeId }).select('studentId status dueDate').lean();
        txns.forEach(t => {
          if (!t.studentId) return;
          const sId = t.studentId.toString();
          for (const b of Object.values(branchMap)) {
            if (b.studentIds.has(sId)) {
              b.totalIssues++;
              if (t.status === 'Issued' || t.status === 'Renewed') {
                b.currentIssues++;
                if (new Date() > new Date(t.dueDate)) b.overdues++;
              }
              break;
            }
          }
        });

        const branchList = Object.values(branchMap).sort((a, b) => b.totalIssues - a.totalIssues);
        const topDept = branchList[0]?.branch || 'Academics';
        const totalDeptIssues = branchList.reduce((s, b) => s + b.totalIssues, 0);

        metrics = [
          { label: 'Leading Usage Department', value: topDept, iconType: 'up' },
          { label: 'Active Departments', value: branchList.length.toLocaleString(), iconType: 'chart' },
          { label: 'Total Departmental Circulations', value: totalDeptIssues.toLocaleString(), iconType: 'file' },
          { label: 'Department Overdue Rate', value: `${totalDeptIssues > 0 ? Math.round((branchList.reduce((s, b) => s + b.overdues, 0) / totalDeptIssues) * 100) : 0}%`, iconType: 'down' }
        ];

        chartData = {
          title: 'Circulation Usage by Department',
          categories: branchList.map(b => b.branch),
          series: [
            { name: 'Total Issues', data: branchList.map(b => b.totalIssues), color: '#0A6C54' },
            { name: 'Currently Held', data: branchList.map(b => b.currentIssues), color: '#3B82F6' }
          ]
        };

        columns = [
          { key: 'department', header: 'Department / Branch' },
          { key: 'enrolled', header: 'Enrolled Members', align: 'center' },
          { key: 'currentlyBorrowed', header: 'Books Currently Borrowed', align: 'center' },
          { key: 'totalIssues', header: 'Total Lifetime Issues', align: 'center' },
          { key: 'overdues', header: 'Overdue Books', align: 'center' },
          { key: 'share', header: 'Usage Share', align: 'center' }
        ];

        records = branchList.map(b => ({
          _id: b.branch,
          department: b.branch,
          enrolled: b.studentIds.size,
          currentlyBorrowed: b.currentIssues,
          totalIssues: b.totalIssues,
          overdues: b.overdues,
          share: `${totalDeptIssues > 0 ? Math.round((b.totalIssues / totalDeptIssues) * 100) : 0}%`
        }));
        break;
      }

      case 'Stock Verification Report': {
        const books = await LibraryBook.find({ collegeId }).sort({ accessionNo: 1 }).lean();
        const totalCopies = books.reduce((s, b) => s + (b.totalCopies || 0), 0);
        const availableCopies = books.reduce((s, b) => s + (b.availableCopies || 0), 0);
        const issuedCopies = books.reduce((s, b) => s + Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0)), 0);
        const valuation = books.reduce((s, b) => s + ((b.price || 0) * (b.totalCopies || 1)), 0);

        metrics = [
          { label: 'Cataloged Titles Audit', value: books.length.toLocaleString(), iconType: 'file' },
          { label: 'Total Physical Stock Copies', value: totalCopies.toLocaleString(), iconType: 'up' },
          { label: 'Total Stock Valuation', value: `₹${valuation.toLocaleString()}`, iconType: 'chart' },
          { label: 'Stock In-Hand Availability Rate', value: `${totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0}%`, iconType: 'down' }
        ];

        chartData = {
          title: 'Physical Stock Distribution',
          categories: ['Available on Shelf', 'Issued Out to Members', 'Lost / Damaged'],
          series: [
            { name: 'Copies', data: [availableCopies, issuedCopies, books.filter(b => b.status === 'Lost' || b.status === 'Damaged').length], color: '#0A6C54' }
          ]
        };

        columns = [
          { key: 'accessionNo', header: 'Accession No' },
          { key: 'title', header: 'Book Title' },
          { key: 'isbn', header: 'ISBN' },
          { key: 'location', header: 'Shelf Location' },
          { key: 'unitPrice', header: 'Unit Price', align: 'right' },
          { key: 'totalCopies', header: 'Total Copies', align: 'center' },
          { key: 'availableCopies', header: 'In Stock', align: 'center' },
          { key: 'issuedCopies', header: 'Issued Out', align: 'center' },
          { key: 'stockStatus', header: 'Verification Status', align: 'center' }
        ];

        records = books.map(b => ({
          _id: b._id,
          accessionNo: b.accessionNo || 'N/A',
          title: b.title || 'Untitled',
          isbn: b.isbn || '—',
          location: b.shelf ? `${b.shelf} ${b.rack ? '- ' + b.rack : ''}` : (b.shelfLocation || 'Main Stack'),
          unitPrice: `₹${b.price || 0}`,
          totalCopies: b.totalCopies || 0,
          availableCopies: b.availableCopies || 0,
          issuedCopies: Math.max(0, (b.totalCopies || 0) - (b.availableCopies || 0)),
          stockStatus: b.status === 'Lost' ? 'Missing / Lost' : (b.status === 'Damaged' ? 'Damaged' : (b.availableCopies === 0 ? 'Fully Issued' : 'Verified Available'))
        }));
        break;
      }

      case 'Daily Transaction Report':
      default: {
        // Daily Activity Log combining issues, returns, and lost reports
        const txns = await LibraryTransaction.find({
          collegeId,
          $or: [
            { issueDate: { $gte: start, $lte: end } },
            { returnDate: { $gte: start, $lte: end } }
          ]
        })
          .populate('bookId', 'title accessionNo')
          .populate('studentId', 'studentName firstName lastName')
          .sort({ updatedAt: -1 })
          .lean();

        const issuesCount = txns.filter(t => t.issueDate && new Date(t.issueDate) >= start && new Date(t.issueDate) <= end).length;
        const returnsCount = txns.filter(t => t.returnDate && new Date(t.returnDate) >= start && new Date(t.returnDate) <= end).length;
        const fineCollected = txns.reduce((s, t) => s + (t.paidAmount || 0), 0);

        metrics = [
          { label: 'Total Circulation Operations', value: txns.length.toLocaleString(), iconType: 'file' },
          { label: 'Books Issued in Period', value: issuesCount.toLocaleString(), iconType: 'up' },
          { label: 'Books Returned in Period', value: returnsCount.toLocaleString(), iconType: 'chart' },
          { label: 'Fine Revenue Collected', value: `₹${fineCollected.toLocaleString()}`, iconType: 'down' }
        ];

        const dateMap = {};
        txns.forEach(t => {
          const d = (t.returnDate ? new Date(t.returnDate) : new Date(t.issueDate)).toISOString().split('T')[0];
          if (!dateMap[d]) dateMap[d] = { issues: 0, returns: 0 };
          if (t.returnDate && new Date(t.returnDate) >= start && new Date(t.returnDate) <= end) dateMap[d].returns++;
          else dateMap[d].issues++;
        });

        const sortedDates = Object.keys(dateMap).sort();
        chartData = {
          title: 'Daily Circulation Activity Trend',
          categories: sortedDates.length ? sortedDates : [start.toISOString().split('T')[0]],
          series: [
            { name: 'Books Issued', data: sortedDates.length ? sortedDates.map(d => dateMap[d].issues) : [0], color: '#0A6C54' },
            { name: 'Books Returned', data: sortedDates.length ? sortedDates.map(d => dateMap[d].returns) : [0], color: '#3B82F6' }
          ]
        };

        columns = [
          { key: 'date', header: 'Timestamp' },
          { key: 'action', header: 'Operation Type', align: 'center' },
          { key: 'refNo', header: 'Transaction ID' },
          { key: 'bookTitle', header: 'Book Title' },
          { key: 'borrower', header: 'Member Name' },
          { key: 'dueDate', header: 'Due / Return Date' },
          { key: 'financial', header: 'Fine Paid', align: 'right' },
          { key: 'status', header: 'Status', align: 'center' }
        ];

        records = txns.map(t => {
          const isReturn = t.status === 'Returned' && t.returnDate;
          const borrower = (t.memberName && t.memberName !== 'undefined') ? t.memberName : (t.studentId?.studentName || `${t.studentId?.firstName || ''} ${t.studentId?.lastName || ''}`.trim() || 'Student');
          return {
            _id: t._id,
            date: new Date(isReturn ? t.returnDate : t.issueDate).toLocaleString(),
            action: isReturn ? 'Return' : 'Issue',
            refNo: t.transactionId,
            bookTitle: t.bookId?.title || 'Unknown',
            borrower,
            dueDate: isReturn ? new Date(t.returnDate).toLocaleDateString() : new Date(t.dueDate).toLocaleDateString(),
            financial: t.paidAmount ? `₹${t.paidAmount}` : '₹0',
            status: t.status
          };
        });
        break;
      }
    }

    res.status(200).json({
      reportType,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      metrics,
      chartData,
      columns,
      records
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching custom report', error: error.message });
  }
};

// --- Members (Students / Teachers / Staff) for Issue Book ---
exports.getMembers = async (req, res) => {
  try {
    const { search } = req.query;
    const collegeId = req.college._id;
    let members = [];

    const searchQuery = search ? search.trim() : '';

    // 1. Search Students
    const studentFilter = { collegeId, status: { $ne: 'Dropped' } };
    if (searchQuery) {
      const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      studentFilter.$or = [
        { studentName: regex },
        { firstName: regex },
        { lastName: regex },
        { studentId: regex },
        { enrollmentNo: regex },
        { rollNo: regex },
        { rollNumber: regex },
        { email: regex },
        { phone: regex }
      ];
    }
    const students = await Student.find(studentFilter).limit(20).lean();

    students.forEach(s => {
      members.push({
        _id: s._id,
        name: s.studentName || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student',
        type: 'Student',
        code: s.enrollmentNo || s.studentId || s.rollNo || s.rollNumber || 'N/A',
        branch: s.branch || '',
        semester: s.semester || '',
        phone: s.phone || '',
        email: s.email || ''
      });
    });

    // 2. Search Teachers
    try {
      const Teacher = require('../models/Teacher');
      const teacherFilter = { collegeId, status: 'Active' };
      if (searchQuery) {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        teacherFilter.$or = [
          { name: regex },
          { employeeId: regex },
          { teacherId: regex },
          { email: regex },
          { phone: regex }
        ];
      }
      const teachers = await Teacher.find(teacherFilter).limit(10).lean();
      teachers.forEach(t => {
        members.push({
          _id: t._id,
          name: t.name || 'Teacher',
          type: 'Teacher',
          code: t.employeeId || t.teacherId || 'N/A',
          branch: t.department || '',
          phone: t.phone || '',
          email: t.email || ''
        });
      });
    } catch (e) {
      // Teacher search fallback
    }

    // 3. Search Staff / Employees
    try {
      const Employee = require('../models/Employee');
      const empFilter = { collegeId, status: 'Active' };
      if (searchQuery) {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'i');
        empFilter.$or = [
          { name: regex },
          { employeeId: regex },
          { email: regex },
          { phone: regex }
        ];
      }
      const employees = await Employee.find(empFilter).limit(10).lean();
      employees.forEach(e => {
        members.push({
          _id: e._id,
          name: e.name || 'Employee',
          type: 'Staff',
          code: e.employeeId || 'N/A',
          branch: e.department || '',
          phone: e.phone || '',
          email: e.email || ''
        });
      });
    } catch (e) {
      // Employee search fallback
    }

    res.status(200).json({ members });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching members', error: error.message });
  }
};

