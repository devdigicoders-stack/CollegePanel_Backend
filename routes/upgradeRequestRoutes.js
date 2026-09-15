const express = require('express');
const router = express.Router();
const {
  createUpgradeRequest,
  getAllUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
  lockUpgradeRequest,
  toggleCollegeModule
} = require('../controllers/upgradeRequestController');
const { protect, collegeProtect } = require('../middlewares/authMiddleware');

// ── Admin Route: Submit request for a module upgrade ──
router.post('/', collegeProtect, createUpgradeRequest);

// ── Superadmin Routes: View and Approve/Reject/Lock upgrade requests ──
router.get('/superadmin', protect, getAllUpgradeRequests);
router.patch('/superadmin/:id/approve', protect, approveUpgradeRequest);
router.patch('/superadmin/:id/reject', protect, rejectUpgradeRequest);
router.patch('/superadmin/:id/lock', protect, lockUpgradeRequest);
router.patch('/superadmin/college/:collegeId/toggle-module', protect, toggleCollegeModule);

module.exports = router;
