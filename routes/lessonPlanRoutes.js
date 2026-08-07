const express = require('express');
const router = express.Router();
const lessonPlanController = require('../controllers/lessonPlanController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, lessonPlanController.getLessonPlanStats);
router.get('/', collegeProtect, lessonPlanController.getLessonPlans);
router.post('/', collegeProtect, lessonPlanController.createLessonPlan);
router.get('/:id', collegeProtect, lessonPlanController.getLessonPlanById);
router.put('/:id', collegeProtect, lessonPlanController.updateLessonPlan);
router.post('/:id/approve', collegeProtect, lessonPlanController.approveLessonPlan);
router.post('/:id/reject', collegeProtect, lessonPlanController.rejectLessonPlan);
router.delete('/:id', collegeProtect, lessonPlanController.deleteLessonPlan);

module.exports = router;