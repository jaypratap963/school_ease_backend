const pool = require('../config/db');

/**
 * Create admission offer for QUALIFIED applicant
 */
exports.createOffer = async (req, res) => {
  const { applicant_id, class_id } = req.body;
  const school_id = req.user.school_id;

  if (!applicant_id || !class_id) {
    return res.status(400).json({ message: 'applicant_id and class_id required' });
  }

  const applicant = await pool.query(
    `SELECT id, status FROM applicants
     WHERE id = $1 AND school_id = $2`,
    [applicant_id, school_id]
  );

  if (!applicant.rows.length || applicant.rows[0].status !== 'QUALIFIED') {
    return res.status(400).json({ message: 'Applicant not qualified' });
  }

  const offer = await pool.query(
    `INSERT INTO admission_offers
     (school_id, applicant_id, class_id, status)
     VALUES ($1,$2,$3,'OFFERED')
     RETURNING *`,
    [school_id, applicant_id, class_id]
  );

  res.status(201).json(offer.rows[0]);
};

exports.acceptOffer = async (req, res) => {
  const { offerId } = req.params;

  const offer = await pool.query(
    `UPDATE admission_offers
     SET status = 'ACCEPTED', accepted_at = NOW()
     WHERE id = $1 AND status = 'OFFERED'
     RETURNING *`,
    [offerId]
  );

  if (!offer.rows.length) {
    return res.status(400).json({ message: 'Invalid offer state' });
  }

  res.json(offer.rows[0]);
};

exports.createAdmissionFee = async (req, res) => {
  const { offer_id, amount } = req.body;
  const school_id = req.user.school_id;

  const offer = await pool.query(
    `SELECT * FROM admission_offers
     WHERE id = $1 AND school_id = $2 AND status = 'ACCEPTED'`,
    [offer_id, school_id]
  );

  if (!offer.rows.length) {
    return res.status(400).json({ message: 'Offer not accepted' });
  }

  const fee = await pool.query(
    `INSERT INTO fee_payments
     (school_id, applicant_id, amount, purpose, status)
     VALUES ($1,$2,$3,'ADMISSION','PENDING')
     RETURNING *`,
    [
      school_id,
      offer.rows[0].applicant_id,
      amount
    ]
  );

  res.status(201).json(fee.rows[0]);
};


const generateEnrollmentNo = require('../utils/enrollment.generator');

exports.convertToStudent = async (req, res) => {
  const { fee_payment_id } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const fee = await client.query(
      `SELECT * FROM fee_payments
       WHERE id = $1 AND status = 'PAID'`,
      [fee_payment_id]
    );

    if (!fee.rows.length) {
      throw new Error('Fee not paid');
    }

    const offer = await client.query(
      `SELECT * FROM admission_offers
       WHERE applicant_id = $1 AND offer_status = 'ACCEPTED'`,
      [fee.rows[0].applicant_id]
    );

    if (!offer.rows.length) {
      throw new Error('No valid offer');
    }

    const enrollment_no = await generateEnrollmentNo(
      fee.rows[0].school_id,
      null
    );

    const student = await client.query(
      `INSERT INTO students
       (school_id, class_id, enrollment_no, name)
       SELECT school_id, class_id, enrollment_no, full_name
       FROM applicants WHERE id = $1
       RETURNING *`,
      [fee.rows[0].applicant_id]
    );

    await client.query(
      `UPDATE admission_offers
       SET status = 'ENROLLED'
       WHERE id = $1`,
      [offer.rows[0].id]
    );

    await client.query(
      `UPDATE applicants
       SET status = 'ADMITTED'
       WHERE id = $1`,
      [fee.rows[0].applicant_id]
    );

    await client.query(
      `UPDATE fee_payments
       SET student_id = $1
       WHERE id = $2`,
      [student.rows[0].id, fee_payment_id]
    );

    await client.query('COMMIT');
    res.json(student.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};
