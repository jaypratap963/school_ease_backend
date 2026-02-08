const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const classController = require('../controllers/class.controller');

router.post(
  '/create',
  verifyToken,
  allowRoles('school_admin'),
  classController.createClass
);
router.post('/',  verifyToken,
  allowRoles('teacher'),
  classController.createClass);

// new
router.get('/teacher',  verifyToken,
  allowRoles('teacher'),
  classController.getTeacherClasses);
module.exports = router;
