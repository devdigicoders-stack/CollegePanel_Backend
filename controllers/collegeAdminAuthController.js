const College = require('../models/College');
const Employee = require('../models/Employee');
const Student = require('../models/Student');
const jwt = require('jsonwebtoken');

// Generate JWT containing user ID, role, and collegeId
const generateToken = (id, role, collegeId) => {
  return jwt.sign({ id, role, collegeId }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Auth admin/employee/student & get token
// @route   POST /api/college-admin/login
// @access  Public
exports.loginCollegeAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Try to login as College Admin
    const college = await College.findOne({
      $or: [{ username }, { adminEmail: username }]
    });

    if (college && college.isActive && (await college.matchPassword(password))) {
      return res.json({
        _id: college._id,
        name: college.adminName,
        collegeName: college.collegeName,
        adminEmail: college.adminEmail,
        username: college.username,
        role: 'college_admin',
        collegeId: college._id,
        department: 'Administration',
        isPremiumUnlocked: college.isPremiumUnlocked || false,
        unlockedModules: college.unlockedModules || [],
        token: generateToken(college._id, 'college_admin', college._id),
      });
    }

    // 2. Try to login as Employee (Principal, Warden, HOD, Teacher, Accountant, etc.)
    const employee = await Employee.findOne({
      $or: [{ username }, { email: username }]
    });

    if (employee && employee.status === 'Active' && employee.password === password) {
      const collegeDetail = await College.findById(employee.collegeId);
      
      // Fetch role permissions
      const Role = require('../models/Role');
      let permissions = [];
      if (employee.role) {
        const roleDoc = await Role.findOne({ name: employee.role, collegeId: employee.collegeId });
        if (roleDoc && roleDoc.permissions) {
          permissions = roleDoc.permissions;
        }
      }

      return res.json({
        _id: employee._id,
        name: employee.name,
        collegeName: collegeDetail ? collegeDetail.collegeName : 'DigiCampusPro',
        email: employee.email,
        username: employee.username,
        role: employee.role, // e.g. 'Principal', 'Hostel Warden', etc.
        department: employee.department,
        collegeId: employee.collegeId,
        permissions: permissions, // Attach permissions
        isPremiumUnlocked: collegeDetail ? (collegeDetail.isPremiumUnlocked || false) : false,
        unlockedModules: collegeDetail ? (collegeDetail.unlockedModules || []) : [],
        token: generateToken(employee._id, employee.role, employee.collegeId),
      });
    }

    // 3. Try to login as Teacher
    const Teacher = require('../models/Teacher');
    const teacher = await Teacher.findOne({
      $or: [{ username }, { email: username }]
    });

    if (teacher && teacher.status === 'Active' && teacher.password === password) {
      const collegeDetail = await College.findById(teacher.collegeId);
      
      // Fetch role permissions for Teacher
      const Role = require('../models/Role');
      let permissions = [];
      const roleDoc = await Role.findOne({ name: { $in: ['Teacher', 'Teacher Role'] }, collegeId: teacher.collegeId });
      if (roleDoc && roleDoc.permissions) {
        permissions = roleDoc.permissions;
      }

      return res.json({
        _id: teacher._id,
        name: teacher.name,
        collegeName: collegeDetail ? collegeDetail.collegeName : 'DigiCampusPro',
        email: teacher.email,
        username: teacher.username,
        role: 'Teacher',
        designation: teacher.designation,
        department: teacher.department,
        collegeId: teacher.collegeId,
        permissions: permissions,
        token: generateToken(teacher._id, 'Teacher', teacher.collegeId),
      });
    }

    // 4. Try to login as Student
    const student = await Student.findOne({
      $or: [{ username }, { email: username }, { studentId: username }]
    });

    if (student && student.status === 'Active' && student.password === password) {
      const collegeDetail = await College.findById(student.collegeId);
      return res.json({
        _id: student._id,
        name: student.studentName,
        collegeName: collegeDetail ? collegeDetail.collegeName : 'DigiCampusPro',
        email: student.email,
        username: student.username,
        role: 'Student',
        department: student.branch,
        collegeId: student.collegeId,
        token: generateToken(student._id, 'Student', student.collegeId),
      });
    }

    // 5. Try to login as Applicant (Public Admission)
    const Admission = require('../models/Admission');
    const applicant = await Admission.findOne({ appNo: username });
    if (applicant) {
      // For applicant, password is DOB in YYYY-MM-DD format
      const dobStr = applicant.dob ? new Date(applicant.dob).toISOString().split('T')[0] : null;
      if (password === dobStr || password === applicant.mobile) { // Support mobile as fallback if needed
        
        if (applicant.status === 'Rejected') {
          return res.status(403).json({ message: 'Your application has been rejected. Please contact the administration.' });
        }
        
        if (applicant.status !== 'Approved') {
          return res.status(403).json({ message: 'Your application is currently pending. You can login only after it is approved by the admin.' });
        }

        // FIX: If applicant is already registered as a student, log them in as a full Student!
        if (applicant.studentId) {
          const registeredStudent = await Student.findOne({ studentId: applicant.studentId });
          if (registeredStudent && registeredStudent.status === 'Active') {
            const collegeDetail = await College.findById(registeredStudent.collegeId);
            return res.json({
              _id: registeredStudent._id,
              name: registeredStudent.studentName,
              collegeName: collegeDetail ? collegeDetail.collegeName : 'DigiCampusPro',
              email: registeredStudent.email,
              username: registeredStudent.username || registeredStudent.studentId,
              role: 'Student',
              department: registeredStudent.branch,
              collegeId: registeredStudent.collegeId,
              token: generateToken(registeredStudent._id, 'Student', registeredStudent.collegeId),
            });
          }
        }

        const collegeDetail = await College.findById(applicant.collegeId);
        return res.json({
          _id: applicant._id,
          name: applicant.name,
          collegeName: collegeDetail ? collegeDetail.collegeName : 'DigiCampusPro',
          email: applicant.email,
          username: applicant.appNo,
          role: 'Student', // Pretend to be a student for the portal
          department: applicant.branch,
          collegeId: applicant.collegeId,
          token: generateToken(applicant._id, 'Student', applicant.collegeId),
        });
      }
    }

    // If none matches
    res.status(401).json({ message: 'Invalid username or password' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update admin/employee profile (Password and Info Change)
// @route   PUT /api/college-admin/profile
// @access  Private (collegeProtect)
exports.updateProfile = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    
    // 1. Check if it's an employee
    if (req.employee) {
      if (name) req.employee.name = name;
      if (email) req.employee.email = email;
      
      if (currentPassword && newPassword) {
        if (req.employee.password !== currentPassword) {
          return res.status(400).json({ message: 'Incorrect current password' });
        }
        req.employee.password = newPassword;
      }
      
      await req.employee.save();
      return res.json({ message: 'Profile updated successfully', user: { name: req.employee.name, email: req.employee.email } });
    }
    
    // 2. Check if it's the direct college admin
    if (req.college && req.userRole === 'college_admin') {
      if (name) req.college.adminName = name;
      if (email) req.college.adminEmail = email;
      
      if (currentPassword && newPassword) {
        if (!(await req.college.matchPassword(currentPassword))) {
          return res.status(400).json({ message: 'Incorrect current password' });
        }
        req.college.password = newPassword;
      }
      
      await req.college.save();
      return res.json({ message: 'Profile updated successfully', user: { name: req.college.adminName, email: req.college.adminEmail } });
    }

    return res.status(400).json({ message: 'Invalid user context' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};

// @desc    Get current user profile & permissions
// @route   GET /api/college-admin/me
// @access  Private (collegeProtect)
exports.getMe = async (req, res) => {
  try {
    let userDetail = {};
    let permissions = [];
    const Role = require('../models/Role');
    const collegeName = req.college ? req.college.collegeName : 'DigiCampusPro';

    if (req.college && req.userRole === 'college_admin') {
      userDetail = {
        _id: req.college._id,
        name: req.college.adminName,
        email: req.college.adminEmail,
        username: req.college.username,
        role: 'college_admin',
        department: 'Administration',
        collegeName
      };
    } else if (req.employee) {
      userDetail = {
        _id: req.employee._id,
        name: req.employee.name,
        email: req.employee.email,
        username: req.employee.username,
        role: req.employee.role,
        department: req.employee.department,
        collegeName
      };
      if (req.employee.role) {
        const roleDoc = await Role.findOne({ name: req.employee.role, collegeId: req.employee.collegeId });
        if (roleDoc && roleDoc.permissions) {
          permissions = roleDoc.permissions;
        }
      }
    } else if (req.teacher) {
      userDetail = {
        _id: req.teacher._id,
        name: req.teacher.name,
        email: req.teacher.email,
        username: req.teacher.username,
        role: 'Teacher Role',
        designation: req.teacher.designation,
        department: req.teacher.department,
        collegeName
      };
      const roleDoc = await Role.findOne({ name: 'Teacher Role', collegeId: req.teacher.collegeId });
      if (roleDoc && roleDoc.permissions) {
        permissions = roleDoc.permissions;
      }
    } else if (req.student) {
      userDetail = {
        _id: req.student._id,
        name: req.student.studentName,
        email: req.student.email,
        username: req.student.username,
        role: 'Student',
        department: req.student.branch,
        collegeName
      };
    }

    res.status(200).json({
      ...userDetail,
      permissions,
      isPremiumUnlocked: req.college ? (req.college.isPremiumUnlocked || false) : false,
      unlockedModules: req.college ? (req.college.unlockedModules || []) : []
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile info', error: error.message });
  }
};
