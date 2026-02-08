const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');
const marksController = require('../controllers/marks.controller');

router.post(
  '/',
  verifyToken,
  allowRoles('teacher'),
  marksController.enterMarks
);

router.get('/', verifyToken, allowRoles('teacher','school_admin'), marksController.getMarks);

router.post('/save', verifyToken, allowRoles('teacher'), marksController.saveMarks);

router.post('/lock', verifyToken, allowRoles('teacher'), marksController.lockMarks);


module.exports = router;
