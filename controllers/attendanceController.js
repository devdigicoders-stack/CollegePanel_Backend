const AttendanceSession = require('../models/AttendanceSession');
const AttendanceRecord = require('../models/AttendanceRecord');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const FacultyAttendance = require('../models/FacultyAttendance');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getSessions = async (req, res) => {
  try {
    const { startDate, endDate, className, subject } = req.query;
    const filter = collegeFilter(req);
    if (className) filter.className = className;
    if (subject) filter.subject = subject;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const data = await AttendanceSession.find(filter).sort({ date: -1 }).populate('teacherId', 'name');
    res.json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSession = async (req, res) => {
  try {
    const payload = { ...req.body, collegeId: req.college._id };
    const session = await AttendanceSession.create(payload);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecordsBySession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const records = await AttendanceRecord.find({ sessionId, ...collegeFilter(req) }).sort({ rollNo: 1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecordsByStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;
    const filter = { studentId, ...collegeFilter(req) };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const records = await AttendanceRecord.find(filter).populate('sessionId', 'className subject date').sort({ date: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.bulkCreateRecords = async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.params.sessionId;
    const { records } = req.body;
    if (!sessionId || !Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'sessionId and records array are required' });
    }
    const session = await AttendanceSession.findOne({ _id: sessionId, ...collegeFilter(req) });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const existingRecords = await AttendanceRecord.deleteMany({ sessionId });
    const createdRecords = await AttendanceRecord.insertMany(
      records.map(r => ({
        sessionId,
        studentId: r.studentId,
        rollNo: r.rollNo,
        studentName: r.studentName,
        status: r.status,
        remarks: r.remarks || '',
        collegeId: req.college._id
      }))
    );

    const presentCount = createdRecords.filter(r => r.status === 'Present').length;
    const absentCount = createdRecords.filter(r => r.status === 'Absent').length;
    const lateCount = createdRecords.filter(r => r.status === 'Late').length;

    session.present = presentCount;
    session.absent = absentCount;
    session.late = lateCount;
    session.total = createdRecords.length;
    await session.save();

    res.status(201).json({ success: true, data: createdRecords, summary: { presentCount, absentCount, lateCount, total: createdRecords.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const item = await AttendanceRecord.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after' }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const item = await AttendanceRecord.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!item) return res.status(404).json({ success: false, message: 'Attendance record not found' });
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    await AttendanceRecord.deleteMany({ sessionId: req.params.id });
    res.json({ success: true, message: 'Session and records deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { studentId, startDate, endDate } = req.query;
    const filter = { studentId, ...collegeFilter(req) };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); filter.date.$lte = end; }
    }
    const stats = await AttendanceRecord.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const result = { Present: 0, Absent: 0, Late: 0 };
    stats.forEach(s => { result[s._id] = s.count; });
    const total = result.Present + result.Absent + result.Late;
    res.json({ success: true, data: { ...result, total } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFacultyAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ success: false, message: 'Date query param is required' });
    const collegeId = req.college._id;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const record = await FacultyAttendance.findOne({
      collegeId,
      date: { $gte: targetDate, $lt: nextDate }
    });

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.saveFacultyAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    if (!date || !records) return res.status(400).json({ success: false, message: 'Date and records are required' });
    const collegeId = req.college._id;

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const updated = await FacultyAttendance.findOneAndUpdate(
      { collegeId, date: { $gte: targetDate, $lt: nextDate } },
      { date: targetDate, records, collegeId },
      { new: true, upsert: true }
    );

    res.status(200).json({ success: true, message: 'Faculty attendance saved successfully', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
