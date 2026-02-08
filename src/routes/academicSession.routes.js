const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const controller = require('../controllers/academicSessions.controller');

router.get(
  '/',
  verifyToken,
  allowRoles('school_admin'),
  controller.getSessions
);

router.post(
  '/',
  verifyToken,
  allowRoles('school_admin'),
  controller.createSession
);

router.patch(
  '/:session_id/activate',
  verifyToken,
  allowRoles('school_admin'),
  controller.activateSession
);

module.exports = router;
