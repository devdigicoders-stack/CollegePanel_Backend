const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/sessions', collegeProtect, attendanceController.getSessions);
router.post('/sessions', collegeProtect, attendanceController.createSession);
router.delete('/sessions/:id', collegeProtect, attendanceController.deleteSession);
router.get('/sessions/:sessionId/records', collegeProtect, attendanceController.getRecordsBySession);
router.post('/sessions/:sessionId/records', collegeProtect, attendanceController.bulkCreateRecords);
router.put('/records/:id', collegeProtect, attendanceController.updateRecord);
router.delete('/records/:id', collegeProtect, attendanceController.deleteRecord);
router.get('/student/:studentId/records', collegeProtect, attendanceController.getRecordsByStudent);
router.get('/student/:studentId/stats', collegeProtect, attendanceController.getAttendanceStats);

// Faculty Attendance Routes
router.get('/faculty', collegeProtect, attendanceController.getFacultyAttendance);
router.post('/faculty', collegeProtect, attendanceController.saveFacultyAttendance);

module.exports = router;