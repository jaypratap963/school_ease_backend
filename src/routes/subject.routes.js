const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const subjectController = require('../controllers/subject.controller');

router.post(
  '/',
  verifyToken,
  allowRoles('school_admin', 'super_admin'),
  subjectController.createSubject
);

module.exports = router;
