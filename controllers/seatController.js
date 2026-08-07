const SeatConfig = require('../models/SeatConfig');
const Admission = require('../models/Admission');

// @desc    Get seat data (config + live filled count) for all courses
// @route   GET /api/seats
// @access  Private
exports.getSeatData = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const { session } = req.query;

    // Get all active seat configurations
    const filter = { collegeId, isActive: true };
    if (session) filter.academicSession = session;

    const configs = await SeatConfig.find(filter).sort({ courseName: 1 });

    // Get live admission counts grouped by course + category for admitted/application stage
    const admissions = await Admission.aggregate([
      {
        $match: {
          collegeId,
          stage: { $in: ['Admitted', 'Application'] },
          ...(session && { academicSession: session })
        }
      },
      {
        $group: {
          _id: { course: '$course', category: '$category' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Build a lookup map: { courseName: { General: n, OBC: n, SC: n, ... } }
    const admissionMap = {};
    admissions.forEach(a => {
      const course = a._id.course;
      const cat = (a._id.category || 'General').toUpperCase();
      if (!admissionMap[course]) admissionMap[course] = { total: 0 };
      admissionMap[course][cat] = (admissionMap[course][cat] || 0) + a.count;
      admissionMap[course].total = (admissionMap[course].total || 0) + a.count;
    });

    // If no configs exist yet, build from admission data
    if (configs.length === 0) {
      const courseSet = [...new Set(admissions.map(a => a._id.course))];
      const dynamicData = courseSet.map(courseName => {
        const filled = admissionMap[courseName] || {};
        const totalSeats = 60; // default
        return {
          _id: null,
          courseName,
          department: '',
          academicSession: session || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
          totalSeats,
          generalSeats: 30,
          obcSeats: 16,
          scSeats: 9,
          stSeats: 5,
          ewsSeats: 0,
          mgmtSeats: 0,
          waitingListCapacity: 10,
          filled,
          filledTotal: filled.total || 0,
          available: Math.max(0, totalSeats - (filled.total || 0)),
          occupancyPercent: Math.min(100, Math.round(((filled.total || 0) / totalSeats) * 100))
        };
      });
      return res.json({ seats: dynamicData, noConfig: true });
    }

    // Merge config with live filled data
    const seatData = configs.map(cfg => {
      const filled = admissionMap[cfg.courseName] || {};
      const filledTotal = filled.total || 0;
      return {
        _id: cfg._id,
        courseName: cfg.courseName,
        department: cfg.department,
        academicSession: cfg.academicSession,
        totalSeats: cfg.totalSeats,
        generalSeats: cfg.generalSeats,
        obcSeats: cfg.obcSeats,
        scSeats: cfg.scSeats,
        stSeats: cfg.stSeats,
        ewsSeats: cfg.ewsSeats,
        mgmtSeats: cfg.mgmtSeats,
        waitingListCapacity: cfg.waitingListCapacity,
        filled: {
          general: filled['GENERAL'] || 0,
          obc: filled['OBC'] || 0,
          sc: filled['SC'] || 0,
          st: filled['ST'] || 0,
          ews: filled['EWS'] || 0,
          total: filledTotal
        },
        filledTotal,
        available: Math.max(0, cfg.totalSeats - filledTotal),
        occupancyPercent: Math.min(100, Math.round((filledTotal / cfg.totalSeats) * 100))
      };
    });

    // Grand summary
    const summary = {
      totalSeats: seatData.reduce((s, c) => s + c.totalSeats, 0),
      filled: seatData.reduce((s, c) => s + c.filledTotal, 0),
      available: seatData.reduce((s, c) => s + c.available, 0),
      courses: seatData.length
    };

    res.json({ seats: seatData, summary });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching seat data', error: error.message });
  }
};

// @desc    Create or update seat configuration for a course
// @route   POST /api/seats
// @access  Private
exports.upsertSeatConfig = async (req, res) => {
  try {
    const { courseName, department, academicSession, totalSeats, generalSeats, obcSeats, scSeats, stSeats, ewsSeats, mgmtSeats, waitingListCapacity } = req.body;

    if (!courseName || !academicSession || !totalSeats) {
      return res.status(400).json({ message: 'Course name, academic session and total seats are required' });
    }

    const config = await SeatConfig.findOneAndUpdate(
      { collegeId: req.college._id, courseName, academicSession },
      {
        collegeId: req.college._id,
        courseName, department, academicSession,
        totalSeats: parseInt(totalSeats),
        generalSeats: parseInt(generalSeats || 0),
        obcSeats: parseInt(obcSeats || 0),
        scSeats: parseInt(scSeats || 0),
        stSeats: parseInt(stSeats || 0),
        ewsSeats: parseInt(ewsSeats || 0),
        mgmtSeats: parseInt(mgmtSeats || 0),
        waitingListCapacity: parseInt(waitingListCapacity || 10),
        isActive: true
      },
      { upsert: true, returnDocument: 'after' }
    );

    res.status(201).json({ message: 'Seat configuration saved', config });
  } catch (error) {
    res.status(500).json({ message: 'Server error saving seat config', error: error.message });
  }
};

// @desc    Get available academic sessions (from admissions)
// @route   GET /api/seats/sessions
// @access  Private
exports.getSessions = async (req, res) => {
  try {
    const sessions = await Admission.distinct('academicSession', { collegeId: req.college._id });
    const configSessions = await SeatConfig.distinct('academicSession', { collegeId: req.college._id });
    const all = [...new Set([...sessions, ...configSessions].filter(Boolean))].sort().reverse();
    res.json(all);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete seat configuration
// @route   DELETE /api/seats/:id
// @access  Private
exports.deleteSeatConfig = async (req, res) => {
  try {
    await SeatConfig.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    res.json({ message: 'Seat configuration deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
