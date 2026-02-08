const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const teacherController = require('../controllers/teacher.controller');
const teacherDashboardController = require('../controllers/teacherDashboard.controller');
const teacherAnalyticsController = require('../controllers/teacherAnalytics.controller');

router.get(
  '/attendance/summary',
  verifyToken,
  allowRoles('teacher'),
  teacherAnalyticsController.classAttendanceSummary
);
router.get(
  '/attendance/students',
  verifyToken,
  allowRoles('teacher'),
  teacherAnalyticsController.studentAttendance
);
router.get(
  '/marks/subject-summary',
  verifyToken,
  allowRoles('teacher'),
  teacherAnalyticsController.subjectPerformance
);
router.get(
  '/marks/student-marks',
  verifyToken,
  allowRoles('teacher'),
  teacherAnalyticsController.studentMarks
);

router.get(
  '/assignments',
  verifyToken,
  allowRoles('teacher'),
  teacherController.getTeacherAssignments
);

router.get(
  '/dashboard',
  verifyToken,
  allowRoles('teacher'),
  teacherDashboardController.getDashboard
);


module.exports = router;
