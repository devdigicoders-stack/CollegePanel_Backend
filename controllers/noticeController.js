const Notice = require('../models/Notice');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getNotices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, targetAudience, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (targetAudience && targetAudience !== 'All Audiences') filter.targetAudience = targetAudience;
    if (search && search !== '') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { postedBy: { $regex: search, $options: 'i' } },
        { noticeId: { $regex: search, $options: 'i' } },
        { targetAudience: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await Notice.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await Notice.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createNotice = async (req, res) => {
  try {
    const { noticeId, title, targetAudience, postedBy, postedByRole, department, dateOfPublishing, details, status } = req.body;
    const existing = await Notice.findOne({ noticeId });
    if (existing) {
      return res.status(400).json({ message: 'Notice ID already exists' });
    }
    const attachments = req.files ? req.files.map(file => `/uploads/notices/${file.filename}`) : [];
    
    const payload = {
      noticeId, title, targetAudience, postedBy, postedByRole, department,
      dateOfPublishing, details,
      status: status || 'Draft',
      attachments,
      collegeId: req.college._id
    };
    const notice = await Notice.create(payload);
    res.status(201).json(notice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNoticeById = async (req, res) => {
  try {
    const notice = await Notice.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateNotice = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (req.files && req.files.length > 0) {
      const newAttachments = req.files.map(file => `/uploads/notices/${file.filename}`);
      // Simple replace for now
      payload.attachments = newAttachments;
    }
    
    const notice = await Notice.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      payload,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json({ message: 'Notice updated successfully', notice });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getNoticeStats = async (req, res) => {
  try {
    const { targetAudience } = req.query;
    const filter = collegeFilter(req);
    if (targetAudience && targetAudience !== 'All Audiences') filter.targetAudience = targetAudience;

    const total = await Notice.countDocuments(filter);
    const published = await Notice.countDocuments({ ...filter, status: 'Published' });
    const draft = await Notice.countDocuments({ ...filter, status: 'Draft' });

    res.json({
      data: { total, published, draft }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
