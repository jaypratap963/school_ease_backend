const pool = require('../config/db');

/**
 * Mock fee payment
 */
exports.payInstallment = async (req, res) => {
  const { applicant_id, installment_id, amount_paid } = req.body;

  if (!applicant_id || !installment_id || !amount_paid) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  // Prevent duplicate payment
  const existing = await pool.query(
    `SELECT id FROM fee_transactions
     WHERE installment_id = $1 AND payment_status = 'SUCCESS'`,
    [installment_id]
  );

  if (existing.rowCount) {
    return res.status(409).json({ message: 'Installment already paid' });
  }

  await pool.query(
    `INSERT INTO fee_transactions
     (applicant_id, installment_id, amount_paid, payment_mode, payment_status, paid_at)
     VALUES ($1,$2,$3,'MOCK','SUCCESS',NOW())`,
    [applicant_id, installment_id, amount_paid]
  );

  res.json({ message: 'Payment successful' });
};

exports.getAdmissionFees = async (req, res) => {
  const result = await pool.query(
    `SELECT
       fp.id,
       fp.amount,
       fp.status,
       a.full_name AS applicant_name
     FROM fee_payments fp
     JOIN applicants a ON a.id = fp.applicant_id
     WHERE fp.school_id = $1
       AND fp.purpose = 'ADMISSION'
     ORDER BY fp.created_at DESC`,
    [req.user.school_id]
  );

  res.json(result.rows);
};



exports.payAdmissionFee = async (req, res) => {
  const { fee_payment_id } = req.body;

  if (!fee_payment_id) {
    return res.status(400).json({ message: 'fee_payment_id required' });
  }

  const fee = await pool.query(
    `UPDATE fee_payments
     SET payment_type = 'MOCK',
         payment_status = 'PAID',
         transaction_ref = 'MOCK-' || id,
         paid_at = NOW(),
         status = 'PAID'
     WHERE id = $1 AND status = 'PENDING'
     RETURNING *`,
    [fee_payment_id]
  );

  if (!fee.rows.length) {
    return res.status(400).json({ message: 'Invalid or already paid fee' });
  }

  res.json({
    message: 'Admission fee paid successfully',
    fee: fee.rows[0]
  });
};

exports.getPaidAdmissionFees = async (req, res) => {
  const result = await pool.query(
    `SELECT
       fp.id,
       fp.amount,
       a.full_name AS applicant_name
     FROM fee_payments fp
     JOIN applicants a ON a.id = fp.applicant_id
     WHERE fp.school_id = $1
       AND fp.purpose = 'ADMISSION'
       AND fp.status = 'PAID'
       AND fp.student_id IS NULL`,
    [req.user.school_id]
  );

  res.json(result.rows);
};
