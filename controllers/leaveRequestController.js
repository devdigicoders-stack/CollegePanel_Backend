const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const Teacher = require('../models/Teacher');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, department, leaveType, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (department && department !== 'All Departments') filter.department = department;
    if (leaveType && leaveType !== 'All Types') filter.leaveType = leaveType;
    if (search && search !== '') {
      filter.$or = [
        { applicantName: { $regex: search, $options: 'i' } },
        { requestId: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await LeaveRequest.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createLeaveRequest = async (req, res) => {
  try {
    const { requestId, employeeId, applicantName, applicantType, department, leaveType, fromDate, toDate, days, reason, attachments } = req.body;
    const existing = await LeaveRequest.findOne({ requestId });
    if (existing) {
      return res.status(400).json({ message: 'Request ID already exists' });
    }
    const payload = {
      requestId,
      employeeId,
      applicantName,
      applicantType,
      department,
      leaveType,
      fromDate,
      toDate,
      days,
      reason,
      attachments: attachments || [],
      status: 'Pending',
      collegeId: req.college._id
    };
    const leaveRequest = await LeaveRequest.create(payload);
    res.status(201).json(leaveRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveRequestById = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    res.json(leaveRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findOne({ _id: req.params.id, ...collegeFilter(req) });
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    leaveRequest.status = 'Approved';
    leaveRequest.approvedBy = req.body.approvedBy || 'Admin';
    leaveRequest.approvedDate = new Date();
    await leaveRequest.save();
    res.json({ message: 'Leave request approved successfully', leaveRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectLeaveRequest = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }
    const leaveRequest = await LeaveRequest.findOne({ _id: req.params.id, ...collegeFilter(req) });
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    leaveRequest.status = 'Rejected';
    leaveRequest.rejectedBy = req.body.rejectedBy || 'Admin';
    leaveRequest.rejectedDate = new Date();
    leaveRequest.rejectionReason = reason;
    await leaveRequest.save();
    res.json({ message: 'Leave request rejected', leaveRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    res.json({ message: 'Leave request updated successfully', leaveRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!leaveRequest) return res.status(404).json({ message: 'Leave request not found' });
    res.json({ message: 'Leave request deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLeaveRequestStats = async (req, res) => {
  try {
    const { department, leaveType } = req.query;
    const filter = collegeFilter(req);
    if (department && department !== 'All Departments') filter.department = department;
    if (leaveType && leaveType !== 'All Types') filter.leaveType = leaveType;

    const total = await LeaveRequest.countDocuments(filter);
    const pending = await LeaveRequest.countDocuments({ ...filter, status: 'Pending' });
    const approved = await LeaveRequest.countDocuments({ ...filter, status: 'Approved' });
    const rejected = await LeaveRequest.countDocuments({ ...filter, status: 'Rejected' });

    const byDepartment = await LeaveRequest.aggregate([
      { $match: filter },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byLeaveType = await LeaveRequest.aggregate([
      { $match: filter },
      { $group: { _id: '$leaveType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      data: { total, pending, approved, rejected, byDepartment, byLeaveType }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const [employees, teachers] = await Promise.all([
      Employee.find({ collegeId: req.college._id }).select('name empId department role'),
      Teacher.find({ collegeId: req.college._id }).select('name empId department designation')
    ]);

    const formattedTeachers = teachers.map(t => ({
      _id: t._id,
      name: t.name,
      empId: t.empId,
      department: t.department,
      role: t.designation || 'Teacher'
    }));

    const all = [...employees, ...formattedTeachers].sort((a, b) => a.name.localeCompare(b.name));
    res.json(all);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
