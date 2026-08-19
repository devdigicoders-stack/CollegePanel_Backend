const HostelRoom = require('../models/HostelRoom');
const HostelAllocation = require('../models/HostelAllocation');
const Student = require('../models/Student');
const HostelCheckInOut = require('../models/HostelCheckInOut');
const HostelLeaveOuting = require('../models/HostelLeaveOuting');
const HostelVisitor = require('../models/HostelVisitor');
const HostelIncident = require('../models/HostelIncident');
const HostelInventory = require('../models/HostelInventory');
const Complaint = require('../models/Complaint');
const Notice = require('../models/Notice');


// Get all rooms and dashboard data
exports.getRooms = async (req, res) => {
  try {
    const rooms = await HostelRoom.find({ collegeId: req.college._id });
    const allocations = await HostelAllocation.find({ collegeId: req.college._id })
      .populate('roomId', 'blockName roomNumber')
      .populate('studentId', 'studentName studentId course')
      .sort({ allotmentDate: -1 })
      .limit(5);

    // Calculate block-wise occupancy
    const blockData = {};
    rooms.forEach(room => {
      if (!blockData[room.blockName]) {
        blockData[room.blockName] = { occupied: 0, available: 0 };
      }
      blockData[room.blockName].occupied += room.occupancy;
      blockData[room.blockName].available += (room.capacity - room.occupancy);
    });

    res.status(200).json({ rooms, allocations, blockData });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rooms', error: error.message });
  }
};

// Add a room
exports.addRoom = async (req, res) => {
  try {
    const { blockName, roomNumber, capacity, type } = req.body;
    
    const newRoom = new HostelRoom({
      blockName, roomNumber, capacity, type,
      collegeId: req.college._id
    });
    
    await newRoom.save();
    res.status(201).json({ message: 'Room added successfully', room: newRoom });
  } catch (error) {
    res.status(500).json({ message: 'Error adding room', error: error.message });
  }
};

// Update a room
exports.updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const room = await HostelRoom.findOneAndUpdate(
      { _id: id, collegeId: req.college._id },
      updates,
      { new: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.status(200).json({ message: 'Room updated successfully', room });
  } catch (error) {
    res.status(500).json({ message: 'Error updating room', error: error.message });
  }
};

// Delete a room
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await HostelRoom.findOne({ _id: id, collegeId: req.college._id });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.occupancy > 0) return res.status(400).json({ message: 'Cannot delete a room with active occupants. Vacate the room first.' });
    await HostelRoom.deleteOne({ _id: id });
    res.status(200).json({ message: 'Room deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting room', error: error.message });
  }
};

// Allocate a student to a room
exports.allocateRoom = async (req, res) => {
  try {
    const { roomId, studentId } = req.body;
    
    const room = await HostelRoom.findOne({ _id: roomId, collegeId: req.college._id });
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (room.occupancy >= room.capacity) return res.status(400).json({ message: 'Room is full' });
    
    const student = await Student.findOne({ _id: studentId, collegeId: req.college._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });
    
    // Check if student already allocated
    const existing = await HostelAllocation.findOne({ studentId, status: 'Active', collegeId: req.college._id });
    if (existing) return res.status(400).json({ message: 'Student is already allocated to a room' });
    
    const allocation = new HostelAllocation({
      roomId, studentId,
      collegeId: req.college._id
    });
    
    room.occupancy += 1;
    if (room.occupancy >= room.capacity) room.status = 'Full';
    
    await room.save();
    await allocation.save();
    
    res.status(201).json({ message: 'Room allocated successfully', allocation });
  } catch (error) {
    res.status(500).json({ message: 'Error allocating room', error: error.message });
  }
};

// Get all allocations (active + all by query)
exports.getAllocations = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { collegeId: req.college._id };
    if (status && status !== 'All') query.status = status;
    else query.status = 'Active'; // default: only active

    const allocations = await HostelAllocation.find(query)
      .populate('roomId', 'blockName roomNumber')
      .populate('studentId', 'studentName studentId course');
    res.status(200).json(allocations);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching allocations', error: error.message });
  }
};

// Vacate a student allocation
exports.vacateAllocation = async (req, res) => {
  try {
    const { id } = req.params;
    const allocation = await HostelAllocation.findOne({ _id: id, collegeId: req.college._id, status: 'Active' });
    if (!allocation) return res.status(404).json({ message: 'Active allocation not found' });

    // Mark allocation as Vacated
    allocation.status = 'Vacated';
    await allocation.save();

    // Decrement room occupancy
    const room = await HostelRoom.findById(allocation.roomId);
    if (room) {
      room.occupancy = Math.max(0, room.occupancy - 1);
      if (room.status === 'Full' && room.occupancy < room.capacity) room.status = 'Available';
      await room.save();
    }

    res.status(200).json({ message: 'Student vacated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error vacating allocation', error: error.message });
  }
};


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
      .populate('studentId', 'studentName studentId')
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
    const { type, studentId } = req.query;
    const query = { collegeId: req.college._id };
    if (type && type !== 'All') query.type = type;
    if (studentId) query.studentId = studentId;
    const logs = await HostelCheckInOut.find(query)
      .populate('studentId', 'studentName studentId course')
      .sort({ dateTime: -1 })
      .limit(100);
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching check-in/out logs', error: error.message });
  }
};

exports.addCheckInOutLog = async (req, res) => {
  try {
    const { studentId, type, remarks, damageCharges } = req.body;
    if (!studentId || !type) return res.status(400).json({ message: 'studentId and type are required' });
    const log = new HostelCheckInOut({
      studentId, type,
      remarks: remarks || '',
      reason: damageCharges ? `Damage charges: ₹${damageCharges}` : '',
      dateTime: new Date(),
      collegeId: req.college._id
    });
    await log.save();
    await log.populate('studentId', 'studentName studentId course');
    res.status(201).json({ message: `${type} recorded successfully`, log });
  } catch (error) {
    res.status(500).json({ message: 'Error recording check-in/out', error: error.message });
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
    const attendance = await HostelAttendance.find(query).populate('studentId', 'studentName studentId').populate('roomId', 'blockName roomNumber');
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
        { upsert: true, returnDocument: 'after' }
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
    const { status, type } = req.query;
    const query = { collegeId: req.college._id };
    if (status && status !== 'All') query.status = status;
    if (type && type !== 'All') query.type = type;

    const leaves = await HostelLeaveOuting.find(query)
      .populate('studentId', 'studentName studentId')
      .sort({ createdAt: -1 });
    res.status(200).json(leaves);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching leaves', error: error.message });
  }
};

exports.addLeave = async (req, res) => {
  try {
    const { studentId, type, fromDate, toDate, reason } = req.body;
    if (!studentId || !type || !fromDate || !toDate || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const leave = new HostelLeaveOuting({
      studentId, type, fromDate, toDate, reason,
      status: 'Pending',
      collegeId: req.college._id
    });
    await leave.save();
    await leave.populate('studentId', 'studentName studentId');
    res.status(201).json({ message: 'Leave request created', leave });
  } catch (error) {
    res.status(500).json({ message: 'Error creating leave request', error: error.message });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const leave = await HostelLeaveOuting.findOneAndUpdate(
      { _id: id, collegeId: req.college._id },
      { status },
      { new: true }
    ).populate('studentId', 'studentName studentId');
    if (!leave) return res.status(404).json({ message: 'Leave request not found' });
    res.status(200).json({ message: `Leave ${status}`, leave });
  } catch (error) {
    res.status(500).json({ message: 'Error updating leave', error: error.message });
  }
};

// Visitors
exports.getVisitors = async (req, res) => {
  try {
    const { status, date } = req.query;
    const query = { collegeId: req.college._id };

    // Filter by status: 'inside' = no outTime, 'out' = has outTime
    if (status === 'inside') query.outTime = { $exists: false };
    else if (status === 'out') query.outTime = { $exists: true };

    // Filter by date (today's visitors)
    if (date === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const end = new Date(); end.setHours(23, 59, 59, 999);
      query.inTime = { $gte: start, $lte: end };
    }

    const visitors = await HostelVisitor.find(query)
      .populate('studentId', 'studentName studentId')
      .sort({ inTime: -1 });
    res.status(200).json(visitors);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching visitors', error: error.message });
  }
};

exports.addVisitor = async (req, res) => {
  try {
    const newVisitor = new HostelVisitor({ ...req.body, collegeId: req.college._id });
    await newVisitor.save();
    await newVisitor.populate('studentId', 'studentName studentId');
    res.status(201).json({ message: 'Visitor entry recorded', visitor: newVisitor });
  } catch (error) {
    res.status(500).json({ message: 'Error adding visitor', error: error.message });
  }
};

exports.checkoutVisitor = async (req, res) => {
  try {
    const visitor = await HostelVisitor.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      { outTime: new Date() },
      { new: true }
    ).populate('studentId', 'studentName studentId');
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.status(200).json({ message: 'Visitor checked out', visitor });
  } catch (error) {
    res.status(500).json({ message: 'Error checking out visitor', error: error.message });
  }
};

// Incidents
exports.getIncidents = async (req, res) => {
  try {
    const { status, type } = req.query;
    const query = { collegeId: req.college._id };
    if (status && status !== 'All') query.status = status;
    if (type && type !== 'All') query.incidentType = type;

    const incidents = await HostelIncident.find(query)
      .populate('studentId', 'studentName studentId')
      .sort({ date: -1 });
    res.status(200).json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incidents', error: error.message });
  }
};

exports.addIncident = async (req, res) => {
  try {
    const { studentId, incidentType, description, actionTaken, date } = req.body;
    if (!studentId || !incidentType || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const newIncident = new HostelIncident({
      studentId, incidentType, description, actionTaken,
      date: date || new Date(),
      status: 'Open',
      collegeId: req.college._id
    });
    await newIncident.save();
    await newIncident.populate('studentId', 'studentName studentId');
    res.status(201).json({ message: 'Incident recorded successfully', incident: newIncident });
  } catch (error) {
    res.status(500).json({ message: 'Error adding incident', error: error.message });
  }
};

exports.updateIncidentStatus = async (req, res) => {
  try {
    const { status, actionTaken } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (actionTaken !== undefined) updateData.actionTaken = actionTaken;

    const incident = await HostelIncident.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      updateData,
      { new: true }
    ).populate('studentId', 'studentName studentId');
    
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.status(200).json({ message: 'Incident updated successfully', incident });
  } catch (error) {
    res.status(500).json({ message: 'Error updating incident', error: error.message });
  }
};

exports.deleteIncident = async (req, res) => {
  try {
    const incident = await HostelIncident.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    if (!incident) return res.status(404).json({ message: 'Incident not found' });
    res.status(200).json({ message: 'Incident deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting incident', error: error.message });
  }
};

// Inventory
exports.getInventory = async (req, res) => {
  try {
    const { category, condition } = req.query;
    const query = { collegeId: req.college._id };
    if (category && category !== 'All') query.category = category;
    if (condition && condition !== 'All') query.condition = condition;

    const inventory = await HostelInventory.find(query)
      .populate('roomId', 'blockName roomNumber')
      .sort({ createdAt: -1 });
    res.status(200).json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
};

exports.addInventory = async (req, res) => {
  try {
    const { itemName, category, quantity, condition, roomId, remarks } = req.body;
    if (!itemName || !category || !quantity) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const item = new HostelInventory({
      itemName, category, quantity, condition: condition || 'Good',
      roomId: roomId || null, remarks: remarks || '',
      collegeId: req.college._id
    });
    await item.save();
    await item.populate('roomId', 'blockName roomNumber');
    res.status(201).json({ message: 'Asset added successfully', asset: item });
  } catch (error) {
    res.status(500).json({ message: 'Error adding inventory', error: error.message });
  }
};

exports.updateInventory = async (req, res) => {
  try {
    const item = await HostelInventory.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      req.body,
      { new: true, runValidators: true }
    ).populate('roomId', 'blockName roomNumber');
    if (!item) return res.status(404).json({ message: 'Asset not found' });
    res.status(200).json({ message: 'Asset updated successfully', asset: item });
  } catch (error) {
    res.status(500).json({ message: 'Error updating asset', error: error.message });
  }
};

exports.deleteInventory = async (req, res) => {
  try {
    const item = await HostelInventory.findOneAndDelete({ _id: req.params.id, collegeId: req.college._id });
    if (!item) return res.status(404).json({ message: 'Asset not found' });
    res.status(200).json({ message: 'Asset deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting asset', error: error.message });
  }
};

