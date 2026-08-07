const express = require('express');
const router = express.Router();
const {
  getAdmissionsReport,
  getFinancialReport,
  getAcademicReport,
  getHRReport,
  getLibraryReport,
  getHostelReport,
  getSecurityReport,
  getStudentReports,
  getAdmissionReports
} = require('../controllers/reportController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

// Module-specific report endpoints
router.get('/admissions', getAdmissionsReport);
router.get('/financial', getFinancialReport);
router.get('/academic', getAcademicReport);
router.get('/hr', getHRReport);
router.get('/library', getLibraryReport);
router.get('/hostel', getHostelReport);
router.get('/security', getSecurityReport);

// Backward compatibility (superadmin routes)
router.get('/students', getStudentReports);

module.exports = router;
