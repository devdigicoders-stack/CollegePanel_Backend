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
