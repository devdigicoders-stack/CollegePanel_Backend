const express = require('express');
const router = express.Router();
const studentPortalController = require('../controllers/studentPortalController');
const { collegeProtect } = require('../middlewares/authMiddleware');
const Student = require('../models/Student');
const mongoose = require('mongoose');

router.use(collegeProtect);

// Middleware to inject a dummy student for admins previewing the student portal
router.use(async (req, res, next) => {
  if (!req.student) {
    try {
      const student = await Student.findOne({ collegeId: req.college._id });
      if (student) {
        req.student = student;
      } else {
        req.student = { 
          _id: new mongoose.Types.ObjectId('000000000000000000000001'), 
          name: 'Demo Student', 
          course: 'Demo Course',
          branch: 'Demo Branch'
        };
      }
    } catch (error) {
      console.error('Error mocking student:', error);
    }
  }
  next();
});

// Phase 1 Routes
router.get('/profile', studentPortalController.getProfile);
router.put('/profile', studentPortalController.updateProfile);
router.get('/dashboard/stats', studentPortalController.getDashboardStats);

router.get('/assignments', studentPortalController.getAssignments);
router.post('/assignments/submit', studentPortalController.submitAssignment);

router.post('/attendance/mark-auto', studentPortalController.markAutoAttendance);

// Phase 3 Routes
router.get('/hostel', collegeProtect, studentPortalController.getHostelDetails);
router.post('/hostel/leave', collegeProtect, studentPortalController.applyHostelLeave);

router.route('/live-notifications')
  .get(collegeProtect, studentPortalController.getLiveNotifications)
  .put(collegeProtect, studentPortalController.markNotificationsRead);

// Phase 4 Routes
router.get('/complaints', studentPortalController.getComplaints);
router.post('/complaints', studentPortalController.createComplaint);
router.get('/placements', studentPortalController.getPlacements);
router.post('/placements/apply', studentPortalController.applyPlacement);
router.get('/study-materials', studentPortalController.getStudyMaterials);
router.get('/downloads', studentPortalController.getDownloads);

module.exports = router;
