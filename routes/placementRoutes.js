const express = require('express');
const router = express.Router();
const placementController = require('../controllers/placementController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

// Dashboard
router.get('/dashboard-stats', placementController.getDashboardStats);

// Companies
router.get('/companies', placementController.getCompanies);
router.post('/companies', placementController.addCompany);
router.put('/companies/:id', placementController.updateCompany);
router.delete('/companies/:id', placementController.deleteCompany);

// Jobs
router.get('/jobs', placementController.getJobs);
router.post('/jobs', placementController.addJob);
router.put('/jobs/:id', placementController.updateJob);
router.delete('/jobs/:id', placementController.deleteJob);

// Applications
router.get('/applications', placementController.getApplications);
router.put('/applications/:id/status', placementController.updateApplicationStatus);

module.exports = router;
