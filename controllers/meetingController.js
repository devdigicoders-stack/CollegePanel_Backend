const Meeting = require('../models/Meeting');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getMeetings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type, department, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (type && type !== 'All Types') filter.type = type;
    if (department && department !== 'All Departments') filter.department = department;
    if (search && search !== '') {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { organizer: { $regex: search, $options: 'i' } },
        { meetingId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await Meeting.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await Meeting.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createMeeting = async (req, res) => {
  try {
    const { meetingId, title, type, date, time, duration, location, department, organizer, agenda, attendees } = req.body;
    const existing = await Meeting.findOne({ meetingId });
    if (existing) {
      return res.status(400).json({ message: 'Meeting ID already exists' });
    }
    const payload = {
      meetingId, title, type, date, time, duration, location, department, organizer, agenda,
      attendees: attendees || 0,
      status: 'Upcoming',
      collegeId: req.college._id
    };
    const meeting = await Meeting.create(payload);
    res.status(201).json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMeetingById = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json({ message: 'Meeting updated successfully', meeting });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
    res.json({ message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMeetingStats = async (req, res) => {
  try {
    const { department, type } = req.query;
    const filter = collegeFilter(req);
    if (department && department !== 'All Departments') filter.department = department;
    if (type && type !== 'All Types') filter.type = type;

    const total = await Meeting.countDocuments(filter);
    const upcoming = await Meeting.countDocuments({ ...filter, status: 'Upcoming' });
    const completed = await Meeting.countDocuments({ ...filter, status: 'Completed' });
    const cancelled = await Meeting.countDocuments({ ...filter, status: 'Cancelled' });

    res.json({
      data: { total, upcoming, completed, cancelled }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
