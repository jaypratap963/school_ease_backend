const express = require('express');
const router = express.Router();
const controller = require('../controllers/timetable.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

router.post(
  '/',
  verifyToken,
  allowRoles('school_admin'),
  controller.createOrGetTimetable
);

router.post(
  '/period',
  verifyToken,
  allowRoles('school_admin'),
  controller.addTimetablePeriod
);

router.get(
  '/class',
  verifyToken,
  allowRoles('school_admin', 'teacher'),
  controller.getClassTimetable
);

router.get(
  '/teacher',
  verifyToken,
  allowRoles('teacher'),
  controller.getTeacherTimetable
);

module.exports = router;
