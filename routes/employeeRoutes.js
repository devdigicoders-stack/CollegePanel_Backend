const express = require('express');
const router = express.Router();
const { 
  getEmployees, 
  getEmployeeById, 
  createEmployee, 
  updateEmployee, 
  deleteEmployee, 
  getRoles, 
  getDepartments 
} = require('../controllers/employeeController');
const { collegeProtect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Apply college protection middleware to all routes
router.use(collegeProtect);

// Get filter options
router.get('/roles', getRoles);
router.get('/departments', getDepartments);

// CRUD routes
router.get('/', getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', upload.single('profilePhoto'), createEmployee);
router.put('/:id', upload.single('profilePhoto'), updateEmployee);
router.delete('/:id', deleteEmployee);

module.exports = router;
