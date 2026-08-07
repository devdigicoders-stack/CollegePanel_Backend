const SecurityLog = require('../models/SecurityLog');
const Gatepass = require('../models/Gatepass');
const Student = require('../models/Student');
const VehicleLog = require('../models/VehicleLog');
const SecurityIncident = require('../models/SecurityIncident');

// Log entry/exit (Visitors, Student Movement)
exports.addLog = async (req, res) => {
  try {
    const { logType, studentId, gatepassId, visitorName, purpose, contactNumber, remarks, movementType, photoUrl } = req.body;
    
    // For students, we might receive enrollNo instead of studentId
    let targetStudentId = studentId;
    if (logType === 'Student' && req.body.enrollNo) {
      let st = await Student.findOne({ studentId: req.body.enrollNo, collegeId: req.college._id });
      
      // Fallback: If they provided an enrollment number instead of student ID, look it up in StudentFee
      if (!st) {
        const StudentFee = require('../models/StudentFee');
        const fee = await StudentFee.findOne({ enrollNo: req.body.enrollNo, collegeId: req.college._id });
        if (fee) {
          st = await Student.findById(fee.studentId);
        }
      }

      if (!st) return res.status(404).json({ message: 'Student not found with this enrollment number' });
      targetStudentId = st._id;
    }

    const log = new SecurityLog({
      logType, studentId: targetStudentId, gatepassId, visitorName, purpose, contactNumber, remarks, movementType, photoUrl,
      loggedBy: req.employee ? req.employee._id : null,
      collegeId: req.college._id,
      entryTime: new Date()
    });
    
    await log.save();
    res.status(201).json({ message: 'Log added successfully', log });
  } catch (error) {
    res.status(500).json({ message: 'Error adding log', error: error.message });
  }
};

// Get all logs
exports.getLogs = async (req, res) => {
  try {
    const { logType } = req.query;
    const filter = { collegeId: req.college._id };
    if (logType) filter.logType = logType;

    const logs = await SecurityLog.find(filter)
      .populate('studentId', 'studentName studentId rollNumber course')
      .populate('loggedBy', 'name role')
      .sort({ createdAt: -1 });
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching logs', error: error.message });
  }
};

// Update log (e.g. Visitor Checkout)
exports.updateLog = async (req, res) => {
  try {
    const log = await SecurityLog.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      { exitTime: new Date(), ...req.body },
      { returnDocument: 'after' }
    );
    if (!log) return res.status(404).json({ message: 'Log not found' });
    res.json(log);
  } catch (error) {
    res.status(500).json({ message: 'Error updating log', error: error.message });
  }
};

// Gatepass operations
exports.createGatepass = async (req, res) => {
  try {
    const { studentId, reason, validFrom, validUntil } = req.body;
    const gatepass = new Gatepass({
      studentId, reason, validFrom, validUntil,
      collegeId: req.college._id
    });
    await gatepass.save();
    res.status(201).json({ message: 'Gatepass generated successfully', gatepass });
  } catch (error) {
    res.status(500).json({ message: 'Error creating gatepass', error: error.message });
  }
};

exports.getGatepass = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if id is a valid mongo id
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
       return res.status(400).json({ message: 'Invalid Gate Pass Code Format' });
    }
    const gatepass = await Gatepass.findOne({ _id: id, collegeId: req.college._id })
      .populate('studentId', 'studentName studentId rollNumber');
    if (!gatepass) return res.status(404).json({ message: 'Gatepass not found' });
    res.json(gatepass);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching gatepass', error: error.message });
  }
};

exports.verifyGatepass = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const gatepass = await Gatepass.findOneAndUpdate(
      { _id: id, collegeId: req.college._id },
      { status },
      { returnDocument: 'after' }
    ).populate('studentId', 'studentName studentId rollNumber');
    
    if (!gatepass) return res.status(404).json({ message: 'Gatepass not found' });
    
    res.status(200).json({ message: 'Gatepass verified and updated', gatepass });
  } catch (error) {
    res.status(500).json({ message: 'Error updating gatepass', error: error.message });
  }
};

// Vehicles
exports.getVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleLog.find({ collegeId: req.college._id }).sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addVehicle = async (req, res) => {
  try {
    const { plateNo, ownerName, vehicleType, parkingZone } = req.body;
    const v = new VehicleLog({
      plateNo, ownerName, vehicleType, parkingZone,
      loggedBy: req.employee ? req.employee._id : null,
      collegeId: req.college._id
    });
    await v.save();
    res.status(201).json(v);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkoutVehicle = async (req, res) => {
  try {
    const v = await VehicleLog.findOneAndUpdate(
      { _id: req.params.id, collegeId: req.college._id },
      { checkOutTime: new Date() },
      { returnDocument: 'after' }
    );
    if (!v) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(v);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Incidents
exports.getIncidents = async (req, res) => {
  try {
    const incidents = await SecurityIncident.find({ collegeId: req.college._id }).sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addIncident = async (req, res) => {
  try {
    const { type, description, priority } = req.body;
    const inc = new SecurityIncident({
      type, description, priority,
      loggedBy: req.employee ? req.employee._id : null,
      collegeId: req.college._id
    });
    await inc.save();
    res.status(201).json(inc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const collegeId = req.college._id;
    const today = new Date(new Date().setHours(0,0,0,0));

    // Visitors Inside
    const visitorsInside = await SecurityLog.countDocuments({ collegeId, logType: 'Visitor', exitTime: { $exists: false } });
    const totalVisitors = await SecurityLog.countDocuments({ collegeId, logType: 'Visitor', entryTime: { $gte: today } });
    
    // Vehicles
    const vehiclesChecked = await VehicleLog.countDocuments({ collegeId, checkInTime: { $gte: today } });
    
    // Gatepasses pending verification
    const pendingOuting = await Gatepass.countDocuments({ collegeId, status: 'Approved', validFrom: { $gte: today } }); // Students approved but not verified out yet
    
    // Recent incidents
    const incidents = await SecurityIncident.find({ collegeId }).sort({ createdAt: -1 }).limit(5);

    // SOS active if any critical priority in last hour
    const oneHourAgo = new Date(Date.now() - 3600000);
    const criticalIncidents = await SecurityIncident.countDocuments({ collegeId, priority: 'High', createdAt: { $gte: oneHourAgo } });

    // Students inside/outside
    const totalStudents = await Student.countDocuments({ collegeId });
    const studentsOutsideAggregation = await SecurityLog.aggregate([
      { $match: { logType: 'Student', collegeId } },
      { $sort: { entryTime: -1 } },
      { $group: { _id: '$studentId', latestMovement: { $first: '$movementType' } } },
      { $match: { latestMovement: 'Exit' } }
    ]);
    const studentsOutsideCount = studentsOutsideAggregation.length;
    const studentsInsideCount = totalStudents - studentsOutsideCount;

    res.json({
      visitorsInside,
      totalVisitors,
      vehiclesChecked,
      pendingOuting,
      incidents,
      sosActive: criticalIncidents > 0,
      studentsInside: studentsInsideCount,
      studentsOutside: studentsOutsideCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
