const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

// Controllers
const feeStructureController = require('../controllers/feestructure.controller');
const feeScheduleController = require('../controllers/feeSchedule.controller');
const feeDemandController = require('../controllers/feeDemand.controller');
const feePaymentController = require('../controllers/feePayment.controller');

/**
 * All routes:
 * - Auth required
 * - School Admin only
 */
router.use(verifyToken);
router.use(allowRoles('school_admin'));


// =======================
// Fee Structures
// =======================
router.post(
  '/structures',
  feeStructureController.createFeeStructure
);

router.get(
  '/structures',
  feeStructureController.getFeeStructures
);


// =======================
// Fee Schedules
// =======================
router.post(
  '/schedules',
  feeScheduleController.createFeeSchedule
);

router.get(
  '/schedules/:feeStructureId',
  feeScheduleController.getFeeSchedules
);


// =======================
// Fee Demands
// =======================
router.post(
  '/demands/generate',
  feeDemandController.generateFeeDemandsForClass
);

router.get(
  '/demands/student/:studentId',
  feeDemandController.getStudentFeeDemands
);


// =======================
// Fee Payments
// =======================
router.post(
  '/payments/pay',
  feePaymentController.payFeeDemand
);

module.exports = router;
