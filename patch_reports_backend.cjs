const fs = require('fs');

const filepath = 'd:/Desktop/DCT_CLG_CRM/backend/controllers/libraryController.js';
let content = fs.readFileSync(filepath, 'utf-8');

const newMethod = `
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
          fine: { $gt: 0 },
          returnDate: { $gte: start, $lte: end }
        });
        
        const totalFines = fines.reduce((sum, t) => sum + (t.fine || 0), 0);
        const paidFines = fines.reduce((sum, t) => sum + (t.finePaid || 0), 0);
        
        metrics = [
          { label: 'Total Fines Levied', value: \`₹\${totalFines}\`, iconType: 'up' },
          { label: 'Total Fines Collected', value: \`₹\${paidFines}\`, iconType: 'chart' },
          { label: 'Pending Fines', value: \`₹\${totalFines - paidFines}\`, iconType: 'down' }
        ];

        // Group by date
        const dailyFines = {};
        fines.forEach(f => {
          if(f.returnDate) {
            const d = f.returnDate.toISOString().split('T')[0];
            if(!dailyFines[d]) dailyFines[d] = 0;
            dailyFines[d] += f.finePaid || 0;
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
`;

if (!content.includes('exports.getCustomReportData')) {
    content += '\n' + newMethod;
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log("Added getCustomReportData to libraryController.js");
} else {
    console.log("getCustomReportData already exists");
}
