const express = require('express');
const router = express.Router();
const leaveRequestController = require('../controllers/leaveRequestController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, leaveRequestController.getLeaveRequestStats);
router.get('/employees', collegeProtect, leaveRequestController.getEmployees);
router.get('/', collegeProtect, leaveRequestController.getLeaveRequests);
router.post('/', collegeProtect, leaveRequestController.createLeaveRequest);
router.get('/:id', collegeProtect, leaveRequestController.getLeaveRequestById);
router.put('/:id', collegeProtect, leaveRequestController.updateLeaveRequest);
router.put('/:id/approve', collegeProtect, leaveRequestController.approveLeaveRequest);
router.put('/:id/reject', collegeProtect, leaveRequestController.rejectLeaveRequest);
router.delete('/:id', collegeProtect, leaveRequestController.deleteLeaveRequest);

module.exports = router;