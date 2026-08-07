const express = require('express');
const router = express.Router();
const securityController = require('../controllers/securityController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

// Logs (Visitors, Students)
router.post('/logs', securityController.addLog);
router.get('/logs', securityController.getLogs);
router.put('/logs/:id', securityController.updateLog); // For checkout of visitors

// Gatepass
router.post('/gatepass', securityController.createGatepass);
router.get('/gatepass/:id', securityController.getGatepass);
router.put('/gatepass/:id', securityController.verifyGatepass);

// Vehicles
router.get('/vehicles', securityController.getVehicles);
router.post('/vehicles', securityController.addVehicle);
router.put('/vehicles/:id/checkout', securityController.checkoutVehicle);

// Incidents
router.get('/incidents', securityController.getIncidents);
router.post('/incidents', securityController.addIncident);

// Dashboard
router.get('/dashboard/stats', securityController.getDashboardStats);

module.exports = router;
