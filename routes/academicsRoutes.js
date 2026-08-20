const express = require('express');
const router = express.Router();
const academicsController = require('../controllers/academicsController');
const { collegeProtect } = require('../middlewares/authMiddleware');

// ============ DEPARTMENTS ============
router.route('/departments')
  .get(collegeProtect, academicsController.getDepartments)
  .post(collegeProtect, academicsController.createDepartment);

router.route('/departments/:id')
  .get(collegeProtect, academicsController.getDepartmentById)
  .put(collegeProtect, academicsController.updateDepartment)
  .delete(collegeProtect, academicsController.deleteDepartment);

// ============ COURSES ============
router.route('/courses')
  .get(collegeProtect, academicsController.getCourses)
  .post(collegeProtect, academicsController.createCourse);

router.route('/courses/:id')
  .get(collegeProtect, academicsController.getCourseById)
  .put(collegeProtect, academicsController.updateCourse)
  .delete(collegeProtect, academicsController.deleteCourse);

// ============ SEMESTERS ============
router.route('/semesters')
  .get(collegeProtect, academicsController.getSemesters)
  .post(collegeProtect, academicsController.createSemester);

router.route('/semesters/:id')
  .get(collegeProtect, academicsController.getSemesterById)
  .put(collegeProtect, academicsController.updateSemester)
  .delete(collegeProtect, academicsController.deleteSemester);

// ============ SUBJECTS ============
router.route('/subjects')
  .get(collegeProtect, academicsController.getSubjects)
  .post(collegeProtect, academicsController.createSubject);

router.route('/subjects/:id')
  .get(collegeProtect, academicsController.getSubjectById)
  .put(collegeProtect, academicsController.updateSubject)
  .delete(collegeProtect, academicsController.deleteSubject);

// ============ SECTIONS ============
router.route('/sections')
  .get(collegeProtect, academicsController.getSections)
  .post(collegeProtect, academicsController.createSection);

router.route('/sections/:id')
  .get(collegeProtect, academicsController.getSectionById)
  .put(collegeProtect, academicsController.updateSection)
  .delete(collegeProtect, academicsController.deleteSection);


// ============ SUBJECT ALLOCATIONS ============
router.route('/allocations')
  .get(collegeProtect, academicsController.getAllocations)
  .post(collegeProtect, academicsController.createAllocation);

router.route('/allocations/:id')
  .put(collegeProtect, academicsController.updateAllocation)
  .delete(collegeProtect, academicsController.deleteAllocation);

module.exports = router;
