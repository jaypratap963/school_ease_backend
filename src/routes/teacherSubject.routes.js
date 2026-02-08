const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const controller = require('../controllers/teacherSubject.controller');

router.post(
  '/',
  verifyToken,
  allowRoles('school_admin'),
  controller.assignSubjectToTeacher
);

router.get(
  '/by-class/:classId',
  verifyToken,
  allowRoles('teacher'),
  controller.getSubjectsForTeacherClass
);


module.exports = router;
