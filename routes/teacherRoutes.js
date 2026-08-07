const express = require('express');
const router = express.Router();
const { getTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher, getDepartments, getDesignations, getHods, getTeachersForDropdown } = require('../controllers/teacherController');
const { collegeProtect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// Apply college protection middleware to all routes
router.use(collegeProtect);

// Get all routes
router.get('/hods', getHods);
router.get('/list/all', getTeachersForDropdown);
router.get('/departments', getDepartments);
router.get('/designations', getDesignations);
router.get('/', getTeachers);
router.get('/:id', getTeacherById);

// Create route with image upload
router.post('/', upload.single('profileImage'), createTeacher);

// Update route with image upload
router.put('/:id', upload.single('profileImage'), updateTeacher);

// Delete route
router.delete('/:id', deleteTeacher);

module.exports = router;
