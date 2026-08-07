const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, notificationController.getNotificationStats);
router.get('/', collegeProtect, notificationController.getNotifications);
router.post('/', collegeProtect, notificationController.createNotification);
router.get('/:id', collegeProtect, notificationController.getNotificationById);
router.put('/:id', collegeProtect, notificationController.updateNotification);
router.delete('/:id', collegeProtect, notificationController.deleteNotification);

module.exports = router;