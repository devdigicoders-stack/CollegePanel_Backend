const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Employee = require('../models/Employee');
const Teacher = require('../models/Teacher');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, department, subject, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (department && department !== 'All Departments') filter.course = department;
    if (subject && subject !== 'All Subjects') filter.subject = subject;
    if (search && search !== '') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { assignmentId: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } }
      ];
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
    const { assignmentId, title, description, course, subject, semester, section, assignedDate, dueDate, totalMarks, teacherId, teacherName } = req.body;
    const existing = await Assignment.findOne({ assignmentId });
    if (existing) {
      return res.status(400).json({ message: 'Assignment ID already exists' });
    }
    const Student = require('../models/Student');
    const totalStudents = await Student.countDocuments({
      collegeId: req.college._id,
      status: 'Active',
      $or: [
        { course: course },
        { branch: course }
      ]
    });

    const payload = {
      assignmentId, title, description, course, subject, semester, section,
      assignedDate: assignedDate || new Date(),
      dueDate, totalMarks,
      teacherId, teacherName,
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
    const assignment = await Assignment.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
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
    const submissions = await AssignmentSubmission.find(filter)
      .populate('studentId', 'studentName studentId email')
      .sort({ submissionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
      
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
    const { department, subject } = req.query;
    const filter = collegeFilter(req);
    if (department && department !== 'All Departments') filter.course = department;
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
