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
router.get('/subjects', studentPortalController.getSubjects);
router.get('/timetable', studentPortalController.getTimetable);

router.get('/assignments', studentPortalController.getAssignments);
router.post('/assignments/submit', studentPortalController.submitAssignment);
router.get('/attendance', studentPortalController.getAttendance);

// Phase 2 Routes
router.get('/exams', studentPortalController.getExams);
router.get('/results', studentPortalController.getResults);
router.post('/results/:id/revaluation', studentPortalController.requestRevaluation);
router.get('/fees', studentPortalController.getFees);
router.post('/fees/pay', studentPortalController.simulateFeePayment);
router.get('/scholarships', studentPortalController.getScholarships);
router.post('/scholarships/apply', studentPortalController.applyScholarship);

// Phase 3 Routes
router.get('/library', studentPortalController.getLibraryDetails);
router.get('/hostel', studentPortalController.getHostelDetails);
router.post('/hostel/leaves', studentPortalController.applyHostelLeave);

// Phase 4 Routes
router.get('/complaints', studentPortalController.getComplaints);
router.post('/complaints', studentPortalController.createComplaint);
router.get('/leaves', studentPortalController.getLeaveRequests);
router.post('/leaves', studentPortalController.createLeaveRequest);
router.get('/placements', studentPortalController.getPlacements);
router.post('/placements/apply', studentPortalController.applyPlacement);
router.get('/study-materials', studentPortalController.getStudyMaterials);
router.get('/downloads', studentPortalController.getDownloads);

module.exports = router;
