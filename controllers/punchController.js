const PunchLog = require('../models/PunchLog');
const FacultyAttendance = require('../models/FacultyAttendance');
const College = require('../models/College');

// Haversine formula to calculate distance in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth's radius in meters
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Normalize date to 00:00:00 for the current local day
const getTodayNormalized = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

exports.punchIn = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Location is required to punch in' });
    }

    const employeeId = req.employee?._id || req.teacher?._id || (req.userRole === 'college_admin' ? req.college?._id : null);
    if (!employeeId) return res.status(403).json({ message: 'Not authorized' });

    const college = await College.findById(req.college._id);
    if (!college.location || !college.location.lat) {
      return res.status(400).json({ message: 'College location is not set by Super Admin. Cannot punch in.' });
    }

    const distance = calculateDistance(lat, lng, college.location.lat, college.location.lng);
    const maxRadius = college.location.radius || 50;

    if (distance > maxRadius) {
      return res.status(400).json({ 
        message: `You are too far from the college campus. (Distance: ${Math.round(distance)}m, Allowed: ${maxRadius}m)` 
      });
    }

    const today = getTodayNormalized();
    let status = 'Present';

    // Calculate Half Day if late
    if (college.attendanceSettings && college.attendanceSettings.shiftStartTime) {
      const [startHour, startMin] = college.attendanceSettings.shiftStartTime.split(':').map(Number);
      const thresholdMinutes = college.attendanceSettings.lateThresholdMinutes || 15;
      
      const currentTime = new Date();
      const expectedStartTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate(), startHour, startMin);
      
      const diffMs = currentTime - expectedStartTime;
      const diffMinutes = Math.floor(diffMs / 60000);
      
      if (diffMinutes > thresholdMinutes) {
        status = 'Half Day';
      }
    }

    let punchLog = await PunchLog.findOne({ collegeId: req.college._id, employeeId, date: today });

    if (punchLog && punchLog.punchInTime) {
      return res.status(400).json({ message: 'You have already punched in today' });
    }

    if (!punchLog) {
      punchLog = new PunchLog({
        collegeId: req.college._id,
        employeeId,
        date: today,
        punchInTime: new Date(),
        punchInLocation: { lat, lng },
        status
      });
    } else {
      punchLog.punchInTime = new Date();
      punchLog.punchInLocation = { lat, lng };
      punchLog.status = status;
    }

    await punchLog.save();

    // Sync with FacultyAttendance for payroll
    const nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 1);
    
    let facultyAtt = await FacultyAttendance.findOne({ 
      collegeId: req.college._id, 
      date: { $gte: today, $lt: nextDate } 
    });

    if (!facultyAtt) {
      facultyAtt = new FacultyAttendance({
        collegeId: req.college._id,
        date: today,
        records: []
      });
    }
    
    const recordIndex = facultyAtt.records.findIndex(r => r.facultyId.toString() === employeeId.toString());
    const employeeName = req.employee?.name || req.teacher?.name || (req.userRole === 'college_admin' ? req.college?.adminName : 'Unknown');
    if (recordIndex >= 0) {
      facultyAtt.records[recordIndex].status = status;
      facultyAtt.records[recordIndex].name = employeeName;
    } else {
      facultyAtt.records.push({ facultyId: employeeId, status, name: employeeName });
    }
    await facultyAtt.save();

    res.json({ message: 'Punch In successful', data: punchLog });
  } catch (error) {
    res.status(500).json({ message: 'Error punching in', error: error.message });
  }
};

exports.punchOut = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ message: 'Location is required to punch out' });
    }

    const employeeId = req.employee?._id || req.teacher?._id || (req.userRole === 'college_admin' ? req.college?._id : null);
    if (!employeeId) return res.status(403).json({ message: 'Not authorized' });

    const college = await College.findById(req.college._id);
    const distance = calculateDistance(lat, lng, college.location.lat, college.location.lng);
    const maxRadius = college.location.radius || 50;

    if (distance > maxRadius) {
      return res.status(400).json({ 
        message: `You are too far from the college campus. (Distance: ${Math.round(distance)}m, Allowed: ${maxRadius}m)` 
      });
    }

    const today = getTodayNormalized();
    let punchLog = await PunchLog.findOne({ collegeId: req.college._id, employeeId, date: today });

    if (!punchLog || !punchLog.punchInTime) {
      return res.status(400).json({ message: 'You must punch in first' });
    }

    punchLog.punchOutTime = new Date();
    punchLog.punchOutLocation = { lat, lng };
    await punchLog.save();

    res.json({ message: 'Punch Out successful', data: punchLog });
  } catch (error) {
    res.status(500).json({ message: 'Error punching out', error: error.message });
  }
};

exports.getMyPunchHistory = async (req, res) => {
  try {
    const employeeId = req.employee?._id || req.teacher?._id || (req.userRole === 'college_admin' ? req.college?._id : null);
    if (!employeeId) return res.status(403).json({ message: 'Not authorized' });

    const logs = await PunchLog.find({ collegeId: req.college._id, employeeId })
      .sort({ date: -1 })
      .limit(30); // Get last 30 days
      
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching punch history', error: error.message });
  }
};

exports.getTodayStatus = async (req, res) => {
  try {
    const employeeId = req.employee?._id || req.teacher?._id || (req.userRole === 'college_admin' ? req.college?._id : null);
    if (!employeeId) return res.status(403).json({ message: 'Not authorized' });

    const today = getTodayNormalized();
    const punchLog = await PunchLog.findOne({ collegeId: req.college._id, employeeId, date: today });
    
    res.json({ data: punchLog });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching today status', error: error.message });
  }
};

exports.getAllPunchLogs = async (req, res) => {
  try {
    const { date } = req.query;
    let targetDate = getTodayNormalized();
    if (date) {
      targetDate = new Date(date);
      targetDate.setHours(0,0,0,0);
    }
    
    const logs = await PunchLog.find({ collegeId: req.college._id, date: targetDate })
      .populate('employeeId', 'name empId department role')
      .sort({ punchInTime: -1 });
      
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all punch logs', error: error.message });
  }
};

exports.getMonthlyReport = async (req, res) => {
  try {
    let { month, year, employeeId } = req.query;
    
    // Default to current month/year if not provided
    const currentDate = new Date();
    month = month ? parseInt(month) : currentDate.getMonth() + 1;
    year = year ? parseInt(year) : currentDate.getFullYear();
    
    // If not admin, restrict to self
    const loggedInEmployee = req.employee?._id || req.teacher?._id || (req.userRole === 'college_admin' ? req.college?._id : null);
    if (req.userRole !== 'college_admin' && req.userRole !== 'Super Admin') {
      employeeId = loggedInEmployee;
    } else {
      // If admin didn't specify employee, maybe they want all? But report is usually per employee.
      // If no employeeId is given, return an error because a monthly report is per-employee
      if (!employeeId) {
        employeeId = loggedInEmployee;
      }
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    
    const logs = await PunchLog.find({ 
      collegeId: req.college._id, 
      employeeId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 }).populate('employeeId', 'name empId department role');

    // Aggregate summary
    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;

    // We can also fetch FacultyAttendance to see absences, because PunchLog only has Present/Half Day (days they punched in)
    // For a full report, it's better to use FacultyAttendance which has all days
    const facultyAttendance = await FacultyAttendance.find({
      collegeId: req.college._id,
      date: { $gte: startDate, $lte: endDate },
      'records.facultyId': employeeId
    }).sort({ date: 1 });

    const reportDays = [];
    
    // Create a map of days in the month
    const totalDays = endDate.getDate();
    for (let d = 1; d <= totalDays; d++) {
      const currentDay = new Date(year, month - 1, d);
      
      // Find punch log for this day
      const dailyPunch = logs.find(log => new Date(log.date).getDate() === d);
      
      // Find faculty attendance for this day
      const dailyAtt = facultyAttendance.find(att => new Date(att.date).getDate() === d);
      let attRecord = null;
      if (dailyAtt) {
        attRecord = dailyAtt.records.find(r => r.facultyId.toString() === employeeId.toString());
      }
      
      let finalStatus = 'Absent (No Record)';
      if (attRecord) {
        finalStatus = attRecord.status;
      } else if (dailyPunch) {
        finalStatus = dailyPunch.status;
      } else if (currentDay.getDay() === 0) {
        finalStatus = 'Week Off';
      }
      
      if (finalStatus === 'Present') presentDays++;
      else if (finalStatus === 'Half Day') halfDays++;
      else if (finalStatus.includes('Absent')) absentDays++;

      reportDays.push({
        date: currentDay,
        punchIn: dailyPunch ? dailyPunch.punchInTime : null,
        punchOut: dailyPunch ? dailyPunch.punchOutTime : null,
        status: finalStatus
      });
    }

    // Get employee details
    const employeeDetails = logs.length > 0 && logs[0].employeeId ? logs[0].employeeId : null; 
    // If no logs, ideally we'd fetch employee from Employee model, but this is a simplified approach

    res.json({
      summary: {
        totalDays,
        workingDays: totalDays - Math.floor(totalDays / 7), // Rough estimate, 4 sundays
        presentDays,
        halfDays,
        absentDays
      },
      employee: employeeDetails,
      dailyLogs: reportDays
    });
    
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monthly report', error: error.message });
  }
};
