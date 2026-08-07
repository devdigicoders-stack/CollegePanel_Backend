const Complaint = require('../models/Complaint');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, priority, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (category && category !== 'All') filter.category = category;
    if (priority && priority !== 'All') filter.priority = priority;
    if (search && search !== '') {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { submittedBy: { $regex: search, $options: 'i' } },
        { complaintId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await Complaint.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createComplaint = async (req, res) => {
  try {
    const { complaintId, subject, category, submittedBy, submittedById, description, priority } = req.body;
    const existing = await Complaint.findOne({ complaintId });
    if (existing) {
      return res.status(400).json({ message: 'Complaint ID already exists' });
    }
    const payload = {
      complaintId, subject, category, submittedBy, submittedById,
      description, priority: priority || 'Medium',
      status: 'Pending',
      collegeId: req.college._id
    };
    const complaint = await Complaint.create(payload);
    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { new: true, runValidators: true }
    ).select('-__v');
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ message: 'Complaint updated successfully', complaint });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getComplaintStats = async (req, res) => {
  try {
    const filter = collegeFilter(req);
    const total = await Complaint.countDocuments(filter);
    const pending = await Complaint.countDocuments({ ...filter, status: 'Pending' });
    const inProgress = await Complaint.countDocuments({ ...filter, status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ ...filter, status: 'Resolved' });
    const rejected = await Complaint.countDocuments({ ...filter, status: 'Rejected' });
    res.json({ data: { total, pending, inProgress, resolved, rejected } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
