const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, timetableController.getTimetableStats);
router.get('/teachers', collegeProtect, timetableController.getTeachers);
router.get('/', collegeProtect, timetableController.getTimetable);
router.post('/', collegeProtect, timetableController.createTimetable);
router.get('/:id', collegeProtect, timetableController.getTimetableById);
router.put('/:id', collegeProtect, timetableController.updateTimetable);
router.delete('/:id', collegeProtect, timetableController.deleteTimetable);
router.get('/day/:day', collegeProtect, timetableController.getTimetableByDay);

module.exports = router;