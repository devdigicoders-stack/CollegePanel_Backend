const express = require('express');
const router = express.Router();
const { getAllRoles, getRolesList, createRole, updateRole, deleteRole, getAvailablePermissions } = require('../controllers/roleController');
const { collegeProtect } = require('../middlewares/authMiddleware');

// Apply college protection middleware to all routes
router.use(collegeProtect);

// Get all roles
router.get('/', getAllRoles);

// Get roles list for dropdown
router.get('/list/all', getRolesList);

// Get available permissions (both routes supported)
router.get('/permissions', getAvailablePermissions);
router.get('/permissions/available', getAvailablePermissions);

// Create role
router.post('/', createRole);

// Update role
router.put('/:id', updateRole);

// Delete role
router.delete('/:id', deleteRole);

module.exports = router;
