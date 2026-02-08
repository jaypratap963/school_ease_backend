const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const superAdminController = require('../controllers/superadmin.controller');

router.get(
  '/schools',
  verifyToken,
  allowRoles('super_admin'),
  superAdminController.getSchools
);

router.post(
  '/schools',
  verifyToken,
  allowRoles('super_admin'),
  superAdminController.createSchool
);

router.post(
  '/school-admins',
  verifyToken,
  allowRoles('super_admin'),
  superAdminController.createSchoolAdmin
);


module.exports = router;