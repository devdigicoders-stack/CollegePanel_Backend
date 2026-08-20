const Department = require('../models/Department');
const Teacher = require('../models/Teacher');
const SubjectAllocation = require('../models/SubjectAllocation');
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Section = require('../models/Section');

// ============ DEPARTMENTS ============

exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ collegeId: req.college._id }).sort({ createdAt: -1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching department', error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, hod, totalFaculty } = req.body;
    
    if (!name || !hod) {
      return res.status(400).json({ message: 'Department name and HOD are required' });
    }

    const department = await Department.create({
      name,
      hod,
      totalFaculty: totalFaculty || 0,
      collegeId: req.college._id
    });

    res.status(201).json({ message: 'Department created successfully', department });
  } catch (error) {
    res.status(500).json({ message: 'Error creating department', error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { name, hod, totalFaculty } = req.body;
    
    let department = await Department.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!department) return res.status(404).json({ message: 'Department not found' });

    if (name) department.name = name;
    if (hod) department.hod = hod;
    if (totalFaculty !== undefined) department.totalFaculty = totalFaculty;

    await department.save();
    res.json({ message: 'Department updated successfully', department });
  } catch (error) {
    res.status(500).json({ message: 'Error updating department', error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting department', error: error.message });
  }
};

// ============ COURSES ============

exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find({ collegeId: req.college._id }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
};

exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching course', error: error.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const { code, name, department, duration, totalSemesters, status } = req.body;
    
    if (!code || !name || !department || !duration || !totalSemesters) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const courseExists = await Course.findOne({ code });
    if (courseExists) return res.status(400).json({ message: 'Course code already exists' });

    const course = await Course.create({
      code,
      name,
      department,
      duration,
      totalSemesters,
      status: status || 'Active',
      collegeId: req.college._id
    });

    res.status(201).json({ message: 'Course created successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const { code, name, department, duration, totalSemesters, status } = req.body;
    
    let course = await Course.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!course) return res.status(404).json({ message: 'Course not found' });

    if (code) course.code = code;
    if (name) course.name = name;
    if (department) course.department = department;
    if (duration) course.duration = duration;
    if (totalSemesters) course.totalSemesters = totalSemesters;
    if (status) course.status = status;

    await course.save();
    res.json({ message: 'Course updated successfully', course });
  } catch (error) {
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
};

// ============ SEMESTERS ============

exports.getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find({ collegeId: req.college._id }).sort({ semesterNumber: 1 });
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching semesters', error: error.message });
  }
};

exports.getSemesterById = async (req, res) => {
  try {
    const semester = await Semester.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });
    if (!semester) return res.status(404).json({ message: 'Semester not found' });
    res.json(semester);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching semester', error: error.message });
  }
};

exports.createSemester = async (req, res) => {
  try {
    const { semesterNumber, courseName, startDate, endDate, totalWeeks, status } = req.body;
    
    if (!semesterNumber || !courseName || !startDate || !endDate) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const semester = await Semester.create({
      semesterNumber,
      courseName,
      startDate,
      endDate,
      totalWeeks: totalWeeks || 16,
      status: status || 'Upcoming',
      collegeId: req.college._id
    });

    res.status(201).json({ message: 'Semester created successfully', semester });
  } catch (error) {
    res.status(500).json({ message: 'Error creating semester', error: error.message });
  }
};

exports.updateSemester = async (req, res) => {
  try {
    const { semesterNumber, courseName, startDate, endDate, totalWeeks, status } = req.body;
    
    let semester = await Semester.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!semester) return res.status(404).json({ message: 'Semester not found' });

    if (semesterNumber) semester.semesterNumber = semesterNumber;
    if (courseName) semester.courseName = courseName;
    if (startDate) semester.startDate = startDate;
    if (endDate) semester.endDate = endDate;
    if (totalWeeks) semester.totalWeeks = totalWeeks;
    if (status) semester.status = status;

    await semester.save();
    res.json({ message: 'Semester updated successfully', semester });
  } catch (error) {
    res.status(500).json({ message: 'Error updating semester', error: error.message });
  }
};

exports.deleteSemester = async (req, res) => {
  try {
    const semester = await Semester.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!semester) return res.status(404).json({ message: 'Semester not found' });
    res.json({ message: 'Semester deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting semester', error: error.message });
  }
};

// ============ SUBJECTS ============

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ collegeId: req.college._id }).sort({ courseName: 1, semester: 1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subjects', error: error.message });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subject', error: error.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { code, name, department, courseName, semester, credits, theory, practical, status } = req.body;
    
    if (!code || !name || !department || !courseName || !semester || !credits) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const subjectExists = await Subject.findOne({ code });
    if (subjectExists) return res.status(400).json({ message: 'Subject code already exists' });

    const subject = await Subject.create({
      code,
      name,
      department,
      courseName,
      semester,
      credits,
      theory: theory || 0,
      practical: practical || 0,
      status: status || 'Active',
      collegeId: req.college._id
    });

    res.status(201).json({ message: 'Subject created successfully', subject });
  } catch (error) {
    res.status(500).json({ message: 'Error creating subject', error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { code, name, department, courseName, semester, credits, theory, practical, status } = req.body;
    
    let subject = await Subject.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    if (code) subject.code = code;
    if (name) subject.name = name;
    if (department) subject.department = department;
    if (courseName) subject.courseName = courseName;
    if (semester) subject.semester = semester;
    if (credits) subject.credits = credits;
    if (theory !== undefined) subject.theory = theory;
    if (practical !== undefined) subject.practical = practical;
    if (status) subject.status = status;

    await subject.save();
    res.json({ message: 'Subject updated successfully', subject });
  } catch (error) {
    res.status(500).json({ message: 'Error updating subject', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting subject', error: error.message });
  }
};

// ============ SECTIONS ============

exports.getSections = async (req, res) => {
  try {
    const sections = await Section.find({ collegeId: req.college._id })
      .populate('classTeacher', 'name email mobile department designation')
      .sort({ courseName: 1, name: 1 });
    
    // Format sections to include classTeacherName for display
    const formattedSections = sections.map(section => {
      const sectionObj = section.toObject();
      sectionObj.classTeacher = section.classTeacher ? section.classTeacher.name : sectionObj.classTeacherName || 'N/A';
      return sectionObj;
    });
    
    res.json(formattedSections);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sections', error: error.message });
  }
};

exports.getSectionById = async (req, res) => {
  try {
    const section = await Section.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });
    if (!section) return res.status(404).json({ message: 'Section not found' });
    res.json(section);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching section', error: error.message });
  }
};

exports.createSection = async (req, res) => {
  try {
    const { name, courseName, semester, classTeacher, totalStudents, room, status } = req.body;
    
    if (!name || !courseName || !semester || !classTeacher) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const section = await Section.create({
      name,
      courseName,
      semester,
      classTeacher,
      totalStudents: totalStudents || 0,
      room: room || '',
      status: status || 'Active',
      collegeId: req.college._id
    });

    res.status(201).json({ message: 'Section created successfully', section });
  } catch (error) {
    res.status(500).json({ message: 'Error creating section', error: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    const { name, courseName, semester, classTeacher, totalStudents, room, status } = req.body;
    
    let section = await Section.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!section) return res.status(404).json({ message: 'Section not found' });

    if (name) section.name = name;
    if (courseName) section.courseName = courseName;
    if (semester) section.semester = semester;
    if (classTeacher) section.classTeacher = classTeacher;
    if (totalStudents !== undefined) section.totalStudents = totalStudents;
    if (room !== undefined) section.room = room;
    if (status) section.status = status;

    await section.save();
    res.json({ message: 'Section updated successfully', section });
  } catch (error) {
    res.status(500).json({ message: 'Error updating section', error: error.message });
  }
};

exports.deleteSection = async (req, res) => {
  try {
    const section = await Section.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!section) return res.status(404).json({ message: 'Section not found' });
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting section', error: error.message });
  }
};

// ============ SUBJECT ALLOCATIONS ============

exports.getAllocations = async (req, res) => {
  try {
    const allocations = await SubjectAllocation.find({ collegeId: req.college._id })
      .sort({ createdAt: -1 });
    res.json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching allocations', error: error.message });
  }
};

exports.createAllocation = async (req, res) => {
  try {
    const { teacher, course, semester, subject, status } = req.body;
    
    if (!teacher || !course || !semester || !subject) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Fetch names to store in document for easy frontend display
    const teacherDoc = await Teacher.findOne({ _id: teacher, collegeId: req.college._id });
    const courseDoc = await Course.findOne({ _id: course, collegeId: req.college._id });
    const subjectDoc = await Subject.findOne({ _id: subject, collegeId: req.college._id });

    if (!teacherDoc || !courseDoc || !subjectDoc) {
      return res.status(404).json({ message: 'Invalid teacher, course, or subject reference' });
    }

    const allocationExists = await SubjectAllocation.findOne({
      teacher,
      course,
      semester,
      subject,
      collegeId: req.college._id
    });

    if (allocationExists) {
      return res.status(400).json({ message: 'This subject is already allocated to this teacher for the selected semester and branch' });
    }

    const allocation = await SubjectAllocation.create({
      teacher,
      teacherName: teacherDoc.name,
      course,
      courseName: courseDoc.name,
      semester,
      subject,
      subjectName: subjectDoc.name,
      subjectCode: subjectDoc.code,
      status: status || 'Active',
      collegeId: req.college._id
    });

    res.status(201).json({ message: 'Subject allocated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Error allocating subject', error: error.message });
  }
};

exports.updateAllocation = async (req, res) => {
  try {
    const { status } = req.body;
    
    let allocation = await SubjectAllocation.findOne({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });

    if (status) allocation.status = status;

    await allocation.save();
    res.json({ message: 'Allocation updated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Error updating allocation', error: error.message });
  }
};

exports.deleteAllocation = async (req, res) => {
  try {
    const allocation = await SubjectAllocation.findOneAndDelete({
      _id: req.params.id,
      collegeId: req.college._id
    });

    if (!allocation) return res.status(404).json({ message: 'Allocation not found' });
    res.json({ message: 'Allocation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting allocation', error: error.message });
  }
};
