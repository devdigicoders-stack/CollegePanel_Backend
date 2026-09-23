const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getAllEnquiries,
  getEnquiryStats,
  updateEnquiryStatus,
  deleteEnquiry
} = require('../controllers/enquiryController');
const { protect } = require('../middlewares/authMiddleware');

// Public route for website submission
router.post('/', createEnquiry);

// Protected routes for SuperAdmin
router.get('/', protect, getAllEnquiries);
router.get('/stats', protect, getEnquiryStats);
router.patch('/:id/status', protect, updateEnquiryStatus);
router.delete('/:id', protect, deleteEnquiry);

module.exports = router;
