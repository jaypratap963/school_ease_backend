const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const attendanceController = require('../controllers/attendance.controller');

router.get(
  '/',
  verifyToken,
  allowRoles('teacher','school_admin','super_admin'),
  attendanceController.getAttendanceByDate
);

router.post(
  '/save',
  verifyToken,
  allowRoles('teacher','school_admin','super_admin'),
  attendanceController.saveAttendance
);


module.exports = router;
