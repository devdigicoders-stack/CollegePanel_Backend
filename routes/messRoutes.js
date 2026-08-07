const express = require('express');
const router = express.Router();
const messController = require('../controllers/messController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.use(collegeProtect);

// Dashboard
router.get('/dashboard-stats', messController.getDashboardStats);

// Menu
router.get('/menu', messController.getMenu);
router.post('/menu', messController.addMenu);
router.put('/menu/:id', messController.updateMenu);
router.delete('/menu/:id', messController.deleteMenu);

// Students
router.get('/members', messController.getMembers);
router.put('/members/:id/toggle-status', messController.toggleMemberStatus);

// Inventory
router.get('/inventory', messController.getInventory);
router.post('/inventory', messController.addInventoryItem);
router.put('/inventory/:id', messController.updateInventoryItem);
router.delete('/inventory/:id', messController.deleteInventoryItem);

// Purchase Requests
router.get('/purchase-requests', messController.getPurchaseRequests);
router.post('/purchase-requests', messController.addPurchaseRequest);
router.put('/purchase-requests/:id/status', messController.updatePurchaseRequestStatus);

module.exports = router;
