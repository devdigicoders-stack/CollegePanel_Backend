const express = require('express');
const router = express.Router();
const { collegeProtect } = require('../middlewares/authMiddleware');
const {
  punchIn,
  punchOut,
  getMyPunchHistory,
  getTodayStatus,
  getAllPunchLogs,
  getMonthlyReport
} = require('../controllers/punchController');

router.use(collegeProtect);

router.get('/reports/monthly', getMonthlyReport);
router.post('/in', punchIn);
router.post('/out', punchOut);
router.get('/my-history', getMyPunchHistory);
router.get('/today', getTodayStatus);
router.get('/all-logs', getAllPunchLogs);

module.exports = router;
