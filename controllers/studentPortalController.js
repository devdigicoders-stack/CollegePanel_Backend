const Student = require('../models/Student');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const AttendanceRecord = require('../models/AttendanceRecord');
const Subject = require('../models/Subject');
const Timetable = require('../models/Timetable');
const Examination = require('../models/Examination');

// Get profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.student._id, collegeId: req.college._id })
      .select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.status(200).json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const updates = {
      phone: req.body.mobile,
      bloodGroup: req.body.bloodGroup,
      fatherName: req.body.fatherName,
      emergencyContact: req.body.emergencyNo,
      address: req.body.address,
    };
    const student = await Student.findOneAndUpdate(
      { _id: req.student._id, collegeId: req.college._id },
      { $set: updates },
      { returnDocument: 'after' }
    ).select('-password');
    res.status(200).json({ message: 'Profile updated', student });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const studentId = req.student._id;
    const collegeId = req.college._id;
    
    // Attendance %
    const attendanceRecords = await AttendanceRecord.find({ studentId, collegeId });
    let present = 0, total = 0;
    attendanceRecords.forEach(a => {
      total++;
      if (a.status === 'Present') present++;
    });
    const attendancePercentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    // Pending Assignments
    const submissions = await AssignmentSubmission.find({ studentId, collegeId }).select('assignmentId');
    const submittedIds = submissions.map(s => s.assignmentId.toString());
    const pendingAssignments = await Assignment.countDocuments({
      collegeId,
      $or: [
        { course: { $regex: new RegExp(req.student.course, 'i') } },
        { course: { $regex: new RegExp(req.student.branch, 'i') } }
      ],
      _id: { $nin: submittedIds },
      dueDate: { $gte: new Date() }
    });

    // Upcoming Exams
    const upcomingExams = await Examination.countDocuments({
      collegeId,
      $or: [
        { course: { $regex: new RegExp(req.student.course, 'i') } },
        { course: { $regex: new RegExp(req.student.branch, 'i') } }
      ],
      date: { $gte: new Date() }
    });

    // Fee Summary
    const StudentFee = require('../models/StudentFee');
    const feeDetails = await StudentFee.findOne({ studentId, collegeId });
    const totalFee = feeDetails ? (feeDetails.totalFee || 0) : 0;
    const paidAmount = feeDetails ? (feeDetails.paid || 0) : 0;
    const pendingFee = feeDetails ? (feeDetails.pending || 0) : 0;

    // Leave Summary
    const LeaveRequest = require('../models/LeaveRequest');
    const totalLeaves = await LeaveRequest.countDocuments({ studentId, collegeId });
    const approvedLeaves = await LeaveRequest.countDocuments({ studentId, collegeId, status: 'Approved' });

    // Scholarship status
    const Scholarship = require('../models/Scholarship');
    const scholarships = await Scholarship.find({ studentId, collegeId });
    const activeScholarship = scholarships.find(s => s.sanctionStatus === 'Sanctioned' || s.sanctionStatus === 'Approved');

    res.status(200).json({
      attendancePercentage,
      totalClasses: total,
      presentClasses: present,
      pendingAssignments,
      upcomingExams,
      pendingFee,
      paidAmount,
      totalFee,
      totalLeaves,
      approvedLeaves,
      hasScholarship: !!activeScholarship,
      scholarshipAmount: activeScholarship ? activeScholarship.amount : 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
};

// Get Subjects
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ 
      $or: [
        { courseName: { $regex: new RegExp(req.student.course, 'i') } },
        { courseName: { $regex: new RegExp(req.student.branch, 'i') } }
      ],
      collegeId: req.college._id 
    });
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error: error.message });
  }
};

// Get Timetable
exports.getTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.find({ 
      $or: [
        { course: { $regex: new RegExp(req.student.course, 'i') } },
        { course: { $regex: new RegExp(req.student.branch, 'i') } }
      ],
      collegeId: req.college._id 
    }).sort({ day: 1 });

    // Normalize timeSlot -> startTime / endTime for frontend
    const normalized = timetable.map(t => {
      const obj = t.toObject();
      // timeSlot format expected: "09:00 - 10:00" or "09:00"
      if (obj.timeSlot && !obj.startTime) {
        const parts = obj.timeSlot.split('-').map(s => s.trim());
        obj.startTime = parts[0] || obj.timeSlot;
        obj.endTime = parts[1] || '';
      }
      return obj;
    });
    res.status(200).json(normalized);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching timetable', error: error.message });
  }
};

// Get assignments
exports.getAssignments = async (req, res) => {
  try {
    // Only get assignments for student's course/branch
    const assignments = await Assignment.find({ 
      $or: [
        { course: { $regex: new RegExp(req.student.course, 'i') } },
        { course: { $regex: new RegExp(req.student.branch, 'i') } }
      ],
      collegeId: req.college._id 
    })
      .populate('teacherId', 'name')
      .sort({ dueDate: 1 });
      
    // Fetch submissions for this student
    const submissions = await AssignmentSubmission.find({ studentId: req.student._id, collegeId: req.college._id });
    
    // Combine them
    const result = assignments.map(a => {
      const sub = submissions.find(s => s.assignmentId.toString() === a._id.toString());
      return {
        ...a.toObject(),
        submissionStatus: sub ? sub.status : 'Pending',
        submissionDate: sub ? sub.createdAt : null,
        marksAwarded: sub ? sub.grade : null
      };
    });
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignments', error: error.message });
  }
};

// Submit assignment
exports.submitAssignment = async (req, res) => {
  try {
    const { assignmentId, remarks, fileUrl } = req.body;
    
    const assignment = await Assignment.findOne({ _id: assignmentId, collegeId: req.college._id });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    
    const existing = await AssignmentSubmission.findOne({ assignmentId, studentId: req.student._id });
    if (existing) return res.status(400).json({ message: 'Already submitted' });
    
    const isLate = new Date() > assignment.dueDate;
    
    const submission = new AssignmentSubmission({
      assignmentId,
      studentId: req.student._id,
      remarks,
      fileUrl,
      status: isLate ? 'Late' : 'Submitted',
      collegeId: req.college._id
    });
    
    await submission.save();
    
    // Increment the submittedCount in Assignment
    await Assignment.findByIdAndUpdate(assignmentId, {
      $inc: { submittedCount: 1 }
    });
    
    res.status(201).json({ message: 'Assignment submitted successfully', submission });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting assignment', error: error.message });
  }
};
const StudentFee = require('../models/StudentFee');
const FeePayment = require('../models/FeePayment');
const Scholarship = require('../models/Scholarship');
const ExamResult = require('../models/ExamResult');

// Get Exams
exports.getExams = async (req, res) => {
  try {
    const exams = await Examination.find({ 
      collegeId: req.college._id,
      $or: [
        { course: { $regex: new RegExp(req.student.course, 'i') } },
        { course: { $regex: new RegExp(req.student.branch, 'i') } }
      ]
    }).sort({ date: 1 });
    // In CRM course name might be mapped differently, fallback to basic logic
    // Actually just fetch all for college but filter by upcoming
    // Assuming student has courseId, we can match string course or use populate.
    res.status(200).json(exams);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching exams', error: error.message });
  }
};

// Get Results
exports.getResults = async (req, res) => {
  try {
    const results = await ExamResult.find({ 
      studentId: req.student._id, 
      collegeId: req.college._id 
    })
    .populate('examId')
    .sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching results', error: error.message });
  }
};

// Request Revaluation
exports.requestRevaluation = async (req, res) => {
  try {
    const result = await ExamResult.findOneAndUpdate(
      { _id: req.params.id, studentId: req.student._id, collegeId: req.college._id },
      { revaluationRequested: true },
      { new: true }
    );
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.status(200).json({ message: 'Revaluation requested successfully', result });
  } catch (error) {
    res.status(500).json({ message: 'Error requesting revaluation', error: error.message });
  }
};

// Get Fees
exports.getFees = async (req, res) => {
  try {
    const feeDetails = await StudentFee.findOne({ studentId: req.student._id, collegeId: req.college._id });
    const payments = await FeePayment.find({ studentId: req.student._id, collegeId: req.college._id }).sort({ date: -1 });
    res.status(200).json({ 
      feeDetails, 
      payments, 
      college: req.college,
      student: { name: req.student.studentName, rollNo: req.student.studentId } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching fees', error: error.message });
  }
};

// Simulate Fee Payment (For Demo Purposes)
exports.simulateFeePayment = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const feeDetails = await StudentFee.findOne({ studentId: req.student._id, collegeId: req.college._id });
    if (!feeDetails) return res.status(404).json({ message: 'Fee ledger not found' });

    // Create payment record
    const payment = await FeePayment.create({
      studentId: req.student._id,
      enrollNo: req.student.studentId, // fallback to enrollNo or studentId
      studentName: req.student.studentName,
      amount: amount,
      date: new Date(),
      mode: 'Online',
      receiptNo: `RCPT/${Date.now().toString().slice(-6)}`,
      status: 'Completed',
      collegeId: req.college._id
    });

    // Update StudentFee
    feeDetails.paid = (feeDetails.paid || 0) + amount;
    feeDetails.pending = Math.max(0, feeDetails.totalFee - feeDetails.paid);
    
    if (feeDetails.pending === 0) {
      feeDetails.status = 'Paid';
    } else if (feeDetails.paid > 0) {
      feeDetails.status = 'Partial';
    }
    await feeDetails.save();

    res.status(200).json({ message: 'Payment successful', payment, feeDetails });
  } catch (error) {
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

// Get Scholarships
exports.getScholarships = async (req, res) => {
  try {
    const ScholarshipApplication = require('../models/ScholarshipApplication');
    const applications = await ScholarshipApplication.find({ studentId: req.student._id, collegeId: req.college._id })
      .populate('schemeId');
    
    // Map to frontend structure expected by Scholarships.jsx
    const formatted = applications.map(app => ({
      _id: app._id,
      scheme: app.schemeId ? app.schemeId.name : 'Unknown Scheme',
      amount: app.schemeId ? app.schemeId.amount : 0,
      sanctionStatus: ['Approved', 'Disbursed', 'Verified'].includes(app.status) ? 'Sanctioned' : 
                      (app.status === 'Rejected' ? 'Rejected' : 'Pending'),
      received: app.amountDisbursed || 0,
      pending: (app.schemeId ? app.schemeId.amount : 0) - (app.amountDisbursed || 0)
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scholarships', error: error.message });
  }
};

// Apply for Scholarship
exports.applyScholarship = async (req, res) => {
  try {
    const { scheme } = req.body;
    
    const ScholarshipScheme = require('../models/ScholarshipScheme');
    let schemeObj = await ScholarshipScheme.findOne({ name: scheme, collegeId: req.college._id });
    if (!schemeObj) {
      schemeObj = new ScholarshipScheme({
        name: scheme,
        type: 'State',
        amount: 50000,
        status: 'Active',
        collegeId: req.college._id
      });
      await schemeObj.save();
    }

    const ScholarshipApplication = require('../models/ScholarshipApplication');
    const application = new ScholarshipApplication({
      schemeId: schemeObj._id,
      studentId: req.student._id,
      status: 'Submitted',
      collegeId: req.college._id
    });
    await application.save();

    res.status(201).json({ message: 'Scholarship applied', scholarship: application });
  } catch (error) {
    res.status(500).json({ message: 'Error applying scholarship', error: error.message });
  }
};
// Get attendance
exports.getAttendance = async (req, res) => {
  try {
    const attendance = await AttendanceRecord.find({ studentId: req.student._id, collegeId: req.college._id })
      .populate('sessionId')
      .sort({ createdAt: -1 });
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

const LibraryTransaction = require('../models/LibraryTransaction');
const HostelAllocation = require('../models/HostelAllocation');
const HostelLeaveOuting = require('../models/HostelLeaveOuting');
const Gatepass = require('../models/Gatepass');

// Get Library Details
exports.getLibraryDetails = async (req, res) => {
  try {
    const transactions = await LibraryTransaction.find({ studentId: req.student._id, collegeId: req.college._id })
      .populate('bookId')
      .sort({ issueDate: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching library details', error: error.message });
  }
};

// Get Hostel Details
exports.getHostelDetails = async (req, res) => {
  try {
    const allocation = await HostelAllocation.findOne({ studentId: req.student._id, status: 'Active', collegeId: req.college._id }).populate('roomId');
    const leaves = await HostelLeaveOuting.find({ studentId: req.student._id, collegeId: req.college._id }).sort({ fromDate: -1 });
    // Handle both cases for studentId in gatepass, based on standard schema: it's studentId usually, but let's check Gatepass model if needed. 
    // Usually it's studentId: ObjectId in my recent gatepass implementations.
    const gatepasses = await Gatepass.find({ 
      studentId: req.student._id, 
      collegeId: req.college._id 
    }).sort({ createdAt: -1 });
    
    res.status(200).json({ allocation, leaves, gatepasses });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching hostel details', error: error.message });
  }
};

// Apply for Hostel Leave/Outing
exports.applyHostelLeave = async (req, res) => {
  try {
    const { duration, reason, fromDate, toDate } = req.body;
    const leave = new HostelLeaveOuting({
      studentId: req.student._id,
      type: duration === 'Outing' ? 'Outing' : 'Leave',
      fromDate,
      toDate,
      reason,
      status: 'Pending',
      collegeId: req.college._id
    });
    await leave.save();
    res.status(201).json({ message: 'Hostel leave applied successfully', leave });
  } catch (error) {
    res.status(500).json({ message: 'Error applying hostel leave', error: error.message });
  }
};
const Complaint = require('../models/Complaint');
// Get Complaints
exports.getComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ submittedById: req.student._id, collegeId: req.college._id }).sort({ createdAt: -1 });
    res.status(200).json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
};

// Create Complaint
exports.createComplaint = async (req, res) => {
  try {
    const { category, description } = req.body;
    const complaint = new Complaint({
      complaintId: `CMP-${Date.now()}`,
      subject: category,
      category,
      submittedBy: req.student.studentName || req.student.name || 'Unknown Student',
      submittedById: req.student._id,
      description,
      collegeId: req.college._id
    });
    await complaint.save();
    res.status(201).json({ message: 'Complaint created successfully', complaint });
  } catch (error) {
    res.status(500).json({ message: 'Error creating complaint', error: error.message });
  }
};

// Get Leave Requests (Academic)
exports.getLeaveRequests = async (req, res) => {
  try {
    const LeaveRequest = require('../models/LeaveRequest');
    const leaves = await LeaveRequest.find({ studentId: req.student._id, collegeId: req.college._id }).sort({ fromDate: -1 });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaves', error: error.message });
  }
};

// Create Leave Request
exports.createLeaveRequest = async (req, res) => {
  try {
    const { reason, duration, fromDate, toDate } = req.body;
    const type = duration === 'Outing' ? 'Outing' : 'Leave';
    
    // Parse dates from request, fallback to mock dates if not provided (for older clients)
    const finalFromDate = fromDate ? new Date(fromDate) : new Date();
    const finalToDate = toDate 
      ? new Date(toDate)
      : (type === 'Outing' 
          ? new Date(Date.now() + 4 * 60 * 60 * 1000) 
          : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    
    const days = Math.ceil((finalToDate - finalFromDate) / (1000 * 60 * 60 * 24)) || 1;

    const LeaveRequest = require('../models/LeaveRequest');
    const requestId = 'LREQ-' + Math.floor(Math.random() * 1000000);

    const leave = new LeaveRequest({
      requestId,
      studentId: req.student._id,
      applicantName: req.student.studentName || req.student.name || 'Student',
      applicantType: 'Student',
      department: req.student.branch || req.student.course || 'General',
      leaveType: 'Medical Leave',
      fromDate: finalFromDate,
      toDate: finalToDate,
      days: days,
      reason,
      status: 'Pending',
      collegeId: req.college._id
    });
    await leave.save();
    res.status(201).json({ message: 'Leave request submitted', leave });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting leave', error: error.message });
  }
};

const JobOpportunity = require('../models/JobOpportunity');
const PlacementApplication = require('../models/PlacementApplication');

// Placements
exports.getPlacements = async (req, res) => {
  try {
    const jobs = await JobOpportunity.find({ 
      collegeId: req.college._id,
      status: 'Open'
    }).populate('companyId');
    
    // Also fetch student's applications
    const applications = await PlacementApplication.find({ studentId: req.student._id });
    const appliedJobIds = {};
    applications.forEach(app => {
      appliedJobIds[app.jobId.toString()] = app.status;
    });

    const formattedJobs = jobs.map(job => ({
      _id: job._id,
      title: job.title,
      company: job.companyId ? job.companyId.name : 'Unknown Company',
      reward: job.salaryPkg || 'Not Disclosed',
      eligibility: `Min CGPA: ${job.minCgpa || 'N/A'} | Courses: ${job.eligibleCourses && job.eligibleCourses.length > 0 ? job.eligibleCourses.join(', ') : 'All'}`,
      deadline: job.deadline,
      status: appliedJobIds[job._id.toString()] || 'Apply'
    }));
    
    res.status(200).json(formattedJobs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching placements', error: error.message });
  }
};

// Apply Placement
exports.applyPlacement = async (req, res) => {
  try {
    const { jobId } = req.body;
    
    // Check if already applied
    const existing = await PlacementApplication.findOne({ jobId, studentId: req.student._id });
    if (existing) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    const application = new PlacementApplication({
      jobId,
      studentId: req.student._id,
      status: 'Applied',
      collegeId: req.college._id
    });
    
    await application.save();
    res.status(201).json({ message: 'Applied successfully', application });
  } catch (error) {
    res.status(500).json({ message: 'Error applying to placement', error: error.message });
  }
};

const StudyMaterial = require('../models/StudyMaterial');
// Get Study Materials
exports.getStudyMaterials = async (req, res) => {
  try {
    const materials = await StudyMaterial.find({ 
      $or: [
        { course: { $regex: new RegExp(req.student.course, 'i') } },
        { course: { $regex: new RegExp(req.student.branch, 'i') } }
      ],
      collegeId: req.college._id 
    }).sort({ createdAt: -1 });
    res.status(200).json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching materials', error: error.message });
  }
};

const DownloadDocument = require('../models/DownloadDocument');

// Downloads
exports.getDownloads = async (req, res) => {
  try {
    const docs = await DownloadDocument.find({ studentId: req.student._id, collegeId: req.college._id }).sort({ createdAt: -1 });
    res.status(200).json(docs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching downloads', error: error.message });
  }
};
