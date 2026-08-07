const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/overview', collegeProtect, dashboardController.getOverview);

module.exports = router;
