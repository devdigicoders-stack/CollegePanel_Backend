const express = require('express');
const router = express.Router();
const { getDesignations, getDesignationById, createDesignation, updateDesignation, deleteDesignation, getDesignationsList } = require('../controllers/designationController');
const { collegeProtect } = require('../middlewares/authMiddleware');

// Apply college protection middleware
router.use(collegeProtect);

// Get list for dropdowns
router.get('/list/all', getDesignationsList);

// Get all designations with pagination
router.get('/', getDesignations);

// Get single designation
router.get('/:id', getDesignationById);

// Create designation
router.post('/', createDesignation);

// Update designation
router.put('/:id', updateDesignation);

// Delete designation
router.delete('/:id', deleteDesignation);

module.exports = router;
