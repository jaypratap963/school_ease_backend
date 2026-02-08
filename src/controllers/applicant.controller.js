const pool = require('../config/db');

/**
 * Generate Application No
 * Format: APP-2025-00001
 */
async function generateApplicationNo(schoolId) {
  const res = await pool.query(
    `SELECT COUNT(*) FROM applicants WHERE school_id = $1`,
    [schoolId]
  );
  const count = Number(res.rows[0].count) + 1;
  return `APP-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
}

/**
 * CREATE Applicant
 */
exports.createApplicant = async (req, res) => {
  try {
    const user = req.user;
    const {
      academic_session_id,
      first_name,
      last_name,
      gender,
      dob,
      phone,
      email,
      applying_class
    } = req.body;

    if (!academic_session_id || !first_name || !phone || !applying_class) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const applicationNo = await generateApplicationNo(user.school_id);

    const result = await pool.query(
      `INSERT INTO applicants
       (school_id, academic_session_id, application_no,
        first_name, last_name, gender, dob,
        phone, email, applying_class, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        user.school_id,
        academic_session_id,
        applicationNo,
        first_name,
        last_name,
        gender,
        dob,
        phone,
        email,
        applying_class,
        user.id
      ]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * LIST Applicants
 */
exports.getApplicants = async (req, res) => {
  try {
    const user = req.user;

    const result = await pool.query(
      `SELECT *
       FROM applicants
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [user.school_id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * SUBMIT Applicant (locks editing)
 */
exports.submitApplicant = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      `UPDATE applicants
       SET status = 'SUBMITTED'
       WHERE id = $1 AND status = 'DRAFT'`,
      [id]
    );

    res.json({ message: 'Applicant submitted for entrance exam' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
