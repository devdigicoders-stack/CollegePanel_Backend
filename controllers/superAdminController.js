const SuperAdmin = require('../models/SuperAdmin');
const College = require('../models/College');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Employee = require('../models/Employee');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret123', {
    expiresIn: '30d',
  });
};

// @desc    Register a new super admin
// @route   POST /api/superadmin/register
// @access  Public (Can be restricted later)
exports.register = async (req, res) => {
  try {
    const { name, email, password, mobile } = req.body;

    const superAdminExists = await SuperAdmin.findOne({ email });

    if (superAdminExists) {
      return res.status(400).json({ message: 'SuperAdmin already exists' });
    }

    const superAdmin = await SuperAdmin.create({
      name: name || 'Super Admin',
      email,
      password,
      mobile: mobile || '',
      profileImage: ''
    });

    if (superAdmin) {
      res.status(201).json({
        _id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        profileImage: superAdmin.profileImage,
        token: generateToken(superAdmin._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid superadmin data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Auth superadmin & get token
// @route   POST /api/superadmin/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const superAdmin = await SuperAdmin.findOne({ email });

    if (superAdmin && (await superAdmin.matchPassword(password))) {
      res.json({
        _id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        mobile: superAdmin.mobile,
        profileImage: superAdmin.profileImage,
        token: generateToken(superAdmin._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get superadmin profile
// @route   GET /api/superadmin/profile
// @access  Private/SuperAdmin
exports.getProfile = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.superAdmin._id);

    if (superAdmin) {
      res.json({
        _id: superAdmin._id,
        name: superAdmin.name,
        email: superAdmin.email,
        mobile: superAdmin.mobile,
        profileImage: superAdmin.profileImage,
      });
    } else {
      res.status(404).json({ message: 'SuperAdmin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update superadmin profile
// @route   PUT /api/superadmin/profile
// @access  Private/SuperAdmin
exports.updateProfile = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.superAdmin._id);

    if (superAdmin) {
      superAdmin.name = req.body.name || superAdmin.name;
      superAdmin.email = req.body.email || superAdmin.email;
      superAdmin.mobile = req.body.mobile || superAdmin.mobile;

      if (req.file) {
        superAdmin.profileImage = `/uploads/${req.file.filename}`;
      }

      const updatedSuperAdmin = await superAdmin.save();

      res.json({
        _id: updatedSuperAdmin._id,
        name: updatedSuperAdmin.name,
        email: updatedSuperAdmin.email,
        mobile: updatedSuperAdmin.mobile,
        profileImage: updatedSuperAdmin.profileImage,
        token: generateToken(updatedSuperAdmin._id),
      });
    } else {
      res.status(404).json({ message: 'SuperAdmin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Change Password
// @route   PUT /api/superadmin/change-password
// @access  Private/SuperAdmin
exports.changePassword = async (req, res) => {
  try {
    const superAdmin = await SuperAdmin.findById(req.superAdmin._id);
    const { currentPassword, newPassword } = req.body;

    if (superAdmin) {
      if (await superAdmin.matchPassword(currentPassword)) {
        superAdmin.password = newPassword;
        await superAdmin.save();
        res.json({ message: 'Password updated successfully' });
      } else {
        res.status(400).json({ message: 'Incorrect current password' });
      }
    } else {
      res.status(404).json({ message: 'SuperAdmin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/superadmin/dashboard-stats
// @access  Private/SuperAdmin
exports.getDashboardStats = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const [
      totalColleges,
      activeColleges,
      inactiveColleges,
      totalAdmins,
      totalStudents,
      totalTeachers,
      totalEmployees,
      monthlyRegistrations,
      collegeWiseStudents,
      monthlyAdmissions
    ] = await Promise.all([
      College.countDocuments(),
      College.countDocuments({ isActive: true }),
      College.countDocuments({ isActive: false }),
      SuperAdmin.countDocuments(),
      Student.countDocuments(),
      Teacher.countDocuments(),
      Employee.countDocuments(),
      
      // Monthly College Registration for the selected year
      College.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01`),
              $lt: new Date(`${year + 1}-01-01`)
            }
          }
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),

      // College-wise Student Count
      Student.aggregate([
        {
          $group: {
            _id: "$collegeId",
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'colleges',
            localField: '_id',
            foreignField: '_id',
            as: 'college'
          }
        },
        { $unwind: "$college" },
        {
          $project: {
            _id: 0,
            collegeName: "$college.collegeName",
            count: 1
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 } // Limit to top 10 colleges for the chart
      ]),

      // Monthly Admission Growth (using createdAt)
      Student.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(`${year}-01-01`),
              $lt: new Date(`${year + 1}-01-01`)
            }
          }
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Format monthly data into arrays of size 12 [Jan, Feb, ... Dec]
    const formatMonthlyData = (data) => {
      const result = new Array(12).fill(0);
      data.forEach(item => {
        result[item._id - 1] = item.count;
      });
      return result;
    };

    res.json({
      stats: {
        totalColleges,
        activeColleges,
        inactiveColleges,
        totalAdmins,
        totalStudents,
        totalTeachers,
        totalEmployees
      },
      charts: {
        monthlyRegistrations: formatMonthlyData(monthlyRegistrations),
        collegeWiseStudents: {
          categories: collegeWiseStudents.map(c => c.collegeName),
          data: collegeWiseStudents.map(c => c.count)
        },
        monthlyAdmissions: formatMonthlyData(monthlyAdmissions)
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats', error: error.message });
  }
};
