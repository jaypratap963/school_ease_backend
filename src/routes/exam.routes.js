const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const examController = require('../controllers/exam.controller');

router.get(
  '/',
  verifyToken,
  allowRoles('teacher', 'school_admin'),
  examController.getAllExams
);

// CREATE exam (school admin only)
router.post(
  '/',
  verifyToken,
  allowRoles('school_admin'),
  examController.createExam
);

module.exports = router;
