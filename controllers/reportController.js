const Student = require('../models/Student');
const Admission = require('../models/Admission');
const Employee = require('../models/Employee');
const LibraryTransaction = require('../models/LibraryTransaction');
const LibraryBook = require('../models/LibraryBook');
const HostelAllocation = require('../models/HostelAllocation');
const HostelRoom = require('../models/HostelRoom');
const HostelLeaveOuting = require('../models/HostelLeaveOuting');
const Complaint = require('../models/Complaint');
const SecurityLog = require('../models/SecurityLog');
const SecurityIncident = require('../models/SecurityIncident');
const VehicleLog = require('../models/VehicleLog');
const Assignment = require('../models/Assignment');

// Helper to build date filter
const buildDateFilter = (startDate, endDate, field = 'createdAt') => {
  if (!startDate && !endDate) return {};
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  if (endDate) dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  return { [field]: dateFilter };
};

// ============ ADMISSIONS REPORTS ============

exports.getAdmissionsReport = async (req, res) => {
  try {
    // If a superadmin hits this route, redirect to the superadmin-specific handler
    if (req.superAdmin) {
      return exports.getAdmissionReports(req, res);
    }

    const { reportType, startDate, endDate, course, branch, status } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');
    const baseFilter = { collegeId, ...dateFilter };
    
    if (status && status !== 'All') {
      baseFilter.status = status;
    }

    let data = [];
    let columns = [];

    if (reportType === 'Applications Overview') {
      const admissions = await Admission.find(baseFilter).sort({ createdAt: -1 });
      columns = ['App No', 'Name', 'Course', 'Stage', 'Status', 'Date'];
      data = admissions.map(a => ({
        'App No': a.appNo,
        'Name': a.name,
        'Course': a.course,
        'Stage': a.stage,
        'Status': a.status,
        'Date': new Date(a.createdAt).toLocaleDateString('en-IN')
      }));
    } else if (reportType === 'Course-wise Registrations') {
      const admissions = await Admission.find({ collegeId, stage: 'Admitted' });
      const courseMap = {};
      admissions.forEach(a => {
        courseMap[a.course] = (courseMap[a.course] || 0) + 1;
      });
      columns = ['Course', 'Total Admitted'];
      data = Object.entries(courseMap).map(([course, count]) => ({ 'Course': course, 'Total Admitted': count }));
    } else if (reportType === 'Pending Verifications') {
      const admissions = await Admission.find({ collegeId, stage: 'Document Verification' });
      columns = ['App No', 'Name', 'Course', 'Mobile', 'Date'];
      data = admissions.map(a => ({
        'App No': a.appNo,
        'Name': a.name,
        'Course': a.course,
        'Mobile': a.mobile,
        'Date': new Date(a.createdAt).toLocaleDateString('en-IN')
      }));
    }

    res.json({ columns, data });
  } catch (error) {
    res.status(500).json({ message: 'Error generating admissions report', error: error.message });
  }
};


// ============ ACADEMIC REPORTS ============

exports.getAcademicReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

    let data = [];
    let columns = [];

    if (reportType === 'Student Directory') {
      const students = await Student.find({ collegeId, ...dateFilter }).sort({ createdAt: -1 });
      columns = ['Student ID', 'Name', 'Course', 'Branch', 'Year', 'Status', 'Enrollment Date'];
      data = students.map(s => ({
        'Student ID': s.studentId,
        'Name': s.studentName,
        'Course': s.course,
        'Branch': s.branch || '-',
        'Year': s.year || '-',
        'Status': s.status,
        'Enrollment Date': new Date(s.enrollmentDate).toLocaleDateString('en-IN')
      }));
    } else if (reportType === 'Faculty Directory') {
      const employees = await Employee.find({ collegeId, ...dateFilter }).sort({ createdAt: -1 });
      columns = ['Emp ID', 'Name', 'Role', 'Department', 'Status', 'Date of Joining'];
      data = employees.map(e => ({
        'Emp ID': e.empId,
        'Name': e.name,
        'Role': e.role,
        'Department': e.department,
        'Status': e.status,
        'Date of Joining': e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString('en-IN') : '-'
      }));
    } else if (reportType === 'Assignments') {
      const assignments = await Assignment.find({ collegeId, ...dateFilter }).sort({ dueDate: 1 });
      columns = ['Assignment ID', 'Title', 'Course', 'Subject', 'Due Date', 'Status'];
      data = assignments.map(a => ({
        'Assignment ID': a.assignmentId,
        'Title': a.title,
        'Course': a.course,
        'Subject': a.subject,
        'Due Date': new Date(a.dueDate).toLocaleDateString('en-IN'),
        'Status': a.status
      }));
    }

    res.json({ columns, data });
  } catch (error) {
    res.status(500).json({ message: 'Error generating academic report', error: error.message });
  }
};

// ============ HR & ADMIN REPORTS ============

exports.getHRReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

    let data = [];
    let columns = [];

    if (reportType === 'Employee Directory') {
      const employees = await Employee.find({ collegeId }).sort({ name: 1 });
      columns = ['Emp ID', 'Name', 'Email', 'Mobile', 'Role', 'Department', 'Status'];
      data = employees.map(e => ({
        'Emp ID': e.empId,
        'Name': e.name,
        'Email': e.email,
        'Mobile': e.mobile,
        'Role': e.role,
        'Department': e.department,
        'Status': e.status
      }));
    } else if (reportType === 'Complaints Log') {
      const complaints = await Complaint.find({ collegeId, ...dateFilter }).sort({ createdAt: -1 });
      columns = ['Complaint ID', 'Category', 'Submitted By', 'Priority', 'Status', 'Date'];
      data = complaints.map(c => ({
        'Complaint ID': c.complaintId,
        'Category': c.category,
        'Submitted By': c.submittedBy,
        'Priority': c.priority,
        'Status': c.status,
        'Date': new Date(c.createdAt).toLocaleDateString('en-IN')
      }));
    }

    res.json({ columns, data });
  } catch (error) {
    res.status(500).json({ message: 'Error generating HR report', error: error.message });
  }
};

// ============ LIBRARY REPORTS ============

exports.getLibraryReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const collegeId = req.college._id;

    let data = [];
    let columns = [];

    if (reportType === 'Issued Books') {
      const transactions = await LibraryTransaction.find({
        collegeId,
        ...buildDateFilter(startDate, endDate, 'issueDate')
      }).populate('bookId').sort({ issueDate: -1 });
      columns = ['Transaction ID', 'Book Title', 'Member', 'Issue Date', 'Due Date', 'Status', 'Fine (₹)'];
      data = transactions.map(t => ({
        'Transaction ID': t.transactionId || t._id.toString().slice(-6).toUpperCase(),
        'Book Title': t.bookId?.title || 'N/A',
        'Member': t.memberName || '-',
        'Issue Date': new Date(t.issueDate).toLocaleDateString('en-IN'),
        'Due Date': new Date(t.dueDate).toLocaleDateString('en-IN'),
        'Status': t.status,
        'Fine (₹)': t.fineAmount > 0 ? `₹${t.fineAmount}` : '-'
      }));
    } else if (reportType === 'Overdue Books') {
      const transactions = await LibraryTransaction.find({
        collegeId,
        status: { $in: ['Overdue', 'Issued'] },
        dueDate: { $lt: new Date() }
      }).populate('bookId').sort({ dueDate: 1 });
      columns = ['Book Title', 'ISBN', 'Member', 'Due Date', 'Days Overdue', 'Fine (₹)'];
      data = transactions.map(t => {
        const daysOverdue = Math.floor((new Date() - new Date(t.dueDate)) / (1000 * 60 * 60 * 24));
        return {
          'Book Title': t.bookId?.title || 'N/A',
          'ISBN': t.bookId?.isbn || '-',
          'Member': t.memberName || '-',
          'Due Date': new Date(t.dueDate).toLocaleDateString('en-IN'),
          'Days Overdue': `${daysOverdue} Days`,
          'Fine (₹)': `₹${daysOverdue * 10}`
        };
      });
    } else if (reportType === 'Book Catalog') {
      const books = await LibraryBook.find({ collegeId }).sort({ title: 1 });
      columns = ['ISBN', 'Title', 'Author', 'Category', 'Total Copies', 'Available', 'Status'];
      data = books.map(b => ({
        'ISBN': b.isbn || '-',
        'Title': b.title,
        'Author': b.author || '-',
        'Category': b.category || '-',
        'Total Copies': b.totalCopies || b.copies || 1,
        'Available': b.availableCopies ?? '-',
        'Status': b.status || 'Available'
      }));
    }

    res.json({ columns, data });
  } catch (error) {
    res.status(500).json({ message: 'Error generating library report', error: error.message });
  }
};

// ============ HOSTEL REPORTS ============

exports.getHostelReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

    let data = [];
    let columns = [];

    if (reportType === 'Room Occupancy') {
      const rooms = await HostelRoom.find({ collegeId });
      const allocations = await HostelAllocation.find({ collegeId, status: 'Active' });
      const allottedRoomIds = new Set(allocations.map(a => a.roomId.toString()));
      columns = ['Room No', 'Block', 'Type', 'Capacity', 'Occupancy', 'Status'];
      data = rooms.map(r => ({
        'Room No': r.roomNumber || '-',
        'Block': r.blockName || '-',
        'Type': r.type || '-',
        'Capacity': r.capacity || '-',
        'Occupancy': r.occupancy ?? '-',
        'Status': r.status || 'Available'
      }));
    } else if (reportType === 'Student Allotments') {
      const allocations = await HostelAllocation.find({ collegeId, ...dateFilter })
        .populate('studentId', 'studentName studentId')
        .populate('roomId', 'roomNo block')
        .sort({ allotmentDate: -1 });
      columns = ['Student ID', 'Student Name', 'Room No', 'Block', 'Allotment Date', 'Status'];
      data = allocations.map(a => ({
        'Student ID': a.studentId?.studentId || '-',
        'Student Name': a.studentId?.studentName || '-',
        'Room No': a.roomId?.roomNo || '-',
        'Block': a.roomId?.block || '-',
        'Allotment Date': new Date(a.allotmentDate).toLocaleDateString('en-IN'),
        'Status': a.status
      }));
    } else if (reportType === 'Leave & Outings') {
      const leaves = await HostelLeaveOuting.find({ collegeId, ...buildDateFilter(startDate, endDate, 'fromDate') })
        .sort({ createdAt: -1 });
      columns = ['Student', 'Type', 'Reason', 'From Date', 'To Date', 'Status'];
      data = leaves.map(l => ({
        'Student': l.studentName || l.studentId?.toString().slice(-6) || '-',
        'Type': l.type || '-',
        'Reason': l.reason || '-',
        'From Date': l.fromDate ? new Date(l.fromDate).toLocaleDateString('en-IN') : '-',
        'To Date': l.toDate ? new Date(l.toDate).toLocaleDateString('en-IN') : '-',
        'Status': l.status || '-'
      }));
    }

    res.json({ columns, data });
  } catch (error) {
    res.status(500).json({ message: 'Error generating hostel report', error: error.message });
  }
};

// ============ SECURITY REPORTS ============

exports.getSecurityReport = async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');
    const baseFilter = { collegeId, ...dateFilter };

    let data = [];
    let columns = [];

    if (reportType === 'Entry/Exit Log') {
      const logs = await SecurityLog.find({ ...baseFilter, logType: 'Student' })
        .populate('studentId', 'studentName studentId')
        .sort({ createdAt: -1 });
      columns = ['Student ID', 'Name', 'Movement', 'Entry Time', 'Exit Time', 'Remarks'];
      data = logs.map(l => ({
        'Student ID': l.studentId?.studentId || '-',
        'Name': l.studentId?.studentName || '-',
        'Movement': l.movementType || '-',
        'Entry Time': l.entryTime ? new Date(l.entryTime).toLocaleString('en-IN') : '-',
        'Exit Time': l.exitTime ? new Date(l.exitTime).toLocaleString('en-IN') : '-',
        'Remarks': l.remarks || '-'
      }));
    } else if (reportType === 'Visitor Log') {
      const logs = await SecurityLog.find({ ...baseFilter, logType: 'Visitor' }).sort({ createdAt: -1 });
      columns = ['Visitor Name', 'Purpose', 'Contact', 'Entry Time', 'Exit Time'];
      data = logs.map(l => ({
        'Visitor Name': l.visitorName || '-',
        'Purpose': l.purpose || '-',
        'Contact': l.contactNumber || '-',
        'Entry Time': l.entryTime ? new Date(l.entryTime).toLocaleString('en-IN') : '-',
        'Exit Time': l.exitTime ? new Date(l.exitTime).toLocaleString('en-IN') : '-'
      }));
    } else if (reportType === 'Vehicle Log') {
      const logs = await VehicleLog.find(baseFilter).sort({ createdAt: -1 });
      columns = ['Vehicle No', 'Type', 'Owner', 'Parking Zone', 'Check-In', 'Check-Out'];
      data = logs.map(l => ({
        'Vehicle No': l.plateNo || '-',
        'Type': l.vehicleType || '-',
        'Owner': l.ownerName || '-',
        'Parking Zone': l.parkingZone || '-',
        'Check-In': l.checkInTime ? new Date(l.checkInTime).toLocaleString('en-IN') : '-',
        'Check-Out': l.checkOutTime ? new Date(l.checkOutTime).toLocaleString('en-IN') : '-'
      }));
    } else if (reportType === 'Incident Reports') {
      const incidents = await SecurityIncident.find(baseFilter).sort({ createdAt: -1 });
      columns = ['Incident ID', 'Type', 'Description', 'Location', 'Severity', 'Status', 'Date'];
      data = incidents.map(i => ({
        'Incident ID': i.incidentId || i._id.toString().slice(-6).toUpperCase(),
        'Type': i.incidentType || '-',
        'Description': (i.description || '-').substring(0, 50) + ((i.description || '').length > 50 ? '...' : ''),
        'Location': i.location || '-',
        'Severity': i.severity || '-',
        'Status': i.status || '-',
        'Date': new Date(i.createdAt).toLocaleDateString('en-IN')
      }));
    }

    res.json({ columns, data });
  } catch (error) {
    res.status(500).json({ message: 'Error generating security report', error: error.message });
  }
};

// Backward compat — old routes
exports.getStudentReports = async (req, res) => {
  try {
    const filter = req.query.collegeId ? { collegeId: req.query.collegeId } : {};
    const students = await Student.find(filter).populate('collegeId', 'collegeName').sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

exports.getAdmissionReports = async (req, res) => {
  try {
    const filter = req.query.collegeId ? { collegeId: req.query.collegeId } : {};
    const admissions = await Admission.find(filter).populate('collegeId', 'collegeName').sort({ createdAt: -1 });
    res.json(admissions);
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};
