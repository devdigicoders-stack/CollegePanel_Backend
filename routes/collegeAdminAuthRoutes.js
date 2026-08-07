const express = require('express');
const router = express.Router();
const { loginCollegeAdmin, updateProfile, getMe } = require('../controllers/collegeAdminAuthController');
const { collegeProtect } = require('../middlewares/authMiddleware');

// @route   POST /api/college-admin/login
router.post('/login', loginCollegeAdmin);

// @route   GET /api/college-admin/me
router.get('/me', collegeProtect, getMe);

// @route   PUT /api/college-admin/profile
router.put('/profile', collegeProtect, updateProfile);

module.exports = router;
