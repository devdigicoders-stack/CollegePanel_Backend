const Student = require('../models/Student');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const LiveNotification = require('../models/LiveNotification');

// Get profile
exports.getProfile = async (req, res) => {
  try {
    let student = await Student.findOne({ _id: req.student._id, collegeId: req.college._id })
      .select('-password');
      
    if (!student) {
      // Check if they are an applicant
      const Admission = require('../models/Admission');
      const applicant = await Admission.findOne({ _id: req.student._id, collegeId: req.college._id });
      if (applicant) {
        return res.status(200).json({
          _id: applicant._id,
          studentName: applicant.name,
          studentId: applicant.appNo,
          email: applicant.email,
          phone: applicant.mobile,
          gender: applicant.gender,
          dob: applicant.dob,
          course: applicant.course,
          branch: applicant.branch,
          year: applicant.year,
          session: applicant.session,
          status: 'Applicant (Pending Approval)'
        });
      }
      return res.status(404).json({ message: 'Student/Applicant not found' });
    }
    
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
    
    const Admission = require('../models/Admission');
    const isApplicant = await Admission.exists({ _id: studentId, collegeId });
    
    // Always calculate totalAssignments based on available info
    const yearStr = req.student.year ? req.student.year.replace(' Year', '') : '';
    const yearToSemesters = {
      '1st': ['1', '2', 'Sem 1', 'Sem 2'],
      '2nd': ['3', '4', 'Sem 3', 'Sem 4'],
      '3rd': ['5', '6', 'Sem 5', 'Sem 6'],
      '4th': ['7', '8', 'Sem 7', 'Sem 8']
    };
    const semesters = yearToSemesters[yearStr] || [];
    
    const baseQuery = {
      collegeId,
      semester: { $in: semesters },
      $or: []
    };
    
    if (req.student.course) {
      baseQuery.$or.push({ course: new RegExp(req.student.course, 'i') });
    }
    if (req.student.branch) {
      baseQuery.$or.push({ department: new RegExp(req.student.branch, 'i') });
      baseQuery.$or.push({ course: new RegExp(req.student.branch, 'i') }); // Fallback for older assignments
    }
    
    if (baseQuery.$or.length === 0) delete baseQuery.$or;
    
    const totalAssignments = await Assignment.countDocuments(baseQuery);
    
    const StudyMaterial = require('../models/StudyMaterial');
    const totalMaterials = await StudyMaterial.countDocuments(baseQuery);

    if (isApplicant) {
      return res.json({
        attendancePercentage: 0,
        totalClasses: 0,
        presentClasses: 0,
        pendingAssignments: totalAssignments,
        submittedAssignments: 0,
        totalAssignments,
        totalMaterials,
        attendance: 0,
        assignments: 0,
        studyMaterials: 0,
        hostelStatus: 'Not Allocated (Pending Admission)'
      });
    }


    // Pending Assignments
    const submissions = await AssignmentSubmission.find({ studentId, collegeId }).select('assignmentId');
    const submittedIds = submissions.map(s => s.assignmentId.toString());
    const pendingAssignments = queryOr.length > 0 ? await Assignment.countDocuments({
      collegeId,
      $or: queryOr,
      _id: { $nin: submittedIds }
    }) : 0;


    const attendancePercentage = 0;
    const total = 0;
    const present = 0;

    res.status(200).json({
      attendancePercentage,
      totalClasses: total,
      presentClasses: present,
      pendingAssignments,
      submittedAssignments: submittedIds.length,
      totalAssignments,
      totalMaterials
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: error.message });
  }
};


// Get assignments
exports.getAssignments = async (req, res) => {
  try {
    const yearStr = req.student.year ? req.student.year.replace(' Year', '') : '';
    const yearToSemesters = {
      '1st': ['1', '2', 'Sem 1', 'Sem 2'],
      '2nd': ['3', '4', 'Sem 3', 'Sem 4'],
      '3rd': ['5', '6', 'Sem 5', 'Sem 6'],
      '4th': ['7', '8', 'Sem 7', 'Sem 8']
    };
    const semesters = yearToSemesters[yearStr] || [];
    
    const baseQuery = {
      collegeId: req.college._id,
      semester: { $in: semesters },
      $or: []
    };
    
    if (req.student.course) {
      baseQuery.$or.push({ course: new RegExp(req.student.course, 'i') });
    }
    if (req.student.branch) {
      baseQuery.$or.push({ department: new RegExp(req.student.branch, 'i') });
      baseQuery.$or.push({ course: new RegExp(req.student.branch, 'i') }); // Fallback for older assignments
    }
    
    if (baseQuery.$or.length === 0) delete baseQuery.$or;

    // Only get assignments for student's course/branch/sem
    const assignments = await Assignment.find(baseQuery)
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
    
    await Assignment.findByIdAndUpdate(assignmentId, {
      $inc: { submittedCount: 1 }
    });
    
    // Create notification for teacher
    const studentInfo = await Student.findById(req.student._id).select('name appNo');
    const studentName = studentInfo ? studentInfo.name : 'A student';
    
    if (assignment.teacherId) {
      const teacherNotification = new LiveNotification({
        userId: assignment.teacherId.toString(),
        role: 'Teacher',
        title: 'Assignment Submitted',
        message: `${studentName} has submitted the assignment: ${assignment.title}`,
        type: 'Assignment',
        collegeId: req.college._id
      });
      
      await teacherNotification.save();
      
      const io = req.app.get('io');
      const connectedUsers = req.app.get('connectedUsers');
      
      if (io && connectedUsers) {
        const socketId = connectedUsers.get(assignment.teacherId.toString());
        if (socketId) {
          io.to(socketId).emit('new_notification', {
            title: 'Assignment Submitted',
            message: `${studentName} has submitted the assignment: ${assignment.title}`,
            type: 'Assignment'
          });
        }
      }
    }
    
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
    res.status(500).json({ message: 'Error submitting complaint', error: error.message });
  }
};

exports.getLiveNotifications = async (req, res) => {
  try {
    const studentId = req.student._id;
    const notifications = await LiveNotification.find({ 
      userId: studentId, 
      collegeId: req.college._id 
    }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const studentId = req.student._id;
    await LiveNotification.updateMany(
      { userId: studentId, collegeId: req.college._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
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
    const queryOr = [];
    if (req.student.course) queryOr.push({ course: { $regex: new RegExp(req.student.course, 'i') } });
    if (req.student.branch) queryOr.push({ course: { $regex: new RegExp(req.student.branch, 'i') } });

    if (queryOr.length === 0) {
      return res.status(200).json([]);
    }

    const materials = await StudyMaterial.find({ 
      $or: queryOr,
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
