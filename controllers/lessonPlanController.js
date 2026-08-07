const LessonPlan = require('../models/LessonPlan');
const Employee = require('../models/Employee');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getLessonPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, department, subject, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (department && department !== 'All Departments') filter.department = department;
    if (subject && subject !== 'All Subjects') filter.subject = subject;
    if (search && search !== '') {
      filter.$or = [
        { teacherName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { planId: { $regex: search, $options: 'i' } },
        { topic: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await LessonPlan.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await LessonPlan.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createLessonPlan = async (req, res) => {
  try {
    const { planId, teacherId, teacherName, department, subject, semester, section, week, month, topic, description, objectives, resources } = req.body;
    const existing = await LessonPlan.findOne({ planId });
    if (existing) {
      return res.status(400).json({ message: 'Lesson Plan ID already exists' });
    }
    const payload = {
      planId, teacherId, teacherName, department, subject, semester, section, week, month, topic,
      description, objectives: objectives || [], resources: resources || [],
      status: 'Pending', collegeId: req.college._id
    };
    const plan = await LessonPlan.create(payload);
    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLessonPlanById = async (req, res) => {
  try {
    const plan = await LessonPlan.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!plan) return res.status(404).json({ message: 'Lesson plan not found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateLessonPlan = async (req, res) => {
  try {
    const plan = await LessonPlan.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!plan) return res.status(404).json({ message: 'Lesson plan not found' });
    res.json({ message: 'Lesson plan updated successfully', plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.approveLessonPlan = async (req, res) => {
  try {
    const plan = await LessonPlan.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      { status: 'Approved', approvedDate: new Date(), approvedBy: req.college.name || 'Admin' },
      { returnDocument: 'after' }
    ).select('-__v');
    if (!plan) return res.status(404).json({ message: 'Lesson plan not found' });
    res.json({ message: 'Lesson plan approved successfully', plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.rejectLessonPlan = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const plan = await LessonPlan.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      { status: 'Rejected', rejectionReason: rejectionReason || '' },
      { returnDocument: 'after' }
    ).select('-__v');
    if (!plan) return res.status(404).json({ message: 'Lesson plan not found' });
    res.json({ message: 'Lesson plan rejected', plan });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteLessonPlan = async (req, res) => {
  try {
    const plan = await LessonPlan.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!plan) return res.status(404).json({ message: 'Lesson plan not found' });
    res.json({ message: 'Lesson plan deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getLessonPlanStats = async (req, res) => {
  try {
    const { department, subject } = req.query;
    const filter = collegeFilter(req);
    if (department && department !== 'All Departments') filter.department = department;
    if (subject && subject !== 'All Subjects') filter.subject = subject;

    const total = await LessonPlan.countDocuments(filter);
    const pending = await LessonPlan.countDocuments({ ...filter, status: 'Pending' });
    const submitted = await LessonPlan.countDocuments({ ...filter, status: 'Submitted' });
    const approved = await LessonPlan.countDocuments({ ...filter, status: 'Approved' });
    const rejected = await LessonPlan.countDocuments({ ...filter, status: 'Rejected' });

    const byDepartment = await LessonPlan.aggregate([
      { $match: filter },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const bySubject = await LessonPlan.aggregate([
      { $match: filter },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      data: {
        total, pending, submitted, approved, rejected,
        byDepartment, bySubject
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
