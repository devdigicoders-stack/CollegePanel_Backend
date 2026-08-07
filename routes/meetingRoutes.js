const express = require('express');
const router = express.Router();
const meetingController = require('../controllers/meetingController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, meetingController.getMeetingStats);
router.get('/', collegeProtect, meetingController.getMeetings);
router.post('/', collegeProtect, meetingController.createMeeting);
router.get('/:id', collegeProtect, meetingController.getMeetingById);
router.put('/:id', collegeProtect, meetingController.updateMeeting);
router.delete('/:id', collegeProtect, meetingController.deleteMeeting);

module.exports = router;