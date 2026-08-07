const mongoose = require('mongoose');
const Examination = require('../models/Examination');
const ExamResult = require('../models/ExamResult');
const Student = require('../models/Student');

const collegeFilter = (req) => ({ collegeId: req.college._id });

exports.getExams = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, course, search } = req.query;
    const filter = collegeFilter(req);
    if (status && status !== 'All') filter.status = status;
    if (course && course !== 'All') filter.course = course;
    if (search && search !== '') {
      filter.$or = [
        { examName: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { course: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const exams = await Examination.find(filter)
      .sort({ date: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await Examination.countDocuments(filter);
    res.json({ data: exams, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createExam = async (req, res) => {
  try {
    const { examName, course, subject, semester, date, startTime, endTime, totalMarks, passingMarks, status } = req.body;
    
    // Calculate total enrolled students for this course
    const Student = require('../models/Student');
    const totalStudents = await Student.countDocuments({
      collegeId: req.college._id,
      status: 'Active',
      $or: [
        { course: course },
        { branch: course }
      ]
    });

    const payload = { 
      examName, course, subject, semester, date, startTime, endTime, 
      totalMarks: totalMarks || 100, 
      passingMarks: passingMarks || 40, 
      status: status || 'Upcoming',
      totalStudents,
      collegeId: req.college._id 
    };
    const exam = await Examination.create(payload);
    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const exam = await Examination.findOne({ _id: req.params.id, ...collegeFilter(req) }).select('-__v');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const exam = await Examination.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after', runValidators: true }
    ).select('-__v');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    res.json({ message: 'Exam updated successfully', exam });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const exam = await Examination.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });
    await ExamResult.deleteMany({ examId: req.params.id });
    res.json({ message: 'Exam and results deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const { page = 1, limit = 10, status, search } = req.query;
    const filter = { examId, ...collegeFilter(req) };
    if (status && status !== 'All') filter.status = status;
    if (search && search !== '') {
      filter.$or = [
        { studentName: { $regex: search, $options: 'i' } },
        { rollNo: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const results = await ExamResult.find(filter)
      .sort({ rollNo: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');
    const total = await ExamResult.countDocuments(filter);
    res.json({ data: results, total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.bulkCreateResults = async (req, res) => {
  try {
    const { examId, results } = req.body;
    if (!examId || !Array.isArray(results)) {
      return res.status(400).json({ message: 'examId and results array are required' });
    }
    const exam = await Examination.findOne({ _id: examId, ...collegeFilter(req) });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    await ExamResult.deleteMany({ examId });

    const createdResults = await ExamResult.insertMany(
      results.map(r => ({
        examId,
        studentId: r.studentId,
        rollNo: r.rollNo,
        studentName: r.studentName,
        course: r.course,
        theoryMarks: r.theoryMarks || 0,
        practicalMarks: r.practicalMarks || 0,
        totalMarks: (r.theoryMarks || 0) + (r.practicalMarks || 0),
        grade: r.grade || '',
        status: r.status || 'Pending',
        collegeId: req.college._id
      }))
    );

    const passCount = createdResults.filter(r => r.status === 'Pass').length;
    const failCount = createdResults.filter(r => r.status === 'Fail').length;
    const pendingCount = createdResults.filter(r => r.status === 'Pending').length;

    exam.totalStudents = createdResults.length;
    await exam.save();

    res.status(201).json({ data: createdResults, summary: { passCount, failCount, pendingCount, total: createdResults.length } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateResult = async (req, res) => {
  try {
    const result = await ExamResult.findOneAndUpdate(
      { _id: req.params.id, ...collegeFilter(req) },
      req.body,
      { returnDocument: 'after' }
    ).select('-__v');
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json({ message: 'Result updated successfully', result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteResult = async (req, res) => {
  try {
    const result = await ExamResult.findOneAndDelete({ _id: req.params.id, ...collegeFilter(req) });
    if (!result) return res.status(404).json({ message: 'Result not found' });
    res.json({ message: 'Result deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getExamStats = async (req, res) => {
  try {
    const { examId } = req.params;
    const stats = await ExamResult.aggregate([
      { $match: { examId: mongoose.Types.ObjectId(examId), ...collegeFilter(req) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const result = { Pass: 0, Fail: 0, Pending: 0 };
    stats.forEach(s => { result[s._id] = s.count; });
    const total = result.Pass + result.Fail + result.Pending;
    const avgTotal = await ExamResult.aggregate([
      { $match: { examId: mongoose.Types.ObjectId(examId), ...collegeFilter(req), status: 'Pass' } },
      { $group: { _id: null, avgTotal: { $avg: '$totalMarks' } } }
    ]);
    res.json({ data: { ...result, total, average: avgTotal[0]?.avgTotal || 0 } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdmitCards = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Examination.findById(examId).select('-__v');
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const totalStudents = exam.totalStudents || 0;
    const generated = await ExamResult.countDocuments({ examId, collegeId: req.college._id });
    const pending = totalStudents - generated;

    res.json({
      exam: exam.examName,
      course: exam.course,
      totalStudents,
      generated,
      pending: Math.max(0, pending),
      status: pending === 0 ? 'Completed' : 'Pending'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getQuestionPapers = async (req, res) => {
  try {
    const exams = await Examination.find(collegeFilter(req)).select('examName course subject date status createdAt').sort({ date: 1 });
    const papers = exams.map(exam => ({
      examId: exam._id,
      exam: exam.examName,
      course: exam.course,
      subject: exam.subject,
      submitted: exam.status === 'Completed',
      submittedDate: exam.status === 'Completed' && exam.createdAt ? exam.createdAt.toISOString().split('T')[0] : null,
      status: exam.status === 'Completed' ? 'Submitted' : 'Pending'
    }));
    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const exams = await Examination.find(collegeFilter(req));
    const upcoming = exams.filter(e => e.status === 'Upcoming').length;
    const ongoing = exams.filter(e => e.status === 'Ongoing').length;

    const allResults = await ExamResult.find({ ...collegeFilter(req) });
    const totalRegistered = allResults.length;
    const eligible = allResults.filter(r => r.status === 'Pass' || r.status === 'Fail').length;
    const pendingAdmit = allResults.filter(r => r.status === 'Pending').length;
    const pendingMarks = allResults.filter(r => r.status === 'Pending').length;
    const resultPending = allResults.filter(r => r.status === 'Pending').length;
    const revaluationRequests = allResults.filter(r => r.revaluationRequested).length;
    const backPaperStudents = allResults.filter(r => r.status === 'Fail').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayExams = exams.filter(e => e.date >= today && e.date <= todayEnd && e.status === 'Ongoing').length;

    const invigilatorShortage = exams
      .filter(e => e.status === 'Upcoming')
      .map(e => ({
        exam: e.examName,
        date: e.date.toISOString().split('T')[0],
        requiredInvigilators: Math.ceil((e.totalStudents || 0) / 30),
        assignedInvigilators: Math.floor((e.totalStudents || 0) / 40),
        shortage: Math.max(0, Math.ceil((e.totalStudents || 0) / 30) - Math.floor((e.totalStudents || 0) / 40))
      }))
      .filter(i => i.shortage > 0);

    res.json({
      data: {
        upcoming,
        ongoing,
        totalRegistered,
        eligible,
        pendingAdmit,
        pendingMarks,
        resultPending,
        revaluationRequests,
        backPaperStudents,
        todayExams,
        invigilatorShortage: invigilatorShortage.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFailedResults = async (req, res) => {
  try {
    const failedResults = await ExamResult.find({ status: 'Fail', ...collegeFilter(req) })
      .sort({ studentName: 1 })
      .select('-__v');
    res.json(failedResults);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.generateAdmitCards = async (req, res) => {
  try {
    const { examId } = req.params;
    const exam = await Examination.findOne({ _id: examId, ...collegeFilter(req) });
    if (!exam) return res.status(404).json({ message: 'Exam not found' });

    const students = await Student.find({
      course: exam.course,
      collegeId: req.college._id
    });

    if (students.length === 0) {
      return res.status(400).json({ message: `No students found enrolled in course "${exam.course}" to generate admit cards.` });
    }

    let createdCount = 0;
    for (const student of students) {
      const existing = await ExamResult.findOne({
        examId,
        studentId: student._id,
        collegeId: req.college._id
      });
      if (!existing) {
        await ExamResult.create({
          examId,
          studentId: student._id,
          rollNo: student.studentId || '',
          studentName: student.studentName || 'Student',
          course: exam.course,
          theoryMarks: 0,
          practicalMarks: 0,
          totalMarks: 0,
          grade: '',
          status: 'Pending',
          collegeId: req.college._id
        });
        createdCount++;
      }
    }

    const totalGenerated = await ExamResult.countDocuments({ examId, collegeId: req.college._id });
    exam.totalStudents = totalGenerated;
    await exam.save();

    res.json({ message: `Admit cards generated successfully! Registered ${createdCount} students.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
