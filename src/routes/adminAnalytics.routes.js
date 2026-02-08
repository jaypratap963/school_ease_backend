const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const controller = require('../controllers/adminAnalytics.controller');

router.use(verifyToken);
router.use(allowRoles('school_admin', 'super_admin'));

// Attendance
router.get('/attendance/summary', controller.attendanceSummary);
router.get('/attendance/classes', controller.attendanceByClass);
router.get('/attendance/risk-students', controller.attendanceRiskStudents);

// Marks
router.get('/marks/exams', controller.marksByExam);
router.get('/marks/classes', controller.marksByClass);
router.get('/marks/risk-students', controller.marksRiskStudents);

module.exports = router;
