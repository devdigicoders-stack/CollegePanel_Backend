const SubjectAllocation = require('../models/SubjectAllocation');
const Student = require('../models/Student');
const Employee = require('../models/Employee');
const StudentAttendance = require('../models/StudentAttendance');
const Notice = require('../models/Notice');
const LiveNotification = require('../models/LiveNotification');
const StudyMaterial = require('../models/StudyMaterial');
const Assignment = require('../models/Assignment');
const Complaint = require('../models/Complaint');

// Helper to get teacher ID
const getTeacherId = (req) => {
  return req.teacher ? req.teacher._id : (req.employee ? req.employee._id : null);
};

const getYearFromSemester = (sem) => {
  const s = Number(sem);
  if (s === 1 || s === 2) return '1st Year';
  if (s === 3 || s === 4) return '2nd Year';
  if (s === 5 || s === 6) return '3rd Year';
  if (s === 7 || s === 8) return '4th Year';
  return '';
};

exports.getDashboardStats = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    if (!teacherId) {
      return res.status(401).json({ message: 'Teacher identification failed.' });
    }
    const collegeId = req.college._id;

    // Get classes for this teacher
    const classes = await SubjectAllocation.find({ teacher: teacherId, collegeId, status: 'Active' });
    
    // Total students (sum of unique students across these classes)
    let totalStudents = 0;
    const studentQueries = classes.map(c => {
      const year = getYearFromSemester(c.semester);
      let query = { 
        collegeId, 
        branch: new RegExp(c.courseName, 'i'), 
        status: 'Active'
      };
      if (year) query.year = year;
      return Student.countDocuments(query);
    });
    
    const studentsCounts = await Promise.all(studentQueries);
    totalStudents = studentsCounts.reduce((a, b) => a + b, 0);

    // Recent Notices count
    const noticesCount = await Notice.countDocuments({
      collegeId,
      status: 'Published'
    });

    // Assignments count
    const assignmentsCount = await Assignment.countDocuments({
      collegeId,
      teacherId: teacherId
    });

    // Upcoming Classes (just top 3 allocated classes)
    const upcomingClasses = classes.slice(0, 3);
    
    // Recent Notices data
    const recentNotices = await Notice.find({
      collegeId,
      status: 'Published'
    }).sort({ createdAt: -1 }).limit(3);

    res.json({
      classesCount: classes.length,
      studentsCount: totalStudents,
      noticesCount,
      assignmentsCount,
      upcomingClasses,
      recentNotices
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

exports.getMyClasses = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    if (!teacherId) {
      return res.status(401).json({ message: 'Teacher identification failed.' });
    }

    const classes = await SubjectAllocation.find({ 
      teacher: teacherId,
      collegeId: req.college._id,
      status: 'Active'
    }).sort({ semester: 1, subjectName: 1 });

    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching teacher classes', error: error.message });
  }
};

// Get students for a specific class
exports.getClassStudents = async (req, res) => {
  try {
    const classId = req.params.classId;
    const allocation = await SubjectAllocation.findById(classId);
    
    if (!allocation) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const targetYear = getYearFromSemester(allocation.semester);
    
    let query = {
      branch: new RegExp(allocation.courseName, 'i'),
      collegeId: req.college._id,
      status: 'Active'
    };

    if (targetYear) {
      query.year = targetYear;
    }

    const students = await Student.find(query).select('-password').sort({ studentName: 1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
};

// Get attendance for a class on a specific date
exports.getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query; // Format: YYYY-MM-DD
    
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await StudentAttendance.findOne({
      classId,
      collegeId: req.college._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    }).populate('records.studentId', 'studentName studentId rollNo');

    res.json(attendance || { records: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

// Get attendance history for a class
exports.getClassAttendanceHistory = async (req, res) => {
  try {
    const { classId } = req.params;

    const attendances = await StudentAttendance.find({
      classId,
      collegeId: req.college._id
    }).populate('records.studentId', 'studentName studentId rollNo').sort({ date: -1 });

    const history = attendances.map(att => {
      const total = att.records.length;
      const present = att.records.filter(r => r.status === 'Present').length;
      const absent = att.records.filter(r => r.status === 'Absent').length;
      const late = att.records.filter(r => r.status === 'Late').length;
      return {
        _id: att._id,
        date: att.date,
        total,
        present,
        absent,
        late,
        records: att.records
      };
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance history', error: error.message });
  }
};

// Get single student attendance history for a class
exports.getSingleStudentAttendanceHistory = async (req, res) => {
  try {
    const { classId, studentId } = req.params;

    const attendances = await StudentAttendance.find({
      classId,
      collegeId: req.college._id,
      'records.studentId': studentId
    }).sort({ date: -1 });

    const history = attendances.map(att => {
      const record = att.records.find(r => r.studentId.toString() === studentId.toString());
      return {
        date: att.date,
        status: record ? record.status : 'Absent'
      };
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student history', error: error.message });
  }
};

// Save or update attendance for a class on a specific date
exports.saveClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { date, records } = req.body;
    const teacherId = getTeacherId(req);

    if (!date || !records || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    let attendance = await StudentAttendance.findOne({
      classId,
      collegeId: req.college._id,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (attendance) {
      // Update existing record
      attendance.records = records;
      attendance.teacherId = teacherId;
      await attendance.save();
    } else {
      // Create new record
      attendance = new StudentAttendance({
        classId,
        teacherId,
        date: startOfDay,
        records,
        collegeId: req.college._id
      });
      await attendance.save();
    }

    res.json({ message: 'Attendance saved successfully', data: attendance });
  } catch (error) {
    res.status(500).json({ message: 'Error saving attendance', error: error.message });
  }
};

// Get notices targeted to this class
exports.getClassNotices = async (req, res) => {
  try {
    const notices = await Notice.find({
      collegeId: req.college._id,
      // Target audiences that might include this class
      // In a real system, you'd filter by notice.department == class.department
    }).sort({ createdAt: -1 });

    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notices', error: error.message });
  }
};

// Create notice for this class
exports.createClassNotice = async (req, res) => {
  try {
    const { title, details, targetAudience, department, link, dateOfPublishing } = req.body;
    
    let pdfs = [];
    let images = [];
    if (req.files) {
      if (req.files['pdfs'] && req.files['pdfs'].length > 0) {
        pdfs = req.files['pdfs'].map(file => `/uploads/notices/${file.filename}`);
      }
      if (req.files['images'] && req.files['images'].length > 0) {
        images = req.files['images'].map(file => `/uploads/notices/${file.filename}`);
      }
    }

    const newNotice = new Notice({
      noticeId: 'NOT' + Date.now(),
      title,
      details,
      targetAudience: targetAudience || 'Specific Course',
      department,
      link,
      pdfs,
      images,
      postedBy: req.teacher ? req.teacher.name : (req.employee ? req.employee.name : 'Teacher'),
      postedByRole: 'Teacher',
      dateOfPublishing: dateOfPublishing ? new Date(dateOfPublishing) : new Date(),
      status: 'Published',
      collegeId: req.college._id
    });
    await newNotice.save();
    res.status(201).json({ message: 'Notice published', data: newNotice });
  } catch (error) {
    res.status(500).json({ message: 'Error publishing notice', error: error.message });
  }
};

exports.deleteClassNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const notice = await Notice.findOneAndDelete({ _id: noticeId, collegeId: req.college._id });
    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting notice', error: error.message });
  }
};

// Get study materials for class
exports.getClassStudyMaterials = async (req, res) => {
  try {
    const { classId } = req.params;
    const allocation = await SubjectAllocation.findById(classId);
    
    if (!allocation) return res.status(404).json({ message: 'Class not found' });

    const materials = await StudyMaterial.find({
      course: allocation.courseName,
      subject: allocation.subjectName,
      collegeId: req.college._id
    }).populate('uploadedBy', 'name').sort({ createdAt: -1 });

    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching materials', error: error.message });
  }
};

// Upload study material
exports.uploadStudyMaterial = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, type, fileUrl, size } = req.body;
    
    const allocation = await SubjectAllocation.findById(classId);
    if (!allocation) return res.status(404).json({ message: 'Class not found' });

    const newMaterial = new StudyMaterial({
      title,
      type,
      fileUrl,
      size,
      course: allocation.courseName,
      subject: allocation.subjectName,
      uploadedBy: getTeacherId(req),
      collegeId: req.college._id
    });

    await newMaterial.save();
    res.status(201).json({ message: 'Material uploaded successfully', data: newMaterial });
  } catch (error) {
    res.status(500).json({ message: 'Error uploading material', error: error.message });
  }
};

// Get Assignments
exports.getClassAssignments = async (req, res) => {
  try {
    const { classId } = req.params;
    const allocation = await SubjectAllocation.findById(classId);
    
    if (!allocation) return res.status(404).json({ message: 'Class not found' });

    const assignments = await Assignment.find({
      course: allocation.courseName,
      subject: allocation.subjectName,
      semester: allocation.semester,
      collegeId: req.college._id
    }).sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assignments', error: error.message });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const complaints = await Complaint.find({ 
      submittedById: teacherId, 
      collegeId: req.college._id 
    }).sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching complaints', error: error.message });
  }
};

// Get assignment submissions
exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const AssignmentSubmission = require('../models/AssignmentSubmission');
    const submissions = await AssignmentSubmission.find({ assignmentId, collegeId: req.college._id }).populate('studentId', 'studentName studentId rollNo email');
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching submissions', error: error.message });
  }
};

// Grade assignment submission
exports.gradeSubmission = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, remarks } = req.body;
    const AssignmentSubmission = require('../models/AssignmentSubmission');
    
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { _id: submissionId, collegeId: req.college._id },
      { grade, remarks, status: 'Graded' },
      { new: true }
    ).populate('assignmentId');

    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const LiveNotification = require('../models/LiveNotification');
    const notification = new LiveNotification({
      userId: submission.studentId.toString(),
      role: 'Student',
      title: 'Assignment Graded',
      message: `Your submission for '${submission.assignmentId.title}' has been graded.`,
      type: 'Assignment',
      collegeId: req.college._id
    });
    await notification.save();

    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io && connectedUsers) {
      const socketId = connectedUsers.get(submission.studentId.toString());
      if (socketId) {
        io.to(socketId).emit('new_notification', notification);
      }
    }

    res.json({ message: 'Submission graded successfully', submission });
  } catch (error) {
    res.status(500).json({ message: 'Error grading submission', error: error.message });
  }
};

exports.submitComplaint = async (req, res) => {
  try {
    const { subject, category, description, priority } = req.body;
    const teacherId = getTeacherId(req);
    
    const newComplaint = new Complaint({
      complaintId: 'CMP' + Date.now(),
      subject,
      category,
      description,
      priority: priority || 'Medium',
      status: 'Pending',
      submittedBy: req.teacher ? req.teacher.name : (req.employee ? req.employee.name : 'Teacher'),
      submittedById: teacherId,
      collegeId: req.college._id
    });
    
    await newComplaint.save();
    res.status(201).json({ message: 'Complaint submitted successfully', data: newComplaint });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting complaint', error: error.message });
  }
};

// Create Assignment
exports.createAssignment = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, dueDate, totalMarks } = req.body;

    const allocation = await SubjectAllocation.findById(classId);
    if (!allocation) return res.status(404).json({ message: 'Class not found' });

    const newAssignment = new Assignment({
      assignmentId: 'ASN' + Date.now(),
      title,
      description,
      course: allocation.courseName,
      department: allocation.department,
      subject: allocation.subjectName,
      semester: allocation.semester,
      section: 'A', // Assuming section A by default
      assignedDate: new Date(),
      dueDate,
      totalMarks,
      teacherId: getTeacherId(req),
      teacherName: allocation.teacherName,
      collegeId: req.college._id
    });

    await newAssignment.save();

    // Fetch students of this class
    const yearMapping = { 
      '1': '1st', '2': '1st', 'Sem 1': '1st', 'Sem 2': '1st',
      '3': '2nd', '4': '2nd', 'Sem 3': '2nd', 'Sem 4': '2nd',
      '5': '3rd', '6': '3rd', 'Sem 5': '3rd', 'Sem 6': '3rd',
      '7': '4th', '8': '4th', 'Sem 7': '4th', 'Sem 8': '4th'
    };
    const targetYearBase = yearMapping[allocation.semester.toString()] || '1st';
    
    const students = await Student.find({
      course: allocation.courseName,
      branch: allocation.department,
      year: { $in: [targetYearBase, `${targetYearBase} Year`] },
      collegeId: req.college._id
    });

    // Create notifications for students and emit
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');

    if (students && students.length > 0) {
      const notifications = students.map(student => ({
        userId: student._id.toString(),
        role: 'Student',
        title: 'New Assignment',
        message: `${allocation.teacherName} assigned a new task: ${title}`,
        type: 'Assignment',
        collegeId: req.college._id
      }));

      await LiveNotification.insertMany(notifications);

      // Emit to online students
      if (io && connectedUsers) {
        students.forEach(student => {
          const socketId = connectedUsers.get(student._id.toString());
          if (socketId) {
            io.to(socketId).emit('new_notification', {
              title: 'New Assignment',
              message: `${allocation.teacherName} assigned a new task: ${title}`,
              type: 'Assignment'
            });
          }
        });
      }
    }

    res.status(201).json({ message: 'Assignment created successfully', data: newAssignment });
  } catch (error) {
    res.status(500).json({ message: 'Error creating assignment', error: error.message });
  }
};

exports.getLiveNotifications = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    const notifications = await LiveNotification.find({ 
      userId: teacherId, 
      collegeId: req.college._id 
    }).sort({ createdAt: -1 }).limit(50);
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

exports.markNotificationsRead = async (req, res) => {
  try {
    const teacherId = getTeacherId(req);
    await LiveNotification.updateMany(
      { userId: teacherId, collegeId: req.college._id, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
};

exports.updateGeoFence = async (req, res) => {
  try {
    const { classId } = req.params;
    const { isEnabled, lat, lng, radius } = req.body;
    
    const allocation = await SubjectAllocation.findOne({ _id: classId, collegeId: req.college._id });
    if (!allocation) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Update geo-fence settings
    allocation.geoFence = {
      isEnabled: isEnabled || false,
      lat: lat || allocation.geoFence?.lat,
      lng: lng || allocation.geoFence?.lng,
      radius: radius || allocation.geoFence?.radius || 50
    };

    await allocation.save();
    res.json({ message: 'Geo-fence settings updated successfully', data: allocation.geoFence });
  } catch (error) {
    res.status(500).json({ message: 'Error updating geo-fence settings', error: error.message });
  }
};
