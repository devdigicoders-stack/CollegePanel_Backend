const express = require('express');
const router = express.Router();
const hostelController = require('../controllers/hostelController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

router.get('/rooms', hostelController.getRooms);
router.post('/rooms', hostelController.addRoom);
router.put('/rooms/:id', hostelController.updateRoom);
router.delete('/rooms/:id', hostelController.deleteRoom);
router.post('/allocate', hostelController.allocateRoom);
router.get('/allocations', hostelController.getAllocations);
router.put('/allocations/:id/vacate', hostelController.vacateAllocation);
router.get('/allotments', hostelController.getAllocations); // alias


// Dashboard
router.get('/dashboard/stats', hostelController.getDashboardStats);

// Check In / Out
router.get('/check-in-out', hostelController.getCheckInOutLogs);
router.post('/check-in-out', hostelController.addCheckInOutLog);

// Attendance
router.get('/attendance', hostelController.getAttendance);
router.post('/attendance', hostelController.markAttendance);

// Leaves & Outings
router.get('/leaves', hostelController.getLeaves);
router.post('/leaves', hostelController.addLeave);
router.put('/leaves/:id/status', hostelController.updateLeaveStatus);

// Visitors
router.get('/visitors', hostelController.getVisitors);
router.post('/visitors', hostelController.addVisitor);
router.put('/visitors/:id/checkout', hostelController.checkoutVisitor);

// Incidents
router.get('/incidents', hostelController.getIncidents);
router.post('/incidents', hostelController.addIncident);
router.put('/incidents/:id/status', hostelController.updateIncidentStatus);
router.delete('/incidents/:id', hostelController.deleteIncident);

// Inventory
router.get('/inventory', hostelController.getInventory);
router.post('/inventory', hostelController.addInventory);
router.put('/inventory/:id', hostelController.updateInventory);
router.delete('/inventory/:id', hostelController.deleteInventory);

module.exports = router;
