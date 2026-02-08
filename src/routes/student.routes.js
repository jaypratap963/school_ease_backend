const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const studentController = require('../controllers/student.controller');

router.post(
  '/create',
  verifyToken,
  allowRoles('school_admin'),
  studentController.createStudent
);
router.get(
  '/by-class/:classId',
  verifyToken,
  allowRoles('teacher'),
  studentController.getStudentsByClass
);
module.exports = router;
