const express = require('express');
const router = express.Router();
const {
  getAdmissionsReport,
  getAcademicReport,
  getHRReport,
  getLibraryReport,
  getHostelReport,
  getSecurityReport,
  getStudentReports,
  getAdmissionReports
} = require('../controllers/reportController');
const { collegeProtect, protect } = require('../middlewares/authMiddleware');

// Backward compatibility (superadmin routes) - these must come before router.use(collegeProtect)
router.get('/students', protect, getStudentReports);
router.get('/admissions-super', protect, getAdmissionReports); // If needed, but wait! The frontend calls /admissions.

router.use(collegeProtect);

// Module-specific report endpoints
router.get('/admissions', getAdmissionsReport);
router.get('/academic', getAcademicReport);
router.get('/hr', getHRReport);
router.get('/library', getLibraryReport);
router.get('/hostel', getHostelReport);
router.get('/security', getSecurityReport);

module.exports = router;
