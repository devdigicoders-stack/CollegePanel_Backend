const express = require('express');
const router = express.Router();
const controller = require('../controllers/superAdminAcademicsController');
const { protect } = require('../middlewares/authMiddleware'); // assuming protect is for super admin

// Protect all master academic routes with super admin protect middleware
router.use(protect);

// COURSES
router.route('/courses')
  .get(controller.getCourses)
  .post(controller.createCourse);
router.route('/courses/:id')
  .put(controller.updateCourse)
  .delete(controller.deleteCourse);

// DEPARTMENTS (BRANCHES)
router.route('/departments')
  .get(controller.getDepartments)
  .post(controller.createDepartment);
router.route('/departments/:id')
  .put(controller.updateDepartment)
  .delete(controller.deleteDepartment);

// SEMESTERS
router.route('/semesters')
  .get(controller.getSemesters)
  .post(controller.createSemester);
router.route('/semesters/:id')
  .put(controller.updateSemester)
  .delete(controller.deleteSemester);

// SUBJECTS
router.route('/subjects')
  .get(controller.getSubjects)
  .post(controller.createSubject);
router.route('/subjects/:id')
  .put(controller.updateSubject)
  .delete(controller.deleteSubject);

// DESIGNATIONS
router.route('/designations')
  .get(controller.getDesignations)
  .post(controller.createDesignation);
router.route('/designations/:id')
  .put(controller.updateDesignation)
  .delete(controller.deleteDesignation);

module.exports = router;
