const generateEnrollmentNo = require('../utils/enrollment.generator');
const pool = require('../config/db');

exports.convertToStudent = async (req, res) => {
  const { fee_payment_id } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Fee must be PAID
    const feeRes = await client.query(
      `SELECT * FROM fee_payments
       WHERE id = $1 AND status = 'PAID'`,
      [fee_payment_id]
    );

    if (!feeRes.rows.length) {
      throw new Error('Fee not paid');
    }

    const fee = feeRes.rows[0];

    // 2️⃣ Accepted offer
    const offerRes = await client.query(
      `SELECT * FROM admission_offers
       WHERE applicant_id = $1
         AND offer_status = 'ACCEPTED'`,
      [fee.applicant_id]
    );

    if (!offerRes.rows.length) {
      throw new Error('No accepted admission offer');
    }

    const offer = offerRes.rows[0];

    // 3️⃣ Fetch applicant data
    const applicantRes = await client.query(
      `SELECT * FROM applicants WHERE id = $1`,
      [fee.applicant_id]
    );

    if (!applicantRes.rows.length) {
      throw new Error('Applicant not found');
    }

    const applicant = applicantRes.rows[0];

    // 4️⃣ Generate enrollment number
    const enrollmentNo = await generateEnrollmentNo(
      fee.school_id,
      offer.academic_session_id
    );

    // 5️⃣ Insert student (explicit mapping)
    const studentRes = await client.query(
      `INSERT INTO students (
        school_id,
        academic_session_id,
        class_id,
        applicant_id,
        enrollment_no,
        name,
        parent_phone,
        parent_email,
        admission_date,
        admission_type,
        status,
        enrollment_date,
        is_legacy
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,NOW(),'NEW','ACTIVE',NOW(),false
      )
      RETURNING *`,
      [
        fee.school_id,
        offer.academic_session_id,
        offer.offered_class_id,
        applicant.id,
        enrollmentNo,
        applicant.full_name,
        applicant.primary_contact,
        applicant.email
      ]
    );

    // 6️⃣ Update admission offer
    await client.query(
      `UPDATE admission_offers
       SET offer_status = 'ACCEPTED'
       WHERE id = $1`,
      [offer.id]
    );

    // 7️⃣ Update applicant
    await client.query(
      `UPDATE applicants
       SET status = 'ADMITTED'
       WHERE id = $1`,
      [applicant.id]
    );

    // 8️⃣ Link fee → student
    await client.query(
      `UPDATE fee_payments
       SET student_id = $1
       WHERE id = $2`,
      [studentRes.rows[0].id, fee_payment_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Student enrolled successfully',
      student: studentRes.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};


exports.generateEnrollment = async (req, res) => {
  const { fee_payment_id } = req.body;
  const school_id = req.user.school_id;

  if (!fee_payment_id) {
    return res.status(400).json({ message: 'fee_payment_id required' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validate paid admission fee
    const feeRes = await client.query(
      `SELECT * FROM fee_payments
       WHERE id = $1
         AND school_id = $2
         AND purpose = 'ADMISSION'
         AND status = 'PAID'`,
      [fee_payment_id, school_id]
    );

    if (!feeRes.rows.length) {
      throw new Error('Valid paid admission fee not found');
    }

    const fee = feeRes.rows[0];

    // 2. Prevent double enrollment
    const existingStudent = await client.query(
      `SELECT id FROM students WHERE applicant_id = $1`,
      [fee.applicant_id]
    );

    if (existingStudent.rows.length) {
      throw new Error('Student already enrolled');
    }

    // 3. Get offer
    const offerRes = await client.query(
      `SELECT * FROM admission_offers
       WHERE applicant_id = $1
         AND school_id = $2
         AND offer_status = 'ACCEPTED'`,
      [fee.applicant_id, school_id]
    );

    if (!offerRes.rows.length) {
      throw new Error('Accepted admission offer not found');
    }

    const offer = offerRes.rows[0];

    // 4. Generate enrollment number
    const enrollmentNo = await generateEnrollmentNo(
      school_id,
      offer.academic_session_id
    );

    // 5. Create student
    const studentRes = await client.query(
      `INSERT INTO students
       (
         school_id,
         applicant_id,
         academic_session_id,
         class_id,
         enrollment_no,
         name,
         status
       )
       SELECT
         school_id,
         id,
         $2,
         $3,
         $4,
         full_name,
         'ACTIVE'
       FROM applicants
       WHERE id = $1
       RETURNING *`,
      [
        fee.applicant_id,
        offer.academic_session_id,
        offer.offered_class_id,
        enrollmentNo
      ]
    );

    // 6. Update applicant + offer + fee
    await client.query(
      `UPDATE applicants SET status = 'ADMITTED' WHERE id = $1`,
      [fee.applicant_id]
    );

    await client.query(
      `UPDATE admission_offers SET offer_status = 'ACCEPTED' WHERE id = $1`,
      [offer.id]
    );

    await client.query(
      `UPDATE fee_payments SET student_id = $1 WHERE id = $2`,
      [studentRes.rows[0].id, fee_payment_id]
    );

    await client.query('COMMIT');

    res.json({
      message: 'Student enrolled successfully',
      student: studentRes.rows[0]
    });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};
