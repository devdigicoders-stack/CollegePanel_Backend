const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, complaintController.getComplaintStats);
router.get('/', collegeProtect, complaintController.getComplaints);
router.post('/', collegeProtect, complaintController.createComplaint);
router.get('/:id', collegeProtect, complaintController.getComplaintById);
router.put('/:id', collegeProtect, complaintController.updateComplaint);
router.delete('/:id', collegeProtect, complaintController.deleteComplaint);

module.exports = router;