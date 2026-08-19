const jwt = require('jsonwebtoken');
const SuperAdmin = require('../models/SuperAdmin');
const College = require('../models/College');
const Employee = require('../models/Employee');
const Student = require('../models/Student');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

      // Check if it's a superadmin
      const superAdmin = await SuperAdmin.findById(decoded.id).select('-password');
      if (superAdmin) {
        req.superAdmin = superAdmin;
        return next();
      } else {
        return res.status(401).json({ message: 'Not authorized as superadmin' });
      }
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const collegeProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

      if (!decoded || !decoded.id) {
        return res.status(401).json({ message: 'Invalid token structure' });
      }

      // 0. Check if it's a Super Admin
      const superAdmin = await SuperAdmin.findById(decoded.id);
      if (superAdmin) {
        req.superAdmin = superAdmin;
        req.userRole = 'Super Admin';
        return next();
      }

      // 1. Check if it's a direct college admin account
      let college = await College.findById(decoded.id);
      if (college) {
        req.college = college;
        req.userRole = 'college_admin';
        return next();
      }

      // 2. Check if it's an employee account
      const employee = await Employee.findById(decoded.id);
      if (employee) {
        college = await College.findById(employee.collegeId);
        if (college) {
          req.college = college;
          req.employee = employee;
          req.userRole = employee.role;
          return next();
        }
      }

      // 2b. Check if it's a teacher account
      const Teacher = require('../models/Teacher');
      const teacher = await Teacher.findById(decoded.id);
      if (teacher) {
        college = await College.findById(teacher.collegeId);
        if (college) {
          req.college = college;
          req.teacher = teacher;
          req.userRole = 'Teacher Role';
          return next();
        }
      }

      // 3. Check if it's a student account
      const student = await Student.findById(decoded.id);
      if (student) {
        college = await College.findById(student.collegeId);
        if (college) {
          req.college = college;
          req.student = student;
          req.userRole = 'Student';
          return next();
        }
      }

      // 4. Check if it's an applicant account (Public Admission)
      const Admission = require('../models/Admission');
      const applicant = await Admission.findById(decoded.id);
      if (applicant) {
        college = await College.findById(applicant.collegeId);
        if (college) {
          req.college = college;
          req.student = {
             _id: applicant._id,
             studentName: applicant.name,
             email: applicant.email,
             username: applicant.appNo,
             branch: applicant.branch,
             course: applicant.course,
             collegeId: applicant.collegeId,
             isApplicant: true
          };
          req.userRole = 'Student';
          return next();
        }
      }

      return res.status(401).json({ message: 'User or College context not found' });
    } catch (error) {
      console.error('Auth Error:', error);
      return res.status(401).json({ message: 'Not authorized, token failed', error: error.message });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect, collegeProtect };
