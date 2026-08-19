const Student = require('../models/Student');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');

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




    res.status(200).json({
      attendancePercentage,
      totalClasses: total,
      presentClasses: present,
      pendingAssignments
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
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

const HostelAllocation = require('../models/HostelAllocation');
const HostelLeaveOuting = require('../models/HostelLeaveOuting');
const Gatepass = require('../models/Gatepass');

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
