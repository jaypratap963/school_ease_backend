const express = require('express');
const router = express.Router();

const { verifyToken } = require('../middlewares/auth.middleware');
const { allowRoles } = require('../middlewares/role.middleware');

const applicantCtrl = require('../controllers/admissionApplicant.controller');
const examCtrl = require('../controllers/entranceExam.controller');
const evalCtrl = require('../controllers/entranceEvaluation.controller');
const admissionController = require('../controllers/admission.controller');
const feeController = require('../controllers/fee.controller');
const admissionFeeCtrl = require('../controllers/admissionFee.controller');
const paymentController = require('../controllers/payment.controller');
const enrollmentController = require('../controllers/enrollment.controller');

router.use(verifyToken);

// Applicants
// Applicants
router.post('/applicants', allowRoles('school_admin','super_admin'), applicantCtrl.createApplicant);

// ✅ SPECIFIC routes FIRST
router.get('/applicants/qualified', allowRoles('school_admin','super_admin'), applicantCtrl.getQualifiedApplicants);

// ❌ GENERIC routes LAST
router.get('/applicants/:id', allowRoles('school_admin','super_admin'), applicantCtrl.getApplicantById);
router.get('/applicants', allowRoles('school_admin','super_admin'), applicantCtrl.getApplicants);



// Entrance Exam
router.post('/entrance-exams', allowRoles('school_admin'), examCtrl.assignExam);
router.get('/entrance-exams/:applicantId', allowRoles('school_admin'), examCtrl.getExamByApplicant);

// Evaluation
router.post(
  '/entrance-exams/:examId/evaluate',
  allowRoles('school_admin','teacher'),
  evalCtrl.evaluateExam
);

router.post('/fees/admission', allowRoles('school_admin'), admissionFeeCtrl.createAdmissionFee);
router.get(
  '/fees/admission',
  allowRoles('school_admin'),
  paymentController.getAdmissionFees
);
router.post('/fees/pay', allowRoles('school_admin'), paymentController.payAdmissionFee);
router.get('/fees/paid', allowRoles('school_admin'), paymentController.getPaidAdmissionFees);
router.post('/enrollment/convert', allowRoles('school_admin'), enrollmentController.convertToStudent);


// admission.routes.js
router.post('/offers', verifyToken, allowRoles('school_admin'), admissionController.createOffer);
router.patch('/offer/respond', verifyToken, admissionController.respondToOffer);
router.get(
  '/offers',
  verifyToken,
  allowRoles('school_admin'),
  admissionController.getOffers
);

// fee.routes.js
router.post('/structure', verifyToken, allowRoles('school_admin'), feeController.createFeeStructure);
router.post('/installments', verifyToken, allowRoles('school_admin'), feeController.createInstallments);

// payment.routes.js
router.post('/pay', verifyToken, paymentController.payInstallment);

// enrollment.routes.js
router.post(
  '/enrollment/generate',
  allowRoles('school_admin'),
  enrollmentController.generateEnrollment
);


const controller = require('../controllers/applicant.controller');

router.use(verifyToken);
router.use(allowRoles('school_admin'));

router.post('/applicants', controller.createApplicant);
router.get('/applicants', controller.getApplicants);
router.patch('/applicants/:id/submit', controller.submitApplicant);

module.exports = router;
