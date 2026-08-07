const Student = require('../models/Student');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, branch, year, session, course, status, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    let query = collegeFilter(req);

    if (branch && branch !== 'All Branches' && branch !== 'All Departments' && branch !== '') {
      query.branch = branch;
    }
    if (year && year !== 'All Years' && year !== '') {
      query.year = year;
    }
    if (session && session !== 'All Sessions' && session !== '') {
      query.session = session;
    }
    if (course && course !== 'All Courses' && course !== '') {
      query.course = course;
    }
    if (status && status !== 'All Status' && status !== '') {
      query.status = status;
    }

    if (search && search !== '') {
      query.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { branch: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortObj = {};
    sortObj[sortBy] = order === 'desc' ? -1 : 1;

    const students = await Student.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Student.countDocuments(query);

    res.json({
      message: 'Students fetched successfully',
      data: students,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching student', error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { studentName, studentId, email, phone, gender, dob, address, branch, year, session, course, enrollmentDate, status } = req.body;

    const student = await Student.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      { studentName, studentId, email, phone, gender, dob, address, branch, year, session, course, enrollmentDate, status },
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully', student });
  } catch (error) {
    res.status(500).json({ message: 'Error updating student', error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting student', error: error.message });
  }
};

exports.getStudentFilters = async (req, res) => {
  try {
    const match = collegeFilter(req);
    const [branches, years, sessions, courses] = await Promise.all([
      Student.distinct('branch', match),
      Student.distinct('year', match),
      Student.distinct('session', match),
      Student.distinct('course', match)
    ]);
    
    // Generate dynamic sessions for the last 4 years and next 2 years
    const currentYear = new Date().getFullYear();
    const dynamicSessions = [];
    for (let i = currentYear - 4; i <= currentYear + 2; i++) {
      dynamicSessions.push(`${i}-${(i + 1).toString().slice(-2)}`);
    }

    // Filter out empty strings/nulls and sort
    const cleanAndSort = (arr) => arr.filter(Boolean).sort();
    
    // Merge DB sessions and dynamic sessions
    const allSessions = [...new Set([...dynamicSessions, ...sessions])];
    
    res.json({
      branches: cleanAndSort(branches),
      years: cleanAndSort(years),
      sessions: cleanAndSort(allSessions),
      courses: cleanAndSort(courses)
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching filters', error: error.message });
  }
};

exports.addStudent = async (req, res) => {
  try {
    const {
      studentName, studentId: inputStudentId, email, phone, gender, dob,
      address, branch, year, session, course, enrollmentDate, status
    } = req.body;

    if (!studentName) return res.status(400).json({ message: 'Student name is required' });
    if (!course) return res.status(400).json({ message: 'Course is required' });

    // Auto-generate studentId if not provided
    const yr = new Date().getFullYear().toString().slice(-2);
    const count = await Student.countDocuments({ collegeId: req.college._id });
    let studentId = inputStudentId || `STU${yr}${String(count + 1).padStart(4, '0')}`;

    // Avoid duplicate studentId
    const existsById = await Student.findOne({ studentId });
    if (existsById) {
      studentId = `STU${yr}${String(count + 1).padStart(4, '0')}${Math.floor(Math.random() * 90 + 10)}`;
    }

    // Auto-generate portal credentials
    const namePart = studentName.toLowerCase().replace(/\s+/g, '.');
    const ts = Date.now().toString().slice(-4);
    const username = `${namePart}.${ts}`;
    const password = `Student@${ts}`;

    const student = await Student.create({
      studentName,
      studentId,
      email: email || `${namePart}@student.edu`,
      phone: phone || '',
      gender: gender || 'Male',
      dob,
      address,
      branch,
      year,
      session,
      course,
      enrollmentDate: enrollmentDate || new Date(),
      status: status || 'Active',
      username,
      password,
      collegeId: req.college._id
    });

    res.status(201).json({
      message: 'Student added successfully',
      data: student,
      credentials: { username, password, studentId }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating student', error: error.message });
  }
};
