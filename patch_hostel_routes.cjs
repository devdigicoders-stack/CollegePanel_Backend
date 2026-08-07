const fs = require('fs');
const path = require('path');

const filepath = path.join('d:', 'Desktop', 'DCT_CLG_CRM', 'backend', 'routes', 'hostelRoutes.js');
let content = fs.readFileSync(filepath, 'utf-8');

const newRoutes = `
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
router.put('/leaves/:id/status', hostelController.updateLeaveStatus);

// Visitors
router.get('/visitors', hostelController.getVisitors);
router.post('/visitors', hostelController.addVisitor);
router.put('/visitors/:id/checkout', hostelController.checkoutVisitor);

// Incidents
router.get('/incidents', hostelController.getIncidents);
router.post('/incidents', hostelController.addIncident);

// Inventory
router.get('/inventory', hostelController.getInventory);
router.post('/inventory', hostelController.addInventory);
`;

if (!content.includes('/dashboard/stats')) {
  // insert before module.exports = router;
  content = content.replace('module.exports = router;', newRoutes + '\nmodule.exports = router;');
  fs.writeFileSync(filepath, content, 'utf-8');
  console.log("Added new routes to hostelRoutes.js");
} else {
  console.log("Routes already exist");
}
