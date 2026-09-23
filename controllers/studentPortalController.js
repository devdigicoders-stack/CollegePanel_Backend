const Student = require('../models/Student');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const LiveNotification = require('../models/LiveNotification');
const SubjectAllocation = require('../models/SubjectAllocation');
const StudentAttendance = require('../models/StudentAttendance');

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
      phone: req.body.mobile || req.body.phone,
      bloodGroup: req.body.bloodGroup,
      fatherName: req.body.fatherName,
      emergencyContact: req.body.emergencyNo || req.body.emergencyContact,
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

// Helper to build student assignment filter
const buildStudentAssignmentQuery = (student, collegeId) => {
  const query = { collegeId, $and: [] };

  // 1. Semester matching
  let allowedSemesters = [];
  if (student.semester) {
    const sClean = student.semester.toString().replace(/[^0-9]/g, '');
    allowedSemesters = [student.semester, `Sem ${sClean}`, sClean];
  } else if (student.year) {
    const yearStr = student.year.replace(' Year', '');
    const yearToSemesters = {
      '1st': ['1', '2', 'Sem 1', 'Sem 2'],
      '2nd': ['3', '4', 'Sem 3', 'Sem 4'],
      '3rd': ['5', '6', 'Sem 5', 'Sem 6'],
      '4th': ['7', '8', 'Sem 7', 'Sem 8']
    };
    allowedSemesters = yearToSemesters[yearStr] || [];
  }

  if (allowedSemesters.length > 0) {
    query.$and.push({ semester: { $in: allowedSemesters } });
  }

  // 2. Branch matching
  const branchOr = [];
  if (student.branch) {
    branchOr.push({ branch: new RegExp(student.branch, 'i') });
    branchOr.push({ course: new RegExp(student.branch, 'i') });
    branchOr.push({ department: new RegExp(student.branch, 'i') });
  }
  if (student.course && student.course !== student.branch) {
    branchOr.push({ course: new RegExp(student.course, 'i') });
    branchOr.push({ branch: new RegExp(student.course, 'i') });
  }
  if (branchOr.length > 0) {
    query.$and.push({ $or: branchOr });
  }

  // 3. Section matching (only assignments matching student's section or generic 'All')
  const studentSec = student.section || 'A';
  query.$and.push({
    $or: [
      { section: studentSec },
      { section: 'All' },
      { section: '' },
      { section: { $exists: false } }
    ]
  });

  if (query.$and.length === 0) delete query.$and;
  return query;
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const studentId = req.student._id;
    const collegeId = req.college._id;
    
    const Admission = require('../models/Admission');
    const isApplicant = await Admission.exists({ _id: studentId, collegeId });
    
    const baseQuery = buildStudentAssignmentQuery(req.student, collegeId);
    const totalAssignments = await Assignment.countDocuments(baseQuery);
    
    const StudyMaterial = require('../models/StudyMaterial');
    const materialQueryOr = [];
    if (req.student.course) materialQueryOr.push({ course: new RegExp(req.student.course, 'i') });
    if (req.student.branch) {
      materialQueryOr.push({ course: new RegExp(req.student.branch, 'i') });
      materialQueryOr.push({ branch: new RegExp(req.student.branch, 'i') });
    }
    
    const totalMaterials = materialQueryOr.length > 0 ? await StudyMaterial.countDocuments({
      collegeId,
      $or: materialQueryOr
    }) : 0;

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
    const pendingAssignments = await Assignment.countDocuments({
      ...baseQuery,
      _id: { $nin: submittedIds }
    });

    // Calculate real attendance stats from StudentAttendance
    const studentAttendances = await StudentAttendance.find({
      collegeId,
      'records.studentId': studentId
    }).select('records');

    let total = 0;
    let present = 0;

    studentAttendances.forEach(att => {
      const rec = att.records.find(r => r.studentId && r.studentId.toString() === studentId.toString());
      if (rec) {
        total++;
        if (rec.status === 'Present') {
          present++;
        }
      }
    });

    const attendancePercentage = total > 0 ? Math.round((present / total) * 100) : 0;

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
    const collegeId = req.college._id;
    const baseQuery = buildStudentAssignmentQuery(req.student, collegeId);

    // Only get assignments for student's course/branch/sem/section
    const assignments = await Assignment.find(baseQuery)
      .populate('teacherId', 'name')
      .sort({ dueDate: 1 });
      
    // Fetch submissions for this student
    const submissions = await AssignmentSubmission.find({ studentId: req.student._id, collegeId });
    
    // Combine them
    const result = assignments.map(a => {
      const sub = submissions.find(s => s.assignmentId.toString() === a._id.toString());
      return {
        ...a.toObject(),
        fileUrl: a.fileUrl || '',
        fileName: a.fileName || '',
        submissionStatus: sub ? sub.status : 'Pending',
        submissionDate: sub ? (sub.submissionDate || sub.createdAt) : null,
        submittedFileUrl: sub ? sub.fileUrl : null,
        studentRemarks: sub ? sub.remarks : null,
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
    const studentId = req.student._id;
    const collegeId = req.college._id;

    const attendances = await StudentAttendance.find({
      collegeId,
      'records.studentId': studentId
    })
      .populate({
        path: 'classId',
        select: 'subject courseName semester section teacher'
      })
      .populate({
        path: 'teacherId',
        select: 'name'
      })
      .sort({ date: -1 });

    const formatted = attendances.map(att => {
      const rec = att.records.find(r => r.studentId && r.studentId.toString() === studentId.toString());
      return {
        _id: att._id,
        date: att.date,
        subject: att.classId?.subject || 'Class',
        course: att.classId?.courseName || '',
        semester: att.classId?.semester || '',
        section: att.classId?.section || '',
        teacherName: att.teacherId?.name || '',
        status: rec ? rec.status : 'Absent',
        remarks: rec ? rec.remarks : ''
      };
    });

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

const HostelAllocation = require('../models/HostelAllocation');
const HostelRoom = require('../models/HostelRoom');
const HostelLeaveOuting = require('../models/HostelLeaveOuting');
const Gatepass = require('../models/Gatepass');

// Get Hostel Details
exports.getHostelDetails = async (req, res) => {
  try {
    const allocation = await HostelAllocation.findOne({ 
      studentId: req.student._id, 
      status: 'Active', 
      collegeId: req.college._id 
    }).populate({
      path: 'roomId',
      model: 'HostelRoom'
    });

    const leaves = await HostelLeaveOuting.find({ 
      studentId: req.student._id, 
      collegeId: req.college._id 
    }).sort({ createdAt: -1 });

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
    const { duration, type, reason, purpose, fromDate, toDate, destination, emergencyContact } = req.body;
    
    const finalType = (type || duration) === 'Outing' ? 'Outing' : 'Leave';
    const finalReason = reason || purpose;

    if (!finalReason || !finalReason.trim()) {
      return res.status(400).json({ message: 'Detailed reason or purpose is required' });
    }
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'From and To dates/times are required' });
    }
    if (new Date(toDate) < new Date(fromDate)) {
      return res.status(400).json({ message: 'Return date/time must be after departure date/time' });
    }

    const leave = new HostelLeaveOuting({
      studentId: req.student._id,
      type: finalType,
      fromDate: new Date(fromDate),
      toDate: new Date(toDate),
      reason: finalReason.trim(),
      destination: destination ? destination.trim() : '',
      emergencyContact: emergencyContact ? emergencyContact.trim() : '',
      status: 'Pending',
      collegeId: req.college._id
    });
    await leave.save();

    // Create a confirmation notification for the student
    try {
      const LiveNotification = require('../models/LiveNotification');
      await LiveNotification.create({
        userId: req.student._id,
        title: `Hostel ${finalType} Request Submitted`,
        message: `Your request for ${finalType} (${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}) has been submitted to the Hostel Warden for approval.`,
        type: 'info',
        collegeId: req.college._id
      });
    } catch (notifErr) {
      console.warn('Could not create student notification:', notifErr.message);
    }

    res.status(201).json({ 
      message: `${finalType} request submitted to Hostel Warden successfully`, 
      leave 
    });
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
    const { id } = req.body || {};
    if (id) {
      await LiveNotification.updateOne(
        { _id: id, collegeId: req.college._id },
        { $set: { isRead: true } }
      );
    } else {
      await LiveNotification.updateMany(
        { userId: studentId, collegeId: req.college._id, isRead: false },
        { $set: { isRead: true } }
      );
    }
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
    if (req.student.course) {
      queryOr.push({ course: { $regex: new RegExp(req.student.course, 'i') } });
      queryOr.push({ branch: { $regex: new RegExp(req.student.course, 'i') } });
    }
    if (req.student.branch) {
      queryOr.push({ course: { $regex: new RegExp(req.student.branch, 'i') } });
      queryOr.push({ branch: { $regex: new RegExp(req.student.branch, 'i') } });
    }

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

// Haversine formula to calculate distance (in meters) between two coords
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Get class info & student's today attendance status before marking
exports.getClassAttendanceInfo = async (req, res) => {
  try {
    const { classId } = req.params;
    const student = req.student;
    const collegeId = req.college._id;

    if (!classId) {
      return res.status(400).json({ message: 'Missing classId' });
    }

    let allocation = await SubjectAllocation.findById(classId)
      .populate('teacher', 'name email')
      .populate('subject', 'subjectName subjectCode');

    if (!allocation) {
      const Subject = require('../models/Subject');
      const Teacher = require('../models/Teacher');
      const subjectDoc = await Subject.findById(classId);
      if (subjectDoc) {
        const teacher = await Teacher.findOne({ collegeId });
        allocation = {
          _id: subjectDoc._id,
          subjectName: subjectDoc.name,
          subjectCode: subjectDoc.code,
          teacherName: teacher ? teacher.name : 'Faculty In-charge',
          courseName: subjectDoc.courseName,
          department: subjectDoc.department,
          semester: subjectDoc.semester,
          geoFence: { isEnabled: false, radius: 50 }
        };
      }
    }

    if (!allocation) {
      return res.status(404).json({ message: 'Class session not found. Invalid QR code.' });
    }

    // Check today's attendance for this student
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayAttendance = await StudentAttendance.findOne({
      classId,
      collegeId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const studentIdStr = student?._id ? student._id.toString() : '';
    const record = todayAttendance?.records?.find(r => r.studentId && r.studentId.toString() === studentIdStr);

    res.status(200).json({
      classDetails: {
        classId: allocation._id,
        subjectName: allocation.subjectName || allocation.subject?.subjectName || 'Subject',
        subjectCode: allocation.subjectCode || allocation.subject?.subjectCode || 'N/A',
        teacherName: allocation.teacherName || allocation.teacher?.name || 'Faculty',
        courseName: allocation.courseName,
        department: allocation.department,
        semester: allocation.semester,
        geoFence: allocation.geoFence || { isEnabled: false, radius: 50 }
      },
      studentDetails: {
        studentName: student?.studentName || student?.name,
        studentId: student?.studentId || student?.appNo,
        branch: student?.branch,
        semester: student?.semester,
        year: student?.year,
        section: student?.section || 'A'
      },
      alreadyMarked: record ? record.status === 'Present' : false,
      attendanceStatus: record ? record.status : 'Not Marked',
      markedAt: record ? (todayAttendance.updatedAt || todayAttendance.date) : null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking class attendance info', error: error.message });
  }
};

// Auto mark attendance from QR Scan
exports.markAutoAttendance = async (req, res) => {
  try {
    let { classId, date, studentLat, studentLng } = req.body;
    const studentId = req.student._id;

    if (!classId) {
      return res.status(400).json({ message: 'Missing classId' });
    }

    // If date is not provided, use today's date (server date)
    if (!date) {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localDate = new Date(today.getTime() - (offset * 60 * 1000));
      date = localDate.toISOString().split('T')[0];
    }

    // Verify the class allocation
    let allocation = await SubjectAllocation.findById(classId);
    if (!allocation) {
      const Subject = require('../models/Subject');
      const Teacher = require('../models/Teacher');
      const Course = require('../models/Course');
      const subjectDoc = await Subject.findById(classId);
      if (subjectDoc) {
        let defaultTeacher = await Teacher.findOne({ collegeId: req.college._id });
        if (!defaultTeacher) {
          defaultTeacher = await Teacher.findOne({});
        }
        let courseDoc = await Course.findOne({ 
          collegeId: req.college._id,
          $or: [
            { name: new RegExp(subjectDoc.courseName || req.student?.branch || '', 'i') },
            { department: new RegExp(subjectDoc.department || req.student?.course || '', 'i') }
          ]
        }) || await Course.findOne({ collegeId: req.college._id });

        if (defaultTeacher && courseDoc) {
          allocation = await SubjectAllocation.create({
            teacher: defaultTeacher._id,
            teacherName: defaultTeacher.name,
            course: courseDoc._id,
            courseName: subjectDoc.courseName || courseDoc.name || req.student?.branch || 'General',
            department: subjectDoc.department || courseDoc.department || 'Diploma',
            semester: subjectDoc.semester || 1,
            subject: subjectDoc._id,
            subjectName: subjectDoc.name,
            subjectCode: subjectDoc.code,
            status: 'Active',
            collegeId: req.college._id
          });
          classId = allocation._id;
        }
      }
    }

    if (!allocation) {
      return res.status(404).json({ message: 'Class not found. Invalid QR Code.' });
    }

    // ── GEO-FENCE CHECK ──────────────────────────────────────────────
    if (allocation.geoFence && allocation.geoFence.isEnabled) {
      const { lat: classLat, lng: classLng, radius } = allocation.geoFence;

      if (!classLat || !classLng) {
        return res.status(400).json({ message: 'Geo-fence is enabled but class location is not configured. Contact your teacher.' });
      }

      if (studentLat === undefined || studentLat === null || studentLng === undefined || studentLng === null) {
        return res.status(403).json({ 
          message: 'Location access is required to mark attendance. Please allow location permission and scan again.',
          code: 'LOCATION_REQUIRED'
        });
      }

      const distance = haversineDistance(classLat, classLng, parseFloat(studentLat), parseFloat(studentLng));
      const effectiveRadius = radius || 50;

      if (distance > effectiveRadius) {
        return res.status(403).json({ 
          message: `You are ${Math.round(distance)} meters away from the classroom. You must be within ${effectiveRadius} meters to mark attendance.`,
          code: 'OUT_OF_BOUNDS',
          distance: Math.round(distance),
          allowedRadius: effectiveRadius
        });
      }
    }
    // ────────────────────────────────────────────────────────────────

    // Validate if student belongs to this class
    const s = Number(allocation.semester);
    let targetYear = '';
    if (s === 1 || s === 2) targetYear = '1st Year';
    else if (s === 3 || s === 4) targetYear = '2nd Year';
    else if (s === 5 || s === 6) targetYear = '3rd Year';
    else if (s === 7 || s === 8) targetYear = '4th Year';

    let isYearMatch = false;
    if (req.student.semester) {
      const sNum = parseInt(req.student.semester.toString().replace(/[^0-9]/g, ''), 10);
      if (sNum === s) isYearMatch = true;
    }
    if (!isYearMatch && req.student.year) {
      isYearMatch = req.student.year === targetYear || req.student.year.includes(targetYear.split(' ')[0]);
    }
    if (!req.student.year && !req.student.semester) {
      isYearMatch = true;
    }

    const allocCourse = (allocation.courseName || allocation.department || '').toLowerCase();
    const studentBranch = (req.student.branch || req.student.course || '').toLowerCase();
    const isBranchMatch = !studentBranch || !allocCourse || 
      allocCourse.includes(studentBranch) || 
      studentBranch.includes(allocCourse);

    if (!isBranchMatch || !isYearMatch) {
      return res.status(403).json({ message: 'You are not enrolled in this class.' });
    }

    // Find or create StudentAttendance record for today
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let attendance = await StudentAttendance.findOne({
      classId,
      collegeId: req.college._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!attendance) {
      attendance = new StudentAttendance({
        classId,
        teacherId: allocation.teacher,
        date: startOfDay,
        records: [],
        collegeId: req.college._id
      });
    }

    // Check if student already in records
    const existingRecordIndex = attendance.records.findIndex(r => r.studentId.toString() === studentId.toString());
    
    if (existingRecordIndex >= 0) {
      if (attendance.records[existingRecordIndex].status === 'Present') {
        return res.status(200).json({ message: 'Attendance already marked as Present.', status: 'already_marked' });
      }
      attendance.records[existingRecordIndex].status = 'Present';
    } else {
      attendance.records.push({
        studentId,
        status: 'Present',
        remarks: 'Auto-marked via QR'
      });
    }

    await attendance.save();

    // Emit real-time event to the teacher (if online)
    const io = req.app.get('io');
    if (io) {
      io.emit('attendance_marked', { classId, studentId: studentId.toString(), date, status: 'Present' });
    }

    res.status(200).json({ message: 'Attendance marked successfully!', status: 'success' });
  } catch (error) {
    res.status(500).json({ message: 'Error processing attendance scan', error: error.message });
  }
};

// Get Today's Classes & QR Attendance for Student
exports.getTodayClassesWithAttendance = async (req, res) => {
  try {
    const student = req.student;
    const collegeId = req.college._id;

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Determine student's target semesters and branch
    let allowedSemesters = [];
    if (student.semester) {
      const sClean = parseInt(student.semester.toString().replace(/[^0-9]/g, ''), 10);
      if (!isNaN(sClean)) allowedSemesters.push(sClean);
    }
    
    if (allowedSemesters.length === 0 && student.year) {
      const yearStr = student.year.replace(' Year', '');
      const yearToSemesters = {
        '1st': [1, 2],
        '2nd': [3, 4],
        '3rd': [5, 6],
        '4th': [7, 8]
      };
      allowedSemesters = yearToSemesters[yearStr] || [1];
    }
    if (allowedSemesters.length === 0) {
      allowedSemesters = [1, 2, 3, 4, 5, 6, 7, 8];
    }

    // Find active SubjectAllocations for student's college, semester, and branch/course
    const branchOr = [];
    if (student.branch) {
      branchOr.push({ courseName: new RegExp(student.branch, 'i') });
      branchOr.push({ department: new RegExp(student.branch, 'i') });
    }
    if (student.course) {
      branchOr.push({ courseName: new RegExp(student.course, 'i') });
      branchOr.push({ department: new RegExp(student.course, 'i') });
    }

    const allocQuery = {
      collegeId,
      status: 'Active',
      semester: { $in: allowedSemesters }
    };
    if (branchOr.length > 0) {
      allocQuery.$or = branchOr;
    }

    let allocations = await SubjectAllocation.find(allocQuery)
      .populate('teacher', 'name email')
      .populate('subject', 'subjectName subjectCode')
      .sort({ semester: 1, subjectName: 1 });

    // Auto-resilience check: check if any Subject exists for this branch/course/semester without allocation
    try {
      const Subject = require('../models/Subject');
      const Teacher = require('../models/Teacher');

      const subjectQuery = {
        collegeId,
        status: 'Active',
        semester: { $in: allowedSemesters }
      };
      if (branchOr.length > 0) {
        subjectQuery.$or = branchOr;
      }

      const unallocatedSubjects = await Subject.find(subjectQuery);
      let defaultTeacher = null;
      if (unallocatedSubjects.length > 0) {
        defaultTeacher = await Teacher.findOne({ collegeId }) || await Teacher.findOne({});
      }

      for (const sub of unallocatedSubjects) {
        const isAlreadyAllocated = allocations.some(a => 
          (a.subject && a.subject._id && a.subject._id.toString() === sub._id.toString()) ||
          (a.subject && a.subject.toString() === sub._id.toString()) ||
          (a.subjectCode && sub.code && a.subjectCode.toLowerCase() === sub.code.toLowerCase()) ||
          (a.subjectName && sub.name && a.subjectName.toLowerCase() === sub.name.toLowerCase())
        );

        if (!isAlreadyAllocated && defaultTeacher) {
          try {
            const Course = require('../models/Course');
            let courseDoc = await Course.findOne({ 
              collegeId,
              $or: [
                { name: new RegExp(sub.courseName || student.branch || '', 'i') },
                { department: new RegExp(sub.department || student.course || '', 'i') }
              ]
            }) || await Course.findOne({ collegeId });

            if (courseDoc) {
              const autoAlloc = await SubjectAllocation.create({
                teacher: defaultTeacher._id,
                teacherName: defaultTeacher.name,
                course: courseDoc._id,
                courseName: sub.courseName || courseDoc.name || student.branch || student.course || 'General',
                department: sub.department || courseDoc.department || student.course || student.branch || 'Diploma',
                semester: sub.semester || 1,
                subject: sub._id,
                subjectName: sub.name,
                subjectCode: sub.code,
                status: 'Active',
                collegeId
              });
              allocations.push(autoAlloc);
            }
          } catch (err) {
            console.error('Error auto-creating allocation:', err.message);
          }
        }
      }
    } catch (allocErr) {
      console.error('Error checking unallocated subjects:', allocErr.message);
    }

    // Check today's attendance for this student across these classes
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const classIds = allocations.map(a => a._id);
    const todayAttendances = await StudentAttendance.find({
      classId: { $in: classIds },
      collegeId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const studentIdStr = student._id.toString();

    // Use live deployed domain for QR scan so mobile devices scanning the QR open the live application
    const liveFrontend = process.env.FRONTEND_URL || 'https://admin.digicampuspro.com';

    const classesWithAttendance = allocations.map(alloc => {
      const attRecord = todayAttendances.find(att => att.classId.toString() === alloc._id.toString());
      const rec = attRecord?.records?.find(r => r.studentId && r.studentId.toString() === studentIdStr);

      const status = rec ? rec.status : 'Not Marked';
      const scanUrl = `${liveFrontend}/student-portal/attendance/scan?classId=${alloc._id}`;

      return {
        _id: alloc._id,
        classId: alloc._id,
        subjectName: alloc.subjectName || alloc.subject?.subjectName || 'Subject',
        subjectCode: alloc.subjectCode || alloc.subject?.subjectCode || 'N/A',
        teacherName: alloc.teacherName || alloc.teacher?.name || 'Faculty',
        courseName: alloc.courseName,
        department: alloc.department,
        semester: alloc.semester,
        section: student.section || 'A',
        branch: student.branch || alloc.courseName,
        year: student.year || '1st Year',
        geoFence: alloc.geoFence || { isEnabled: false, radius: 50 },
        attendanceStatus: status,
        markedAt: rec ? (attRecord.updatedAt || attRecord.date) : null,
        scanUrl,
        qrPayload: scanUrl
      };
    });

    res.status(200).json({
      studentDetails: {
        studentName: student.studentName || student.name,
        studentId: student.studentId || student.appNo,
        branch: student.branch,
        course: student.course,
        semester: student.semester,
        year: student.year,
        section: student.section || 'A'
      },
      classes: classesWithAttendance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching today classes', error: error.message });
  }
};

