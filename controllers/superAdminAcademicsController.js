const Course = require('../models/Course');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Designation = require('../models/Designation');

// Helper function to fetch master academics (collegeId is null/exists: false)
const getMasterQuery = () => ({
  $or: [
    { collegeId: { $exists: false } },
    { collegeId: null }
  ]
});

// ================= COURSES =================
exports.getCourses = async (req, res) => {
  try {
    const courses = await Course.find(getMasterQuery()).sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching master courses', error: error.message });
  }
};

exports.createCourse = async (req, res) => {
  try {
    const course = new Course(req.body);
    // Don't set collegeId
    await course.save();
    res.status(201).json(course);
  } catch (error) {
    res.status(400).json({ message: 'Error creating master course', error: error.message });
  }
};

exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndUpdate(
      { _id: req.params.id, ...getMasterQuery() },
      req.body,
      { new: true }
    );
    if (!course) return res.status(404).json({ message: 'Master course not found' });
    res.status(200).json(course);
  } catch (error) {
    res.status(400).json({ message: 'Error updating master course', error: error.message });
  }
};

exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ _id: req.params.id, ...getMasterQuery() });
    if (!course) return res.status(404).json({ message: 'Master course not found' });
    res.status(200).json({ message: 'Master course deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting master course', error: error.message });
  }
};

// ================= DEPARTMENTS (BRANCHES) =================
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find(getMasterQuery()).sort({ createdAt: -1 });
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching master departments', error: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = new Department(req.body);
    await department.save();
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ message: 'Error creating master department', error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findOneAndUpdate(
      { _id: req.params.id, ...getMasterQuery() },
      req.body,
      { new: true }
    );
    if (!department) return res.status(404).json({ message: 'Master department not found' });
    res.status(200).json(department);
  } catch (error) {
    res.status(400).json({ message: 'Error updating master department', error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findOneAndDelete({ _id: req.params.id, ...getMasterQuery() });
    if (!department) return res.status(404).json({ message: 'Master department not found' });
    res.status(200).json({ message: 'Master department deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting master department', error: error.message });
  }
};

// ================= SEMESTERS =================
exports.getSemesters = async (req, res) => {
  try {
    const semesters = await Semester.find(getMasterQuery()).sort({ semesterNumber: 1 });
    res.status(200).json(semesters);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching master semesters', error: error.message });
  }
};

exports.createSemester = async (req, res) => {
  try {
    const semester = new Semester(req.body);
    await semester.save();
    res.status(201).json(semester);
  } catch (error) {
    res.status(400).json({ message: 'Error creating master semester', error: error.message });
  }
};

exports.updateSemester = async (req, res) => {
  try {
    const semester = await Semester.findOneAndUpdate(
      { _id: req.params.id, ...getMasterQuery() },
      req.body,
      { new: true }
    );
    if (!semester) return res.status(404).json({ message: 'Master semester not found' });
    res.status(200).json(semester);
  } catch (error) {
    res.status(400).json({ message: 'Error updating master semester', error: error.message });
  }
};

exports.deleteSemester = async (req, res) => {
  try {
    const semester = await Semester.findOneAndDelete({ _id: req.params.id, ...getMasterQuery() });
    if (!semester) return res.status(404).json({ message: 'Master semester not found' });
    res.status(200).json({ message: 'Master semester deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting master semester', error: error.message });
  }
};

// ================= SUBJECTS =================
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find(getMasterQuery()).sort({ createdAt: -1 });
    res.status(200).json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching master subjects', error: error.message });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const subject = new Subject(req.body);
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: 'Error creating master subject', error: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.id, ...getMasterQuery() },
      req.body,
      { new: true }
    );
    if (!subject) return res.status(404).json({ message: 'Master subject not found' });
    res.status(200).json(subject);
  } catch (error) {
    res.status(400).json({ message: 'Error updating master subject', error: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, ...getMasterQuery() });
    if (!subject) return res.status(404).json({ message: 'Master subject not found' });
    res.status(200).json({ message: 'Master subject deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting master subject', error: error.message });
  }
};

// ================= DESIGNATIONS =================
exports.getDesignations = async (req, res) => {
  try {
    const designations = await Designation.find(getMasterQuery()).sort({ createdAt: -1 });
    res.status(200).json(designations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching master designations', error: error.message });
  }
};

exports.createDesignation = async (req, res) => {
  try {
    const designation = new Designation(req.body);
    await designation.save();
    res.status(201).json(designation);
  } catch (error) {
    res.status(400).json({ message: 'Error creating master designation', error: error.message });
  }
};

exports.updateDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOneAndUpdate(
      { _id: req.params.id, ...getMasterQuery() },
      req.body,
      { new: true }
    );
    if (!designation) return res.status(404).json({ message: 'Master designation not found' });
    res.status(200).json(designation);
  } catch (error) {
    res.status(400).json({ message: 'Error updating master designation', error: error.message });
  }
};

exports.deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findOneAndDelete({ _id: req.params.id, ...getMasterQuery() });
    if (!designation) return res.status(404).json({ message: 'Master designation not found' });
    res.status(200).json({ message: 'Master designation deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting master designation', error: error.message });
  }
};
