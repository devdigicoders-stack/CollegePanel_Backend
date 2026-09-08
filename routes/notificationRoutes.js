const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/stats', collegeProtect, notificationController.getNotificationStats);
router.get('/', collegeProtect, notificationController.getNotifications);
router.post('/', collegeProtect, notificationController.createNotification);

// FCM Device Token & Real-time Live Notifications
router.post('/fcm-token', collegeProtect, notificationController.registerFCMToken);
router.get('/live', collegeProtect, notificationController.getLiveNotifications);
router.put('/live/mark-read', collegeProtect, notificationController.markLiveNotificationsRead);
router.post('/test-push', collegeProtect, notificationController.testPushNotification);

router.get('/:id', collegeProtect, notificationController.getNotificationById);
router.put('/:id', collegeProtect, notificationController.updateNotification);
router.delete('/:id', collegeProtect, notificationController.deleteNotification);

module.exports = router;