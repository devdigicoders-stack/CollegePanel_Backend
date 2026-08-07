const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, changePassword, getDashboardStats } = require('../controllers/superAdminController');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

router.post('/register', register);
router.post('/login', login);
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, upload.single('profileImage'), updateProfile);
router.put('/change-password', protect, changePassword);
router.get('/dashboard-stats', protect, getDashboardStats);

module.exports = router;
