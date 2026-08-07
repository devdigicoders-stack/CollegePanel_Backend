const fs = require('fs');
const path = require('path');

const filepath = path.join('d:', 'Desktop', 'DCT_CLG_CRM', 'backend', 'controllers', 'hostelController.js');
let content = fs.readFileSync(filepath, 'utf-8');

const imports = `
const HostelCheckInOut = require('../models/HostelCheckInOut');
const HostelAttendance = require('../models/HostelAttendance');
const HostelLeaveOuting = require('../models/HostelLeaveOuting');
const HostelVisitor = require('../models/HostelVisitor');
const HostelIncident = require('../models/HostelIncident');
const HostelInventory = require('../models/HostelInventory');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');
`;

if (!content.includes('HostelCheckInOut')) {
  content = content.replace("const Student = require('../models/Student');", "const Student = require('../models/Student');" + imports);
}

const newMethods = `
// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const rooms = await HostelRoom.find({ collegeId });
    let totalCapacity = 0;
    let totalOccupied = 0;
    rooms.forEach(r => {
      totalCapacity += r.capacity;
      totalOccupied += r.occupancy;
    });

    const activeLeaves = await HostelLeaveOuting.countDocuments({ collegeId, status: 'Approved', toDate: { $gte: new Date() } });
    const pendingLeaves = await HostelLeaveOuting.countDocuments({ collegeId, status: 'Pending' });
    const todayComplaints = await Complaint.countDocuments({ collegeId, category: 'Hostel', createdAt: { $gte: new Date(new Date().setHours(0,0,0,0)) } });
    
    // Recent logs
    const checkInOutLogs = await HostelCheckInOut.find({ collegeId })
      .populate('studentId', 'name rollNumber room')
      .sort({ dateTime: -1 }).limit(5);

    res.status(200).json({
      stats: {
        totalCapacity,
        totalOccupied,
        available: totalCapacity - totalOccupied,
        activeLeaves,
        pendingLeaves,
        todayComplaints
      },
      checkInOutLogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats', error: error.message });
  }
};

// Check In / Out
exports.getCheckInOutLogs = async (req, res) => {
  try {
    const logs = await HostelCheckInOut.find({ collegeId: req.college._id })
      .populate('studentId', 'name rollNumber')
      .sort({ dateTime: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching logs', error: error.message });
  }
};

exports.addCheckInOutLog = async (req, res) => {
  try {
    const newLog = new HostelCheckInOut({ ...req.body, collegeId: req.college._id });
    await newLog.save();
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ message: 'Error adding log', error: error.message });
  }
};

// Attendance
exports.getAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const query = { collegeId: req.college._id };
    if (date) {
      const d = new Date(date);
      d.setHours(0,0,0,0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      query.date = { $gte: d, $lt: nextD };
    }
    const attendance = await HostelAttendance.find(query).populate('studentId', 'name rollNumber').populate('roomId', 'blockName roomNumber');
    res.status(200).json(attendance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { date, records } = req.body;
    for (const rec of records) {
      await HostelAttendance.findOneAndUpdate(
        { date: new Date(date), studentId: rec.studentId, collegeId: req.college._id },
        { status: rec.status, roomId: rec.roomId, remarks: rec.remarks },
        { upsert: true, new: true }
      );
    }
    res.status(200).json({ message: 'Attendance marked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error marking attendance', error: error.message });
  }
};

// Leaves & Outings
exports.getLeaves = async (req, res) => {
  try {
    const leaves = await HostelLeaveOuting.find({ collegeId: req.college._id }).populate('studentId', 'name rollNumber').sort({ createdAt: -1 });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaves', error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const leave = await HostelLeaveOuting.findOneAndUpdate({ _id: id, collegeId: req.college._id }, { status }, { new: true });
    res.status(200).json(leave);
  } catch (error) {
    res.status(500).json({ message: 'Error updating leave', error: error.message });
  }
};

// Visitors
exports.getVisitors = async (req, res) => {
  try {
    const visitors = await HostelVisitor.find({ collegeId: req.college._id }).populate('studentId', 'name rollNumber').sort({ inTime: -1 });
    res.status(200).json(visitors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching visitors', error: error.message });
  }
};

exports.addVisitor = async (req, res) => {
  try {
    const newVisitor = new HostelVisitor({ ...req.body, collegeId: req.college._id });
    await newVisitor.save();
    res.status(201).json(newVisitor);
  } catch (error) {
    res.status(500).json({ message: 'Error adding visitor', error: error.message });
  }
};

exports.checkoutVisitor = async (req, res) => {
  try {
    const visitor = await HostelVisitor.findOneAndUpdate({ _id: req.params.id, collegeId: req.college._id }, { outTime: new Date() }, { new: true });
    res.status(200).json(visitor);
  } catch (error) {
    res.status(500).json({ message: 'Error checking out visitor', error: error.message });
  }
};

// Incidents
exports.getIncidents = async (req, res) => {
  try {
    const incidents = await HostelIncident.find({ collegeId: req.college._id }).populate('studentId', 'name rollNumber').sort({ date: -1 });
    res.status(200).json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incidents', error: error.message });
  }
};

exports.addIncident = async (req, res) => {
  try {
    const newIncident = new HostelIncident({ ...req.body, collegeId: req.college._id });
    await newIncident.save();
    res.status(201).json(newIncident);
  } catch (error) {
    res.status(500).json({ message: 'Error adding incident', error: error.message });
  }
};

// Inventory
exports.getInventory = async (req, res) => {
  try {
    const inventory = await HostelInventory.find({ collegeId: req.college._id }).populate('roomId', 'blockName roomNumber').sort({ category: 1 });
    res.status(200).json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
};

exports.addInventory = async (req, res) => {
  try {
    const item = new HostelInventory({ ...req.body, collegeId: req.college._id });
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error adding inventory', error: error.message });
  }
};
`;

if (!content.includes('exports.getDashboardStats')) {
  content += '\n' + newMethods;
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log("Added new methods to hostelController.js");
} else {
  console.log("Methods already exist");
}
