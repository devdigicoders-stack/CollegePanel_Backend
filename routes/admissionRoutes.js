const express = require('express');
const router = express.Router();
const { 
  getAdmissions, 
  getAdmissionById,
  createAdmission,
  updateAdmission,
  deleteAdmission,
  getDashboardStats,
  updateDocumentStatus,
  registerStudent,
  createPublicAdmission,
  getPublicFormOptions
} = require('../controllers/admissionController');
const { collegeProtect } = require('../middlewares/authMiddleware');

// Public route for students to submit applications
router.post('/public/:collegeId', createPublicAdmission);
router.get('/public/:collegeId/form-options', getPublicFormOptions);

router.get('/dashboard-stats', collegeProtect, getDashboardStats);

router.route('/')
  .get(collegeProtect, getAdmissions)
  .post(collegeProtect, createAdmission);

router.route('/:id')
  .get(collegeProtect, getAdmissionById)
  .put(collegeProtect, updateAdmission)
  .delete(collegeProtect, deleteAdmission);

router.put('/:id/documents/:docId', collegeProtect, updateDocumentStatus);
router.put('/:id/register', collegeProtect, registerStudent);

module.exports = router;
