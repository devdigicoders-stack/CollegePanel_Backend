const Student = require('../models/Student');
const Employee = require('../models/Employee');
const Section = require('../models/Section');
const Subject = require('../models/Subject');

const Complaint = require('../models/Complaint');
const LibraryBook = require('../models/LibraryBook');
const LibraryTransaction = require('../models/LibraryTransaction');
const HostelRoom = require('../models/HostelRoom');
const HostelAllocation = require('../models/HostelAllocation');
const SecurityLog = require('../models/SecurityLog');
const SecurityIncident = require('../models/SecurityIncident');
const Notice = require('../models/Notice');
const Assignment = require('../models/Assignment');
const Admission = require('../models/Admission');

exports.getOverview = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now); endOfDay.setHours(23, 59, 59, 999);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // ── Core Counts ──────────────────────────────────────────────────────────
    const [
      totalStudents,
      totalEmployees,
      totalClasses,
      totalSubjects,
      pendingComplaints,
      totalLibraryBooks,
      totalHostelRooms,
      activeHostelAllocations,
      totalAdmissions
    ] = await Promise.all([
      Student.countDocuments({ collegeId }),
      Employee.countDocuments({ collegeId }),
      Section.countDocuments({ collegeId }),
      Subject.countDocuments({ collegeId }),
      Complaint.countDocuments({ collegeId, status: { $in: ['Pending', 'In Progress'] } }),
      LibraryBook.countDocuments({ collegeId }),
      HostelRoom.countDocuments({ collegeId }),
      HostelAllocation.countDocuments({ collegeId, status: 'Active' }),
      Admission.countDocuments({ collegeId })
    ]);

    // Faculty vs Staff breakdown
    const facultyCount = await Employee.countDocuments({ collegeId, role: { $in: ['Teacher', 'HOD', 'Faculty'] } });



    const attendancePercent = 0;

    // ── Monthly Student Registrations (last 12 months) ────────────────────────
    const students = await Student.find({ collegeId }, 'createdAt enrollmentDate');
    const monthlyStudents = Array(12).fill(0);
    students.forEach(s => {
      const d = s.enrollmentDate || s.createdAt;
      if (d) monthlyStudents[new Date(d).getMonth()]++;
    });

    // ── Monthly Admissions ────────────────────────────────────────────────────
    const admissions = await Admission.find({ collegeId }, 'createdAt stage');
    const monthlyAdmissions = Array(12).fill(0);
    const admissionsByStage = {};
    admissions.forEach(a => {
      if (a.createdAt) monthlyAdmissions[new Date(a.createdAt).getMonth()]++;
      admissionsByStage[a.stage] = (admissionsByStage[a.stage] || 0) + 1;
    });

    // ── Course-wise Student Distribution ─────────────────────────────────────
    const studentsByCourse = {};
    students.forEach(s => {
      if (s.course) studentsByCourse[s.course] = (studentsByCourse[s.course] || 0) + 1;
    });
    const courseDistribution = Object.entries(studentsByCourse)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Employee Role Distribution ────────────────────────────────────────────
    const allEmployees = await Employee.find({ collegeId }, 'role department status');
    const employeeByDept = {};
    const employeeByStatus = { Active: 0, Inactive: 0, 'On Leave': 0 };
    allEmployees.forEach(e => {
      if (e.department) employeeByDept[e.department] = (employeeByDept[e.department] || 0) + 1;
      if (e.status) employeeByStatus[e.status] = (employeeByStatus[e.status] || 0) + 1;
    });
    const deptDistribution = Object.entries(employeeByDept)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // ── Library Stats ─────────────────────────────────────────────────────────
    const overdueBooks = await LibraryTransaction.countDocuments({
      collegeId,
      status: { $in: ['Overdue', 'Issued'] },
      dueDate: { $lt: now }
    });
    const issuedThisMonth = await LibraryTransaction.countDocuments({
      collegeId,
      issueDate: { $gte: startOfMonth }
    });
    const availableBooks = await LibraryBook.aggregate([
      { $match: { collegeId } },
      { $group: { _id: null, total: { $sum: '$availableCopies' } } }
    ]);
    const totalAvailableCopies = availableBooks[0]?.total || 0;

    // Library category distribution
    const libByCategory = await LibraryBook.aggregate([
      { $match: { collegeId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    // ── Hostel Stats ──────────────────────────────────────────────────────────
    const hostelRooms = await HostelRoom.find({ collegeId }, 'capacity occupancy status');
    const hostelCapacity = hostelRooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    const hostelOccupied = hostelRooms.reduce((sum, r) => sum + (r.occupancy || 0), 0);
    const hostelAvailable = hostelCapacity - hostelOccupied;

    // ── Security Stats ────────────────────────────────────────────────────────
    const securityToday = await SecurityLog.countDocuments({
      collegeId,
      createdAt: { $gte: today, $lte: endOfDay }
    });
    const openIncidents = await SecurityIncident.countDocuments({
      collegeId,
      status: { $in: ['Open', 'Under Investigation'] }
    });

    // ── Complaint Breakdown ───────────────────────────────────────────────────
    const allComplaints = await Complaint.find({ collegeId }, 'status category');
    const complaintByStatus = { Pending: 0, 'In Progress': 0, Resolved: 0, Rejected: 0 };
    const complaintByCategory = {};
    allComplaints.forEach(c => {
      if (c.status) complaintByStatus[c.status] = (complaintByStatus[c.status] || 0) + 1;
      if (c.category) complaintByCategory[c.category] = (complaintByCategory[c.category] || 0) + 1;
    });

    // ── Recent Notices ────────────────────────────────────────────────────────
    const recentNotices = await Notice.find({ collegeId, status: 'Published' })
      .sort({ dateOfPublishing: -1 })
      .limit(5)
      .select('title targetAudience postedBy dateOfPublishing');






    res.status(200).json({
      // Core Stats
      totalStudents,
      totalEmployees,
      facultyCount,
      totalClasses,
      totalSubjects,
      pendingComplaints,
      totalAdmissions,

      // Attendance removed
      attendance: {
        present: 0,
        absent: 0,
        percent: 0,
        facultyPercent: 0
      },

      // Monthly Trends
      monthlyStudents,
      monthlyAdmissions,

      // Distributions
      courseDistribution,
      deptDistribution,
      admissionsByStage,
      employeeByStatus,

      // Library
      library: {
        totalBooks: totalLibraryBooks,
        overdueBooks,
        issuedThisMonth,
        availableCopies: totalAvailableCopies,
        byCategory: libByCategory.map(c => ({ name: c._id || 'Other', count: c.count }))
      },

      // Hostel
      hostel: {
        totalRooms: totalHostelRooms,
        occupied: hostelOccupied,
        available: hostelAvailable,
        capacity: hostelCapacity,
        activeAllocations: activeHostelAllocations
      },

      // Security
      security: {
        todayLogs: securityToday,
        openIncidents
      },

      // Complaints
      complaints: {
        byStatus: complaintByStatus,
        byCategory: complaintByCategory
      },

      // Lists
      recentNotices
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
