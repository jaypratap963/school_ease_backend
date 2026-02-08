const pool = require('../config/db');
const generateApplicationNo = require('../utils/generateApplicationNo');

exports.createApplicant = async (req, res) => {
  try {
    const {
      full_name,
      gender,
      dob,
      applying_class_id,
      father_name,
      mother_name,
      primary_contact,
      alternate_contact,
      email,
      address
    } = req.body;

    if (!full_name || !applying_class_id || !primary_contact) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const application_no = await generateApplicationNo();

    const result = await pool.query(
      `INSERT INTO applicants (
        school_id, application_no, full_name, gender, dob,
        applying_class_id, father_name, mother_name,
        primary_contact, alternate_contact, email, address,
        created_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )
      RETURNING *`,
      [
        req.user.school_id,
        application_no,
        full_name,
        gender,
        dob,
        applying_class_id,
        father_name,
        mother_name,
        primary_contact,
        alternate_contact,
        email,
        address,
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('createApplicant ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getApplicants = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, application_no, full_name, status, applying_class_id, created_at
       FROM applicants
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [req.user.school_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getApplicantById = async (req, res) => {
  try {
    const applicantId = Number(req.params.id);

    if (!applicantId) {
      return res.status(400).json({ message: 'Invalid applicant id' });
    }

    const result = await pool.query(
      `SELECT *
       FROM applicants
       WHERE id = $1
         AND school_id = $2`,
      [applicantId, req.user.school_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Applicant not found' });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error('getApplicantById ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



exports.getQualifiedApplicants = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, full_name
       FROM applicants
       WHERE school_id = $1
         AND status = 'qualified'
       ORDER BY id DESC`,
      [req.user.school_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error('getQualifiedApplicants ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

