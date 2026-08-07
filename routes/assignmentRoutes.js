const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, assignmentController.getAssignmentStats);
router.get('/teachers', collegeProtect, assignmentController.getTeachers);
router.get('/', collegeProtect, assignmentController.getAssignments);
router.post('/', collegeProtect, assignmentController.createAssignment);

// Static/Sub-routes MUST come before /:id
router.put('/submissions/:id', collegeProtect, assignmentController.updateSubmission);
router.get('/:assignmentId/submissions', collegeProtect, assignmentController.getAssignmentSubmissions);

// Dynamic routes
router.get('/:id', collegeProtect, assignmentController.getAssignmentById);
router.put('/:id', collegeProtect, assignmentController.updateAssignment);
router.delete('/:id', collegeProtect, assignmentController.deleteAssignment);

module.exports = router;