const Student = require('../models/Student');
const Admission = require('../models/Admission');
const Employee = require('../models/Employee');
const Teacher = require('../models/Teacher');
const Assignment = require('../models/Assignment');
const StudentAttendance = require('../models/StudentAttendance');
const StudyMaterial = require('../models/StudyMaterial');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');
const LibraryTransaction = require('../models/LibraryTransaction');
const LibraryBook = require('../models/LibraryBook');
const LibraryLostDamaged = require('../models/LibraryLostDamaged');
const HostelRoom = require('../models/HostelRoom');
const HostelAllocation = require('../models/HostelAllocation');
const HostelLeaveOuting = require('../models/HostelLeaveOuting');
const HostelIncident = require('../models/HostelIncident');
const HostelVisitor = require('../models/HostelVisitor');
const SecurityLog = require('../models/SecurityLog');
const SecurityIncident = require('../models/SecurityIncident');
const VehicleLog = require('../models/VehicleLog');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Designation = require('../models/Designation');
const SubjectAllocation = require('../models/SubjectAllocation');

// Helper to build date filter
const buildDateFilter = (startDate, endDate, field = 'createdAt') => {
  if (!startDate && !endDate) return {};
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(new Date(startDate).setHours(0, 0, 0, 0));
  if (endDate) dateFilter.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  return { [field]: dateFilter };
};

// ============ DYNAMIC FILTER OPTIONS ============
exports.getFilterOptions = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const [
      departments,
      courses,
      designations,
      complaintCategories,
      hostelBlocks,
      libraryCategories,
      studentCourses,
      studentBranches,
      admissionCourses,
      admissionBranches
    ] = await Promise.all([
      Department.find({ collegeId }).select('name'),
      Course.find({ collegeId }).select('name code department'),
      Designation.find({ collegeId }).select('name'),
      Complaint.distinct('category', { collegeId }),
      HostelRoom.distinct('blockName', { collegeId }),
      LibraryBook.distinct('category', { collegeId }),
      Student.distinct('course', { collegeId }),
      Student.distinct('branch', { collegeId }),
      Admission.distinct('course', { collegeId }),
      Admission.distinct('branch', { collegeId })
    ]);

    // Consolidate & deduplicate all courses & branches
    const allCourseSet = new Set();
    courses.forEach(c => { if (c.name) allCourseSet.add(c.name.trim()); });
    studentCourses.forEach(c => { if (c) allCourseSet.add(c.trim()); });
    studentBranches.forEach(b => { if (b) allCourseSet.add(b.trim()); });
    admissionCourses.forEach(c => { if (c) allCourseSet.add(c.trim()); });
    admissionBranches.forEach(b => { if (b) allCourseSet.add(b.trim()); });

    const allDeptSet = new Set();
    departments.forEach(d => { if (d.name) allDeptSet.add(d.name.trim()); });
    courses.forEach(c => { if (c.department) allDeptSet.add(c.department.trim()); });

    res.json({
      departments: Array.from(allDeptSet).filter(Boolean).sort(),
      courses: Array.from(allCourseSet).filter(Boolean).sort(),
      designations: Array.from(new Set(designations.map(d => d.name?.trim()))).filter(Boolean).sort(),
      complaintCategories: complaintCategories.filter(Boolean),
      hostelBlocks: hostelBlocks.filter(Boolean),
      libraryCategories: libraryCategories.filter(Boolean)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching report filter options', error: error.message });
  }
};

// ============ ADMISSIONS REPORTS ============
exports.getAdmissionsReport = async (req, res) => {
  try {
    if (req.superAdmin) {
      return exports.getAdmissionReports(req, res);
    }

    const { reportType, startDate, endDate, course, status, stage, search } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');
    const baseFilter = { collegeId, ...dateFilter };
    
    const andConditions = [];

    if (status && status !== 'All') {
      andConditions.push({ status: { $regex: new RegExp(`^${status.trim()}$`, 'i') } });
    }
    if (stage && stage !== 'All') {
      andConditions.push({ stage: { $regex: new RegExp(`^${stage.trim()}$`, 'i') } });
    }
    if (course && course !== 'All') {
      const cRegex = new RegExp(course.trim(), 'i');
      andConditions.push({
        $or: [
          { course: { $regex: cRegex } },
          { branch: { $regex: cRegex } },
          { stream: { $regex: cRegex } },
          { department: { $regex: cRegex } }
        ]
      });
    }
    if (search && search.trim()) {
      const s = search.trim();
      andConditions.push({
        $or: [
          { appNo: { $regex: s, $options: 'i' } },
          { name: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { mobile: { $regex: s, $options: 'i' } }
        ]
      });
    }

    if (andConditions.length > 0) {
      baseFilter.$and = andConditions;
    }

    let data = [];
    let columns = [];

    if (reportType === 'Applications Overview') {
      const admissions = await Admission.find(baseFilter).sort({ createdAt: -1 });
      columns = ['App No', 'Name', 'Course', 'Stage', 'Gender', 'Mobile', 'Email', 'Status', 'Date'];
      data = admissions.map(a => ({
        'App No': a.appNo,
        'Name': a.name,
        'Course': a.course || a.branch || '-',
        'Stage': a.stage || '-',
        'Gender': a.gender || '-',
        'Mobile': a.mobile || '-',
        'Email': a.email || '-',
        'Status': a.status || 'Pending',
        'Date': new Date(a.createdAt).toLocaleDateString('en-IN')
      }));
    } else if (reportType === 'Course-wise Registrations') {
      const admissions = await Admission.find(baseFilter);
      
      const courseMap = {};
      admissions.forEach(a => {
        const cName = a.course || a.branch || 'Unassigned';
        if (!courseMap[cName]) {
          courseMap[cName] = { total: 0, admitted: 0, pending: 0, rejected: 0 };
        }
        courseMap[cName].total += 1;
        if (a.stage === 'Admitted' || a.status === 'Approved') courseMap[cName].admitted += 1;
        else if (a.status === 'Rejected') courseMap[cName].rejected += 1;
        else courseMap[cName].pending += 1;
      });

      columns = ['Course', 'Total Applications', 'Admitted', 'Pending', 'Rejected'];
      data = Object.entries(courseMap).map(([c, stats]) => ({
        'Course': c,
        'Total Applications': stats.total,
        'Admitted': stats.admitted,
        'Pending': stats.pending,
        'Rejected': stats.rejected
      }));
    } else if (reportType === 'Pending Verifications') {
      const pendingBase = { ...baseFilter };
      const pendingStages = [
        { stage: { $regex: /verification/i } },
        { stage: { $regex: /registration/i } },
        { status: { $regex: /pending/i } }
      ];

      if (pendingBase.$and) {
        pendingBase.$and.push({ $or: pendingStages });
      } else {
        pendingBase.$or = pendingStages;
      }

      const admissions = await Admission.find(pendingBase).sort({ createdAt: -1 });
      columns = ['App No', 'Name', 'Course', 'Mobile', 'Email', 'Stage', 'Status', 'Date'];
      data = admissions.map(a => ({
        'App No': a.appNo,
        'Name': a.name,
        'Course': a.course || a.branch || '-',
        'Mobile': a.mobile || '-',
        'Email': a.email || '-',
        'Stage': a.stage || 'Document Verification',
        'Status': a.status || 'Pending',
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
    const { reportType, startDate, endDate, course, branch, year, status, department, designation, search } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

    let data = [];
    let columns = [];

    if (reportType === 'Student Directory') {
      const studentFilter = { collegeId, ...dateFilter };
      const andConditions = [];

      if (course && course !== 'All') {
        const cRegex = new RegExp(course.trim(), 'i');
        andConditions.push({
          $or: [
            { course: { $regex: cRegex } },
            { branch: { $regex: cRegex } }
          ]
        });
      }

      if (branch && branch !== 'All') {
        andConditions.push({ branch: { $regex: new RegExp(branch.trim(), 'i') } });
      }

      if (year && year !== 'All') {
        andConditions.push({
          $or: [
            { year: { $regex: new RegExp(year.trim(), 'i') } },
            { semester: { $regex: new RegExp(year.trim(), 'i') } }
          ]
        });
      }

      if (status && status !== 'All') {
        andConditions.push({ status: { $regex: new RegExp(`^${status.trim()}$`, 'i') } });
      }

      if (search && search.trim()) {
        const s = search.trim();
        andConditions.push({
          $or: [
            { studentId: { $regex: s, $options: 'i' } },
            { rollNumber: { $regex: s, $options: 'i' } },
            { rollNo: { $regex: s, $options: 'i' } },
            { studentName: { $regex: s, $options: 'i' } },
            { mobileNumber: { $regex: s, $options: 'i' } },
            { phone: { $regex: s, $options: 'i' } },
            { email: { $regex: s, $options: 'i' } }
          ]
        });
      }

      if (andConditions.length > 0) {
        studentFilter.$and = andConditions;
      }

      const students = await Student.find(studentFilter).sort({ createdAt: -1 });
      columns = ['Student ID', 'Roll No', 'Name', 'Course', 'Branch', 'Year', 'Gender', 'Mobile', 'Status', 'Enrollment Date'];
      data = students.map(s => ({
        'Student ID': s.studentId || '-',
        'Roll No': s.rollNo || s.rollNumber || '-',
        'Name': s.studentName,
        'Course': s.course || '-',
        'Branch': s.branch || '-',
        'Year': s.year || s.semester || '-',
        'Gender': s.gender || '-',
        'Mobile': s.phone || s.mobileNumber || '-',
        'Status': s.status || 'Active',
        'Enrollment Date': s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString('en-IN') : (s.createdAt ? new Date(s.createdAt).toLocaleDateString('en-IN') : '-')
      }));
    } else if (reportType === 'Faculty Directory') {
      // Query actual Teacher model
      const teacherFilter = { collegeId, ...dateFilter };
      if (department && department !== 'All') teacherFilter.department = department;
      if (designation && designation !== 'All') teacherFilter.designation = designation;
      if (status && status !== 'All') teacherFilter.status = status;
      if (search && search.trim()) {
        const s = search.trim();
        teacherFilter.$or = [
          { empId: { $regex: s, $options: 'i' } },
          { name: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { mobile: { $regex: s, $options: 'i' } }
        ];
      }

      const teachers = await Teacher.find(teacherFilter).sort({ name: 1 });
      columns = ['Emp ID', 'Name', 'Department', 'Designation', 'Qualification', 'Experience (Yrs)', 'Mobile', 'Email', 'Status'];
      data = teachers.map(t => ({
        'Emp ID': t.empId || '-',
        'Name': t.name,
        'Department': t.department || '-',
        'Designation': t.designation || 'Teacher',
        'Qualification': t.qualification || '-',
        'Experience (Yrs)': t.experience || '-',
        'Mobile': t.mobile || '-',
        'Email': t.email || '-',
        'Status': t.status || 'Active'
      }));
    } else if (reportType === 'Assignments') {
      const assignmentFilter = { collegeId, ...dateFilter };
      if (course && course !== 'All') {
        const cRegex = new RegExp(course.trim(), 'i');
        assignmentFilter.$or = [
          { course: { $regex: cRegex } },
          { subject: { $regex: cRegex } }
        ];
      }
      if (status && status !== 'All') assignmentFilter.status = status;
      if (search && search.trim()) {
        assignmentFilter.title = { $regex: search.trim(), $options: 'i' };
      }

      const assignments = await Assignment.find(assignmentFilter).sort({ dueDate: 1 });
      columns = ['Assignment ID', 'Title', 'Course', 'Subject', 'Due Date', 'Total Marks', 'Status'];
      data = assignments.map(a => ({
        'Assignment ID': a.assignmentId,
        'Title': a.title,
        'Course': a.course,
        'Subject': a.subject,
        'Due Date': a.dueDate ? new Date(a.dueDate).toLocaleDateString('en-IN') : '-',
        'Total Marks': a.totalMarks || 100,
        'Status': a.status || 'Active'
      }));
    } else if (reportType === 'Student Attendance') {
      const attFilter = { collegeId, ...buildDateFilter(startDate, endDate, 'date') };
      const attendances = await StudentAttendance.find(attFilter)
        .populate('classId')
        .populate('teacherId', 'name')
        .populate('records.studentId', 'studentId studentName course branch')
        .sort({ date: -1 });

      columns = ['Student ID', 'Student Name', 'Course', 'Date', 'Teacher', 'Status', 'Remarks'];
      attendances.forEach(att => {
        const attDate = att.date ? new Date(att.date).toLocaleDateString('en-IN') : '-';
        const teacherName = att.teacherId?.name || '-';
        (att.records || []).forEach(r => {
          const st = r.studentId;
          if (st) {
            if (status && status !== 'All' && String(r.status).toLowerCase() !== status.toLowerCase()) return;
            if (course && course !== 'All') {
              const cRegex = new RegExp(course.trim(), 'i');
              if (!cRegex.test(st.course || '') && !cRegex.test(st.branch || '')) return;
            }
            if (search && search.trim()) {
              const q = search.trim().toLowerCase();
              if (!st.studentName?.toLowerCase().includes(q) && !st.studentId?.toLowerCase().includes(q)) return;
            }
            data.push({
              'Student ID': st.studentId || '-',
              'Student Name': st.studentName || '-',
              'Course': st.course || st.branch || '-',
              'Date': attDate,
              'Teacher': teacherName,
              'Status': r.status || 'Present',
              'Remarks': r.remarks || '-'
            });
          }
        });
      });
    } else if (reportType === 'Study Materials') {
      const matFilter = { collegeId, ...dateFilter };
      if (course && course !== 'All') {
        const cRegex = new RegExp(course.trim(), 'i');
        matFilter.$or = [
          { course: { $regex: cRegex } },
          { subject: { $regex: cRegex } }
        ];
      }
      if (search && search.trim()) {
        matFilter.title = { $regex: search.trim(), $options: 'i' };
      }

      const materials = await StudyMaterial.find(matFilter).sort({ createdAt: -1 });
      columns = ['Title', 'Course', 'Subject', 'Type', 'Size', 'Upload Date'];
      data = materials.map(m => ({
        'Title': m.title,
        'Course': m.course,
        'Subject': m.subject,
        'Type': m.type || 'PDF',
        'Size': m.size || 'Unknown',
        'Upload Date': new Date(m.createdAt).toLocaleDateString('en-IN')
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
    const { reportType, startDate, endDate, role, department, status, category, priority, search } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

    let data = [];
    let columns = [];

    if (reportType === 'Employee Directory') {
      const empFilter = { collegeId, ...dateFilter };
      if (role && role !== 'All') empFilter.role = role;
      if (department && department !== 'All') empFilter.department = department;
      if (status && status !== 'All') empFilter.status = status;
      if (search && search.trim()) {
        const s = search.trim();
        empFilter.$or = [
          { empId: { $regex: s, $options: 'i' } },
          { name: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { mobile: { $regex: s, $options: 'i' } }
        ];
      }

      const employees = await Employee.find(empFilter).sort({ name: 1 });
      columns = ['Emp ID', 'Name', 'Role', 'Department', 'Mobile', 'Email', 'Status', 'Date of Joining'];
      data = employees.map(e => ({
        'Emp ID': e.empId,
        'Name': e.name,
        'Role': e.role,
        'Department': e.department || '-',
        'Mobile': e.mobile || '-',
        'Email': e.email || '-',
        'Status': e.status || 'Active',
        'Date of Joining': e.dateOfJoining ? new Date(e.dateOfJoining).toLocaleDateString('en-IN') : '-'
      }));
    } else if (reportType === 'Complaints Log') {
      const compFilter = { collegeId, ...dateFilter };
      if (category && category !== 'All') compFilter.category = category;
      if (priority && priority !== 'All') compFilter.priority = priority;
      if (status && status !== 'All') compFilter.status = status;
      if (search && search.trim()) {
        compFilter.complaintId = { $regex: search.trim(), $options: 'i' };
      }

      const complaints = await Complaint.find(compFilter).sort({ createdAt: -1 });
      columns = ['Complaint ID', 'Category', 'Submitted By', 'Role', 'Priority', 'Status', 'Date'];
      data = complaints.map(c => ({
        'Complaint ID': c.complaintId,
        'Category': c.category,
        'Submitted By': c.submittedBy,
        'Role': c.submittedByRole || 'Student',
        'Priority': c.priority,
        'Status': c.status,
        'Date': new Date(c.createdAt).toLocaleDateString('en-IN')
      }));
    } else if (reportType === 'Notices & Circulars') {
      const noticeFilter = { collegeId, ...dateFilter };
      if (status && status !== 'All') noticeFilter.status = status;
      if (search && search.trim()) {
        noticeFilter.title = { $regex: search.trim(), $options: 'i' };
      }

      const notices = await Notice.find(noticeFilter).sort({ dateOfPublishing: -1 });
      columns = ['Notice ID', 'Title', 'Target Audience', 'Department', 'Posted By', 'Publish Date', 'Status'];
      data = notices.map(n => ({
        'Notice ID': n.noticeId,
        'Title': n.title,
        'Target Audience': n.targetAudience,
        'Department': n.department || 'All',
        'Posted By': n.postedBy || 'Admin',
        'Publish Date': new Date(n.dateOfPublishing).toLocaleDateString('en-IN'),
        'Status': n.status || 'Published'
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
    const { reportType, startDate, endDate, status, category, search } = req.query;
    const collegeId = req.college._id;

    let data = [];
    let columns = [];

    if (reportType === 'Issued Books') {
      const txnFilter = {
        collegeId,
        ...buildDateFilter(startDate, endDate, 'issueDate')
      };
      if (status && status !== 'All') txnFilter.status = status;
      if (search && search.trim()) {
        txnFilter.memberName = { $regex: search.trim(), $options: 'i' };
      }

      const transactions = await LibraryTransaction.find(txnFilter)
        .populate('bookId', 'title isbn author')
        .sort({ issueDate: -1 });

      columns = ['Transaction ID', 'Book Title', 'Member Name', 'Member Type', 'Issue Date', 'Due Date', 'Status', 'Fine (₹)'];
      data = transactions.map(t => ({
        'Transaction ID': t.transactionId || t._id.toString().slice(-6).toUpperCase(),
        'Book Title': t.bookId?.title || 'N/A',
        'Member Name': t.memberName || '-',
        'Member Type': t.memberType || 'Student',
        'Issue Date': t.issueDate ? new Date(t.issueDate).toLocaleDateString('en-IN') : '-',
        'Due Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : '-',
        'Status': t.status,
        'Fine (₹)': t.fineAmount > 0 ? `₹${t.fineAmount}` : '₹0'
      }));
    } else if (reportType === 'Overdue Books') {
      const overdueFilter = {
        collegeId,
        status: { $in: ['Overdue', 'Issued'] },
        dueDate: { $lt: new Date() }
      };
      if (search && search.trim()) {
        overdueFilter.memberName = { $regex: search.trim(), $options: 'i' };
      }

      const transactions = await LibraryTransaction.find(overdueFilter)
        .populate('bookId', 'title isbn')
        .sort({ dueDate: 1 });

      columns = ['Transaction ID', 'Book Title', 'ISBN', 'Member Name', 'Due Date', 'Days Overdue', 'Fine (₹)'];
      data = transactions.map(t => {
        const daysOverdue = Math.max(1, Math.floor((new Date() - new Date(t.dueDate)) / (1000 * 60 * 60 * 24)));
        return {
          'Transaction ID': t.transactionId || t._id.toString().slice(-6).toUpperCase(),
          'Book Title': t.bookId?.title || 'N/A',
          'ISBN': t.bookId?.isbn || '-',
          'Member Name': t.memberName || '-',
          'Due Date': new Date(t.dueDate).toLocaleDateString('en-IN'),
          'Days Overdue': `${daysOverdue} Days`,
          'Fine (₹)': `₹${daysOverdue * 10}`
        };
      });
    } else if (reportType === 'Book Catalog') {
      const bookFilter = { collegeId };
      if (category && category !== 'All') bookFilter.category = category;
      if (status && status !== 'All') bookFilter.status = status;
      if (search && search.trim()) {
        const s = search.trim();
        bookFilter.$or = [
          { title: { $regex: s, $options: 'i' } },
          { author: { $regex: s, $options: 'i' } },
          { isbn: { $regex: s, $options: 'i' } }
        ];
      }

      const books = await LibraryBook.find(bookFilter).sort({ title: 1 });
      columns = ['ISBN', 'Title', 'Author', 'Category', 'Shelf Location', 'Total Copies', 'Available Copies', 'Status'];
      data = books.map(b => ({
        'ISBN': b.isbn || '-',
        'Title': b.title,
        'Author': b.author || '-',
        'Category': b.category || '-',
        'Shelf Location': b.shelfLocation || '-',
        'Total Copies': b.totalCopies || b.copies || 1,
        'Available Copies': b.availableCopies ?? '-',
        'Status': b.status || 'Available'
      }));
    } else if (reportType === 'Lost & Damaged Books') {
      const ldFilter = { collegeId, ...buildDateFilter(startDate, endDate, 'createdAt') };
      if (status && status !== 'All') ldFilter.status = status;

      const records = await LibraryLostDamaged.find(ldFilter)
        .populate('bookId', 'title isbn')
        .sort({ createdAt: -1 });

      columns = ['Case No', 'Book Title', 'Reported By', 'Type', 'Cost (₹)', 'Penalty (₹)', 'Status', 'Date'];
      data = records.map(r => ({
        'Case No': r.caseNo || '-',
        'Book Title': r.bookTitle || r.bookId?.title || 'N/A',
        'Reported By': r.reportedBy || 'Library Admin',
        'Type': r.type || 'Lost',
        'Cost (₹)': `₹${r.cost || 0}`,
        'Penalty (₹)': `₹${r.penalty || 0}`,
        'Status': r.status || 'Pending',
        'Date': new Date(r.createdAt).toLocaleDateString('en-IN')
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
    const { reportType, startDate, endDate, status, block, type, search } = req.query;
    const collegeId = req.college._id;
    const dateFilter = buildDateFilter(startDate, endDate, 'createdAt');

    let data = [];
    let columns = [];

    if (reportType === 'Room Occupancy') {
      const roomFilter = { collegeId };
      if (block && block !== 'All') roomFilter.blockName = block;
      if (type && type !== 'All') roomFilter.type = type;
      if (status && status !== 'All') roomFilter.status = status;

      const rooms = await HostelRoom.find(roomFilter).sort({ roomNumber: 1 });
      columns = ['Room No', 'Block', 'Type', 'Capacity', 'Occupancy', 'Available Beds', 'Status'];
      data = rooms.map(r => {
        const cap = r.capacity || 1;
        const occ = r.occupancy || 0;
        return {
          'Room No': r.roomNumber || '-',
          'Block': r.blockName || '-',
          'Type': r.type || '-',
          'Capacity': cap,
          'Occupancy': occ,
          'Available Beds': Math.max(0, cap - occ),
          'Status': r.status || (occ >= cap ? 'Full' : 'Available')
        };
      });
    } else if (reportType === 'Student Allotments') {
      const allocFilter = { collegeId, ...dateFilter };
      if (status && status !== 'All') allocFilter.status = status;

      const allocations = await HostelAllocation.find(allocFilter)
        .populate('studentId', 'studentName studentId')
        .populate('roomId', 'roomNumber blockName')
        .sort({ allotmentDate: -1 });

      columns = ['Student ID', 'Student Name', 'Room No', 'Block', 'Allotment Date', 'Status'];
      data = allocations.map(a => ({
        'Student ID': a.studentId?.studentId || '-',
        'Student Name': a.studentId?.studentName || '-',
        'Room No': a.roomId?.roomNumber || '-',
        'Block': a.roomId?.blockName || '-',
        'Allotment Date': a.allotmentDate ? new Date(a.allotmentDate).toLocaleDateString('en-IN') : '-',
        'Status': a.status || 'Active'
      }));
    } else if (reportType === 'Leave & Outings') {
      const leaveFilter = { collegeId, ...buildDateFilter(startDate, endDate, 'fromDate') };
      if (status && status !== 'All') leaveFilter.status = status;
      if (type && type !== 'All') leaveFilter.type = type;

      const leaves = await HostelLeaveOuting.find(leaveFilter)
        .populate('studentId', 'studentName studentId')
        .sort({ fromDate: -1 });

      columns = ['Student Name', 'Type', 'Reason', 'Destination', 'From Date', 'To Date', 'Emergency Contact', 'Status'];
      data = leaves.map(l => ({
        'Student Name': l.studentId?.studentName || l.studentName || '-',
        'Type': l.type || 'Leave',
        'Reason': l.reason || '-',
        'Destination': l.destination || '-',
        'From Date': l.fromDate ? new Date(l.fromDate).toLocaleDateString('en-IN') : '-',
        'To Date': l.toDate ? new Date(l.toDate).toLocaleDateString('en-IN') : '-',
        'Emergency Contact': l.emergencyContact || '-',
        'Status': l.status || 'Pending'
      }));
    } else if (reportType === 'Hostel Incidents') {
      const incFilter = { collegeId, ...buildDateFilter(startDate, endDate, 'date') };
      if (status && status !== 'All') incFilter.status = status;

      const incidents = await HostelIncident.find(incFilter)
        .populate('studentId', 'studentName studentId')
        .sort({ date: -1 });

      columns = ['Incident Date', 'Student Name', 'Incident Type', 'Description', 'Action Taken', 'Status'];
      data = incidents.map(i => ({
        'Incident Date': i.date ? new Date(i.date).toLocaleDateString('en-IN') : '-',
        'Student Name': i.studentId?.studentName || '-',
        'Incident Type': i.incidentType || '-',
        'Description': i.description || '-',
        'Action Taken': i.actionTaken || '-',
        'Status': i.status || 'Open'
      }));
    } else if (reportType === 'Hostel Visitors') {
      const visFilter = { collegeId, ...buildDateFilter(startDate, endDate, 'inTime') };

      const visitors = await HostelVisitor.find(visFilter)
        .populate('studentId', 'studentName studentId')
        .sort({ inTime: -1 });

      columns = ['Visitor Name', 'Student Name', 'Relation', 'Contact', 'Visit Date', 'In Time', 'Out Time', 'Purpose'];
      data = visitors.map(v => ({
        'Visitor Name': v.visitorName,
        'Student Name': v.studentId?.studentName || '-',
        'Relation': v.relation || '-',
        'Contact': v.contactNumber || '-',
        'Visit Date': v.inTime ? new Date(v.inTime).toLocaleDateString('en-IN') : '-',
        'In Time': v.inTime ? new Date(v.inTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-',
        'Out Time': v.outTime ? new Date(v.outTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Still Inside',
        'Purpose': v.purpose || '-'
      }));
    }

    res.json({ columns, data });
  } catch (error) {
    res.status(500).json({ message: 'Error generating hostel report', error: error.message });
  }
};

// ============ SECURITY REPORTS (Retained for backward API compatibility) ============
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
