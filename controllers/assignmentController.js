const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Employee = require('../models/Employee');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Admission = require('../models/Admission');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, department, branch, subject, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    
    const branchFilter = (branch && branch !== 'All Branches') ? branch : (department && department !== 'All Departments' ? department : null);
    if (branchFilter) {
      filter.$or = [
        { course: new RegExp(branchFilter, 'i') },
        { branch: new RegExp(branchFilter, 'i') },
        { department: new RegExp(branchFilter, 'i') }
      ];
    }
    if (subject && subject !== 'All Subjects') filter.subject = subject;
    if (search && search !== '') {
      const searchConditions = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { assignmentId: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await Assignment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await Assignment.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createAssignment = async (req, res) => {
  try {
    let { assignmentId, title, description, course, branch, department, subject, semester, section, assignedDate, dueDate, totalMarks, teacherId, teacherName, fileUrl, fileName } = req.body;
    
    // Auto-generate assignmentId if not supplied
    if (!assignmentId || assignmentId.trim() === '') {
      assignmentId = `ASN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    }
    
    // Check if duplicate for this college
    const existing = await Assignment.findOne({ assignmentId, collegeId: req.college._id });
    if (existing) {
      assignmentId = `ASN-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    }

    const branchVal = branch || course || department || '';

    const Student = require('../models/Student');
    const totalStudents = await Student.countDocuments({
      collegeId: req.college._id,
      status: 'Active',
      $or: [
        { course: new RegExp(branchVal, 'i') },
        { branch: new RegExp(branchVal, 'i') }
      ]
    });

    const payload = {
      assignmentId,
      title,
      description,
      course: branchVal,
      branch: branchVal,
      department: branchVal,
      subject,
      semester: semester || 'Sem 1',
      section: section || 'A',
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      assignedDate: assignedDate || new Date(),
      dueDate,
      totalMarks: Number(totalMarks) || 25,
      teacherId: teacherId || null,
      teacherName: teacherName || (req.teacher ? req.teacher.name : 'Admin'),
      status: 'Pending',
      totalStudents,
      submittedCount: 0,
      collegeId: req.college._id
    };
    const assignment = await Assignment.create(payload);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignmentById = async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateAssignment = async (req, res) => {
  try {
    const updateData = { ...req.body };
    const branchVal = updateData.branch || updateData.course || updateData.department;
    if (branchVal) {
      updateData.branch = branchVal;
      updateData.course = branchVal;
      updateData.department = branchVal;
    }

    const assignment = await Assignment.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment updated successfully', assignment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    await AssignmentSubmission.deleteMany({ assignmentId: req.params.id });
    res.json({ message: 'Assignment and submissions deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignmentSubmissions = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = { assignmentId, ...collegeFilter(req) };
    if (status && status !== 'All') filter.status = status;
    
    // We cannot search by studentName/rollNo directly since they aren't on the schema.
    // We can do it by finding students first, or just return all and let the frontend search.
    // For simplicity, we just return all populated with student details.
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    let submissions = await AssignmentSubmission.find(filter)
      .sort({ submissionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
      
    // Manually populate to support both Student and Admission collections
    for (let sub of submissions) {
      if (sub.studentId) {
        let student = await Student.findById(sub.studentId, 'studentName studentId email').lean();
        if (student) {
          sub.studentId = student;
        } else {
          let applicant = await Admission.findById(sub.studentId, 'name appNo email').lean();
          if (applicant) {
            sub.studentId = {
              _id: applicant._id,
              studentName: applicant.name,
              studentId: applicant.appNo,
              email: applicant.email
            };
          } else {
            sub.studentId = null;
          }
        }
      }
    }
      
    // Handle search filter in memory if provided
    let filteredSubmissions = submissions;
    if (search && search !== '') {
      const searchLower = search.toLowerCase();
      filteredSubmissions = submissions.filter(sub => 
        sub.studentId?.studentName?.toLowerCase().includes(searchLower) ||
        sub.studentId?.studentId?.toLowerCase().includes(searchLower)
      );
    }
      
    const total = await AssignmentSubmission.countDocuments(filter);
    res.json({ data: filteredSubmissions, total: filteredSubmissions.length, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSubmission = async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after' }
    ).select('-__v');
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    res.json({ message: 'Submission updated successfully', submission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAssignmentStats = async (req, res) => {
  try {
    const { department, branch, subject } = req.query;
    const filter = collegeFilter(req);
    const branchFilter = (branch && branch !== 'All Branches') ? branch : (department && department !== 'All Departments' ? department : null);
    if (branchFilter) {
      filter.$or = [
        { course: new RegExp(branchFilter, 'i') },
        { branch: new RegExp(branchFilter, 'i') },
        { department: new RegExp(branchFilter, 'i') }
      ];
    }
    if (subject && subject !== 'All Subjects') filter.subject = subject;

    const total = await Assignment.countDocuments(filter);
    const pending = await Assignment.countDocuments({ ...filter, status: 'Pending' });
    const submitted = await Assignment.countDocuments({ ...filter, status: 'Submitted' });
    const graded = await Assignment.countDocuments({ ...filter, status: 'Graded' });
    const overdue = await Assignment.countDocuments({ ...filter, status: 'Overdue' });

    const byCourse = await Assignment.aggregate([
      { $match: filter },
      { $group: { _id: '$course', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      data: { total, pending, submitted, graded, overdue, byCourse }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({ collegeId: req.college._id })
      .select('name empId department designation')
      .sort({ name: 1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
