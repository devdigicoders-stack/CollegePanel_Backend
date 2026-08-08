const College = require('../models/College');

// @desc    Update College Attendance Settings
// @route   PATCH /api/colleges/settings/attendance
// @access  Private/CollegeAdmin
exports.updateAttendanceSettings = async (req, res) => {
  try {
    const { shiftStartTime, shiftEndTime, lateThresholdMinutes } = req.body;
    
    // Admins only edit their own college
    const collegeId = req.user.collegeId || req.user.id; 
    
    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    if (!college.attendanceSettings) {
      college.attendanceSettings = {};
    }

    if (shiftStartTime !== undefined) college.attendanceSettings.shiftStartTime = shiftStartTime;
    if (shiftEndTime !== undefined) college.attendanceSettings.shiftEndTime = shiftEndTime;
    if (lateThresholdMinutes !== undefined) college.attendanceSettings.lateThresholdMinutes = lateThresholdMinutes;

    await college.save();

    res.json({
      message: 'Attendance settings updated successfully',
      attendanceSettings: college.attendanceSettings
    });

  } catch (error) {
    console.error('Error updating attendance settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get College Attendance Settings
// @route   GET /api/colleges/settings/attendance
// @access  Private
exports.getAttendanceSettings = async (req, res) => {
  try {
    const collegeId = req.user.collegeId || req.user.id;
    const college = await College.findById(collegeId);
    
    if (!college) {
      return res.status(404).json({ message: 'College not found' });
    }

    res.json(college.attendanceSettings || {
      shiftStartTime: '09:00',
      shiftEndTime: '17:00',
      lateThresholdMinutes: 15
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
