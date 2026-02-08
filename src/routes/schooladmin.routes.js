const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const schoolAdminController = require('../controllers/schooladmin.controller');
const studentController = require('../controllers/student.controller');
const promotionController = require('../controllers/promotion.controller');

router.get(
  '/dashboard',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.getDashboard
);

router.get(
  '/attendance/overview',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.schoolAttendanceOverview
);

router.get(
  '/exam-completion',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.examCompletion
);

/* =======================
   TEACHERS
======================= */
router.get(
  '/teachers',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.getTeachers
);

router.post(
  '/teachers',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.createTeacher
);

/* =======================
   CLASSES
======================= */
router.get(
  '/classes',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.getClasses
);

router.post(
  '/classes',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.createClass
);

/* =======================
   SUBJECTS
======================= */
router.get(
  '/subjects',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.getSubjects
);

router.post(
  '/subjects',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.createSubject
);

/* =======================
   STUDENTS  ✅ MISSING PART
======================= */
router.post(
  '/students',
  verifyToken,
  allowRoles('school_admin'),
  studentController.createStudent
);

router.get(
  '/students/:classId',
  verifyToken,
  allowRoles('school_admin'),
  studentController.getStudentsByClass
);

/* =======================
   TEACHER ↔ SUBJECT ↔ CLASS
======================= */
router.get(
  '/assignments',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.getAssignments
);

router.post(
  '/assign-teacher-subject',
  verifyToken,
  allowRoles('school_admin'),
  schoolAdminController.assignTeacherSubject
);

router.post(
  '/promote-students',
  verifyToken,
  allowRoles('school_admin'),
  promotionController.promoteStudents
);
module.exports = router;
