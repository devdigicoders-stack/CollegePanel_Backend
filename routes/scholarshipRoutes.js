const express = require('express');
const router = express.Router();
const scholarshipController = require('../controllers/scholarshipController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

// Dashboard
router.get('/dashboard/stats', scholarshipController.getDashboardStats);

// Schemes
router.get('/schemes', scholarshipController.getSchemes);
router.post('/schemes', scholarshipController.addScheme);
router.put('/schemes/:id', scholarshipController.updateScheme);
router.delete('/schemes/:id', scholarshipController.deleteScheme);

// Applications
router.get('/applications', scholarshipController.getApplications);
router.post('/applications', scholarshipController.addApplication);
router.put('/applications/:id/status', scholarshipController.updateApplicationStatus);

module.exports = router;
