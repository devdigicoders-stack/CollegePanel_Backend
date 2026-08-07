const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/dashboard/stats', collegeProtect, examController.getDashboardStats);
router.get('/question-papers', collegeProtect, examController.getQuestionPapers);
router.get('/results/failed', collegeProtect, examController.getFailedResults);
router.get('/', collegeProtect, examController.getExams);
router.post('/', collegeProtect, examController.createExam);
router.get('/:examId/results', collegeProtect, examController.getExamResults);
router.post('/:examId/results', collegeProtect, examController.bulkCreateResults);
router.get('/:examId/stats', collegeProtect, examController.getExamStats);
router.get('/:examId/admit-card', collegeProtect, examController.getAdmitCards);
router.post('/:examId/admit-card', collegeProtect, examController.generateAdmitCards);
router.put('/results/:id', collegeProtect, examController.updateResult);
router.delete('/results/:id', collegeProtect, examController.deleteResult);
router.get('/:id', collegeProtect, examController.getExamById);
router.put('/:id', collegeProtect, examController.updateExam);
router.delete('/:id', collegeProtect, examController.deleteExam);

module.exports = router;