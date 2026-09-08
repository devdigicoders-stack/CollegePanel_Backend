const Notification = require('../models/Notification');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, audience, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (type && type !== 'All Types') filter.type = type;
    if (audience && audience !== 'All Audiences') filter.audience = audience;
    if (search && search !== '') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { publishedBy: { $regex: search, $options: 'i' } },
        { notificationId: { $regex: search, $options: 'i' } },
        { audience: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await Notification.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createNotification = async (req, res) => {
  try {
    const { notificationId, title, audience, type, publishedBy, dateOfPublishing, status } = req.body;
    const existing = await Notification.findOne({ notificationId });
    if (existing) {
      return res.status(400).json({ message: 'Notification ID already exists' });
    }
    const payload = {
      notificationId, title, audience, type: type || 'Announcement',
      publishedBy, dateOfPublishing,
      status: status || 'Draft',
      collegeId: req.college._id
    };
    const notification = await Notification.create(payload);
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification updated successfully', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNotificationStats = async (req, res) => {
  try {
    const { type } = req.query;
    const filter = collegeFilter(req);
    if (type && type !== 'All Types') filter.type = type;

    const total = await Notification.countDocuments(filter);
    const published = await Notification.countDocuments({ ...filter, status: 'Published' });
    const draft = await Notification.countDocuments({ ...filter, status: 'Draft' });

    res.json({
      data: { total, published, draft }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register FCM Device Token for Web Push Notifications
// @route   POST /api/notifications/fcm-token
// @access  Private (collegeProtect)
exports.registerFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ message: 'FCM Token is required' });
    }

    const College = require('../models/College');
    const Employee = require('../models/Employee');
    const Student = require('../models/Student');
    const Admission = require('../models/Admission');
    const Teacher = require('../models/Teacher');
    const { subscribeToTopic } = require('../config/firebase');

    const collegeId = req.college?._id;

    if (req.college && (req.userRole === 'college_admin' || !req.employee)) {
      await College.findByIdAndUpdate(collegeId, {
        $addToSet: { fcmTokens: token }
      });
    }
    
    if (req.employee) {
      await Employee.findByIdAndUpdate(req.employee._id, {
        $addToSet: { fcmTokens: token }
      });
    }

    if (req.teacher) {
      await Teacher.findByIdAndUpdate(req.teacher._id, {
        $addToSet: { fcmTokens: token }
      });
    }

    if (req.student) {
      await Student.findByIdAndUpdate(req.student._id, {
        $addToSet: { fcmTokens: token }
      });
      if (req.student.isApplicant) {
        await Admission.findByIdAndUpdate(req.student._id, {
          $addToSet: { fcmTokens: token }
        });
      }
    }

    // Automatically subscribe this device token to relevant topics
    if (collegeId) {
      try {
        await subscribeToTopic(token, `college_${collegeId}`);
        
        if (req.student) {
          // Student topics
          await subscribeToTopic(token, `college_${collegeId}_students`);
          await subscribeToTopic(token, `college_${collegeId}_student_${req.student._id}`);
          if (req.student.branch) {
            const cleanBranch = req.student.branch.toLowerCase().replace(/[^a-z0-9]/g, '_');
            await subscribeToTopic(token, `college_${collegeId}_branch_${cleanBranch}`);
          }
          console.log(`✅ Subscribed student device token to college_${collegeId}_students & student_${req.student._id}`);
        } else if (req.teacher) {
          // Teacher topics
          await subscribeToTopic(token, `college_${collegeId}_teachers`);
          console.log(`✅ Subscribed teacher device token to college_${collegeId}_teachers`);
        } else {
          // Admin / Staff admissions topic
          await subscribeToTopic(token, `college_${collegeId}_admissions`);
          console.log(`✅ Subscribed admin device token to college_${collegeId}_admissions`);
        }
      } catch (topicErr) {
        console.warn('⚠️ Could not subscribe token to topic:', topicErr.message);
      }
    }

    res.status(200).json({ success: true, message: 'FCM Token registered and subscribed successfully' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ message: 'Error registering FCM token', error: error.message });
  }
};

// @desc    Get live in-app notifications for Admin / Staff
// @route   GET /api/notifications/live
// @access  Private (collegeProtect)
exports.getLiveNotifications = async (req, res) => {
  try {
    const LiveNotification = require('../models/LiveNotification');
    const collegeId = req.college?._id;

    let query = { collegeId };
    if (req.userRole === 'college_admin' || req.userRole === 'Principal' || !req.employee) {
      query.$or = [
        { userId: 'admin' },
        { role: 'Admin' },
        { role: 'college_admin' },
        { userId: collegeId?.toString() }
      ];
    } else if (req.employee) {
      query.$or = [
        { userId: req.employee._id.toString() },
        { userId: 'admin' },
        { role: req.employee.role },
        { role: 'Admin' }
      ];
    } else if (req.teacher) {
      query.$or = [
        { userId: req.teacher._id.toString() },
        { role: 'Teacher' }
      ];
    } else if (req.student) {
      query.userId = req.student._id.toString();
    }

    const notifications = await LiveNotification.find(query)
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching live notifications', error: error.message });
  }
};

// @desc    Mark live notifications as read
// @route   PUT /api/notifications/live/mark-read
// @access  Private (collegeProtect)
exports.markLiveNotificationsRead = async (req, res) => {
  try {
    const LiveNotification = require('../models/LiveNotification');
    const collegeId = req.college?._id;
    const { id } = req.body || {};

    if (id) {
      await LiveNotification.updateOne({ _id: id, collegeId }, { $set: { isRead: true } });
      return res.status(200).json({ message: 'Notification marked as read' });
    }

    let query = { collegeId, isRead: false };
    if (req.userRole === 'college_admin' || req.userRole === 'Principal' || !req.employee) {
      query.$or = [
        { userId: 'admin' },
        { role: 'Admin' },
        { role: 'college_admin' },
        { userId: collegeId?.toString() }
      ];
    } else if (req.employee) {
      query.$or = [
        { userId: req.employee._id.toString() },
        { userId: 'admin' }
      ];
    } else if (req.teacher) {
      query.userId = req.teacher._id.toString();
    } else if (req.student) {
      query.userId = req.student._id.toString();
    }

    await LiveNotification.updateMany(query, { $set: { isRead: true } });
    res.status(200).json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notifications read', error: error.message });
  }
};

// @desc    Send test push notification to college
// @route   POST /api/notifications/test-push
// @access  Private (collegeProtect)
exports.testPushNotification = async (req, res) => {
  try {
    const { sendTopicPush } = require('../config/firebase');
    const collegeId = req.college?._id;

    const result = await sendTopicPush(`college_${collegeId}_admissions`, {
      title: '🔔 Test Notification from College ERP',
      body: 'Push notifications are working smoothly!',
      data: {
        link: '/admissions/applications',
        type: 'TEST'
      }
    });

    res.status(200).json({ success: true, message: 'Test push sent successfully', result });
  } catch (error) {
    res.status(500).json({ message: 'Error sending test push', error: error.message });
  }
};

