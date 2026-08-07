const express = require('express');
const router = express.Router();
const { getStudents, getStudentFilters, addStudent, getStudentById, updateStudent, deleteStudent } = require('../controllers/studentController');
const { collegeProtect } = require('../middlewares/authMiddleware');

router.get('/filters', collegeProtect, getStudentFilters);

router.route('/')
  .get(collegeProtect, getStudents)
  .post(collegeProtect, addStudent);

router.route('/:id')
  .get(collegeProtect, getStudentById)
  .put(collegeProtect, updateStudent)
  .delete(collegeProtect, deleteStudent);

module.exports = router;