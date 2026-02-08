const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const systemController = require('../controllers/system.controller');

// Accessible to all logged-in users
router.get(
  '/date',
  verifyToken,
  systemController.getSystemDate
);

module.exports = router;
