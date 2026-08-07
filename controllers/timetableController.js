const Timetable = require('../models/Timetable');
const Employee = require('../models/Employee');
const Teacher = require('../models/Teacher');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getTimetable = async (req, res) => {
  try {
    const { page = 1, limit = 50, day, course, semester, section, eventType, search } = req.query;
    const filter = collegeFilter(req);
    if (day && day !== 'All') filter.day = day;
    if (course && course !== 'All') filter.course = course;
    if (semester && semester !== 'All') filter.semester = semester;
    if (section && section !== 'All') filter.section = section;
    if (eventType && eventType !== 'All') filter.eventType = eventType;
    if (search && search !== '') {
      filter.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { teacherName: { $regex: search, $options: 'i' } },
        { roomNo: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const data = await Timetable.find(filter)
      .sort({ day: 1, timeSlot: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await Timetable.countDocuments(filter);
    res.json({ data, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTimetable = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    const entry = await Timetable.create(payload);
    res.status(201).json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTimetableById = async (req, res) => {
  try {
    const entry = await Timetable.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!entry) return res.status(404).json({ message: 'Timetable entry not found' });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTimetable = async (req, res) => {
  try {
    const entry = await Timetable.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!entry) return res.status(404).json({ message: 'Timetable entry not found' });
    res.json({ message: 'Timetable entry updated successfully', entry });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    const entry = await Timetable.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!entry) return res.status(404).json({ message: 'Timetable entry not found' });
    res.json({ message: 'Timetable entry deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTimetableByDay = async (req, res) => {
  try {
    const { day } = req.params;
    const { course, semester, section } = req.query;
    const filter = { day, ...collegeFilter(req) };
    if (course && course !== 'All') filter.course = course;
    if (semester && semester !== 'All') filter.semester = semester;
    if (section && section !== 'All') filter.section = section;
    const data = await Timetable.find(filter).sort({ timeSlot: 1 }).select('-__v');
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find({ collegeId: req.college._id })
      .select('name department designation')
      .sort({ name: 1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTimetableStats = async (req, res) => {
  try {
    const { course, semester, section } = req.query;
    const filter = collegeFilter(req);
    if (course && course !== 'All') filter.course = course;
    if (semester && semester !== 'All') filter.semester = semester;
    if (section && section !== 'All') filter.section = section;

    const total = await Timetable.countDocuments(filter);
    const classes = await Timetable.countDocuments({ ...filter, eventType: 'Class' });
    const meetings = await Timetable.countDocuments({ ...filter, eventType: 'Meeting' });
    const events = await Timetable.countDocuments({ ...filter, eventType: 'Event' });
    const labs = await Timetable.countDocuments({ ...filter, type: 'Lab' });
    const theories = await Timetable.countDocuments({ ...filter, type: 'Theory' });

    const byDay = await Timetable.aggregate([
      { $match: filter },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      data: {
        total,
        classes,
        meetings,
        events,
        labs,
        theories,
        byDay
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
