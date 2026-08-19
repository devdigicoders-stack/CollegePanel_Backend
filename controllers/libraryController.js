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
    const { search, category, status, page = 1, limit = 10 } = req.query;
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

    const skip = (page - 1) * limit;
    const books = await LibraryBook.find(query).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
    const total = await LibraryBook.countDocuments(query);

    res.status(200).json({
      books,
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
    
    if (status && status !== 'All') query.status = status;
    if (studentId) query.studentId = studentId;
    
    let transactions = await LibraryTransaction.find(query)
      .populate('bookId', 'title accessionNo author')
      .populate('studentId', 'firstName lastName enrollmentNo')
      .sort({ issueDate: -1 });
      
    if (search) {
      const lowerSearch = search.toLowerCase();
      transactions = transactions.filter(t => 
        (t.transactionId && t.transactionId.toLowerCase().includes(lowerSearch)) ||
        (t.bookId && t.bookId.title.toLowerCase().includes(lowerSearch)) ||
        (t.studentId && t.studentId.firstName && t.studentId.firstName.toLowerCase().includes(lowerSearch))
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
    
    const transaction = new LibraryTransaction({
      transactionId,
      bookId,
      studentId: memberId,
      memberName: member ? `${member.firstName} ${member.lastName || ''}`.trim() : 'Unknown Member',
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
    const { condition, remarks, fineAmount, returnDate } = req.body;
    
    // Support POST body { transactionId, returnDate, fineAmount, condition, remarks }
    const transactionIdParam = req.body.transactionId || req.params.id;
    
    const transaction = await LibraryTransaction.findOne({ _id: transactionIdParam, collegeId: req.college._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    if (transaction.status === 'Returned') return res.status(400).json({ message: 'Book already returned' });
    
    transaction.status = 'Returned';
    transaction.returnDate = returnDate || Date.now();
    transaction.condition = condition || transaction.condition;
    transaction.remarks = remarks || transaction.remarks;
    if (fineAmount !== undefined) transaction.fineAmount = fineAmount;
    
    await transaction.save();
    
    const book = await LibraryBook.findOne({ _id: transaction.bookId });
    if (book) {
      book.availableCopies += 1;
      if (book.status === 'Issued' && book.availableCopies > 0) {
         book.status = 'Available';
      }
      await book.save();
    }
    
    res.status(200).json({ message: 'Book returned successfully', transaction });
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
    }).populate('studentId', 'firstName lastName enrollmentNo').populate('bookId', 'title');
    
    const fines = transactions.map(t => ({
      transactionId: t._id,
      txnId: t.transactionId,
      memberName: t.memberName || (t.studentId ? `${t.studentId.firstName} ${t.studentId.lastName||''}` : 'Unknown'),
      bookTitle: t.bookId ? t.bookId.title : 'Unknown',
      fineAmount: t.fineAmount,
      paidAmount: t.paidAmount,
      balance: t.fineAmount - (t.paidAmount || 0),
      status: t.status
    }));
    
    res.status(200).json(fines);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fines', error: error.message });
  }
};

exports.collectFine = async (req, res) => {
  try {
    const { transactionId, amount } = req.body;
    const transaction = await LibraryTransaction.findOne({ _id: transactionId, collegeId: req.college._id });
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    
    transaction.paidAmount = (transaction.paidAmount || 0) + Number(amount);
    await transaction.save();
    
    res.status(200).json({ message: 'Fine collected successfully', transaction });
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
        let member = await Student.findById(r.memberId).select('firstName lastName enrollmentNo').lean();
        if (!member) {
          member = await Teacher.findById(r.memberId).select('firstName lastName').lean();
        }
        if (!member) {
          member = await Employee.findById(r.memberId).select('firstName lastName').lean();
        }
        if (member) {
          r.memberId = member;
        } else {
          r.memberId = { firstName: 'Unknown', lastName: 'Member' };
        }
      }
    }

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching records', error: error.message });
  }
};

exports.addLostDamaged = async (req, res) => {
  try {
    const caseNo = await generateCaseNo();
    const record = new LibraryLostDamaged({
      ...req.body,
      caseNo,
      collegeId: req.college._id
    });
    await record.save();
    
    if (req.body.bookId) {
       const book = await LibraryBook.findOne({ _id: req.body.bookId, collegeId: req.college._id });
       if (book) {
          book.status = req.body.type === 'Lost' ? 'Lost' : 'Damaged';
          await book.save();
       }
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

    let metrics = [];
    let chartData = {};

    switch (reportType) {
      case 'Book Inventory Report': {
        const books = await LibraryBook.find({ collegeId, createdAt: { $lte: end } });
        const totalCopies = books.reduce((sum, b) => sum + (b.totalCopies || 0), 0);
        const availableCopies = books.reduce((sum, b) => sum + (b.availableCopies || 0), 0);
        
        metrics = [
          { label: 'Total Book Copies', value: totalCopies.toLocaleString(), iconType: 'up' },
          { label: 'Available Copies', value: availableCopies.toLocaleString(), iconType: 'chart' },
          { label: 'Lost/Damaged Copies', value: books.filter(b => b.status === 'Lost' || b.status === 'Damaged').length, iconType: 'down' }
        ];

        // Category-wise aggregate
        const categories = {};
        books.forEach(b => {
          if (!categories[b.category]) categories[b.category] = 0;
          categories[b.category] += b.totalCopies || 1;
        });

        chartData = {
          title: 'Books by Category',
          categories: Object.keys(categories),
          series: [
            { name: 'Total Copies', data: Object.values(categories), color: '#0A6C54' }
          ]
        };
        break;
      }
      case 'Fine Collection Report': {
        const fines = await LibraryTransaction.find({ 
          collegeId, 
          fineAmount: { $gt: 0 },
          returnDate: { $gte: start, $lte: end }
        });
        
        const totalFines = fines.reduce((sum, t) => sum + (t.fineAmount || 0), 0);
        const paidFines = fines.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
        
        metrics = [
          { label: 'Total Fines Levied', value: `₹${totalFines}`, iconType: 'up' },
          { label: 'Total Fines Collected', value: `₹${paidFines}`, iconType: 'chart' },
          { label: 'Pending Fines', value: `₹${totalFines - paidFines}`, iconType: 'down' }
        ];

        // Group by date
        const dailyFines = {};
        fines.forEach(f => {
          if(f.returnDate) {
            const d = f.returnDate.toISOString().split('T')[0];
            if(!dailyFines[d]) dailyFines[d] = 0;
            dailyFines[d] += f.paidAmount || 0;
          }
        });
        
        const sortedDates = Object.keys(dailyFines).sort();

        chartData = {
          title: 'Fine Collection Trend',
          categories: sortedDates,
          series: [
            { name: 'Collected Amount (₹)', data: sortedDates.map(d => dailyFines[d]), color: '#3B82F6' }
          ]
        };
        break;
      }
      default: {
        // Issued Books Report, Member Activity Report, Most Issued Books, Default
        const transactions = await LibraryTransaction.find({ 
          collegeId,
          issueDate: { $gte: start, $lte: end }
        });
        
        const overdues = await LibraryTransaction.find({
          collegeId,
          status: 'Issued',
          dueDate: { $lt: new Date() }
        });

        metrics = [
          { label: 'Books Issued', value: transactions.length.toLocaleString(), iconType: 'up' },
          { label: 'Current Overdue Issues', value: overdues.length.toLocaleString(), iconType: 'down' },
          { label: 'Active Library Members', value: await Student.countDocuments({ collegeId, libraryStatus: 'Active' }), iconType: 'chart' }
        ];

        // Group by department logic (mock for transactions mapping to students)
        const dailyIssues = {};
        const dailyReturns = {};
        
        const allTxns = await LibraryTransaction.find({
            collegeId,
            $or: [
                { issueDate: { $gte: start, $lte: end } },
                { returnDate: { $gte: start, $lte: end } }
            ]
        });
        
        const dateSet = new Set();
        allTxns.forEach(t => {
          if (t.issueDate && t.issueDate >= start && t.issueDate <= end) {
            const d = t.issueDate.toISOString().split('T')[0];
            dateSet.add(d);
            dailyIssues[d] = (dailyIssues[d] || 0) + 1;
          }
          if (t.returnDate && t.returnDate >= start && t.returnDate <= end) {
            const d = t.returnDate.toISOString().split('T')[0];
            dateSet.add(d);
            dailyReturns[d] = (dailyReturns[d] || 0) + 1;
          }
        });

        let sortedDates = Array.from(dateSet).sort();
        // If no data, provide an empty frame
        if(sortedDates.length === 0) {
            sortedDates = [start.toISOString().split('T')[0]];
        }

        chartData = {
          title: 'Circulation Over Time',
          categories: sortedDates,
          series: [
            { name: 'Books Issued', data: sortedDates.map(d => dailyIssues[d] || 0), color: '#0A6C54' },
            { name: 'Books Returned', data: sortedDates.map(d => dailyReturns[d] || 0), color: '#3B82F6' }
          ]
        };
        break;
      }
    }

    res.status(200).json({ metrics, chartData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching custom report', error: error.message });
  }
};
