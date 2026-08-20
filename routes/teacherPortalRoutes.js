const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const teacherPortalController = require('../controllers/teacherPortalController');
const { collegeProtect } = require('../middlewares/authMiddleware');

const noticeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../uploads/notices');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const uploadNotice = multer({ storage: noticeStorage });

router.route('/dashboard-stats')
  .get(collegeProtect, teacherPortalController.getDashboardStats);

router.route('/my-classes')
  .get(collegeProtect, teacherPortalController.getMyClasses);

router.route('/class/:classId/students')
  .get(collegeProtect, teacherPortalController.getClassStudents);

router.route('/class/:classId/attendance')
  .get(collegeProtect, teacherPortalController.getClassAttendance)
  .post(collegeProtect, teacherPortalController.saveClassAttendance);

router.route('/class/:classId/attendance/history')
  .get(collegeProtect, teacherPortalController.getClassAttendanceHistory);

router.route('/class/:classId/student/:studentId/attendance/history')
  .get(collegeProtect, teacherPortalController.getSingleStudentAttendanceHistory);

router.route('/class/:classId/geofence')
  .put(collegeProtect, teacherPortalController.updateGeoFence);

router.route('/class/:classId/notices')
  .get(collegeProtect, teacherPortalController.getClassNotices)
  .post(collegeProtect, uploadNotice.fields([{ name: 'pdfs', maxCount: 10 }, { name: 'images', maxCount: 10 }]), teacherPortalController.createClassNotice);

router.route('/class/:classId/notices/:noticeId')
  .delete(collegeProtect, teacherPortalController.deleteClassNotice);

router.route('/class/:classId/study-materials')
  .get(collegeProtect, teacherPortalController.getClassStudyMaterials)
  .post(collegeProtect, teacherPortalController.uploadStudyMaterial);

router.route('/class/:classId/assignments')
  .get(collegeProtect, teacherPortalController.getClassAssignments)
  .post(collegeProtect, teacherPortalController.createAssignment);

router.route('/my-complaints')
  .get(collegeProtect, teacherPortalController.getMyComplaints)
  .post(collegeProtect, teacherPortalController.submitComplaint);

router.route('/live-notifications')
  .get(collegeProtect, teacherPortalController.getLiveNotifications)
  .put(collegeProtect, teacherPortalController.markNotificationsRead);

router.route('/assignments/:assignmentId/submissions')
  .get(collegeProtect, teacherPortalController.getAssignmentSubmissions);

router.route('/assignments/:assignmentId/submissions/:submissionId/grade')
  .post(collegeProtect, teacherPortalController.gradeSubmission);

module.exports = router;
