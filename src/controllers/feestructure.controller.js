const pool = require('../config/db');

exports.createFeeStructure = async (req, res) => {
  try {
    const { class_id, academic_session_id, name, frequency, total_amount } = req.body;
    const school_id = req.user.school_id;

    if (!class_id || !academic_session_id || !name || !frequency || !total_amount) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const result = await pool.query(
      `INSERT INTO fee_structures
       (school_id, class_id, academic_session_id, name, frequency, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [school_id, class_id, academic_session_id, name, frequency, total_amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createFeeStructure:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getFeeStructures = async (req, res) => {
  try {
    const { classId, sessionId } = req.query;

    const result = await pool.query(
      `SELECT * FROM fee_structures
       WHERE school_id = $1
       AND class_id = $2
       AND academic_session_id = $3
       AND is_active = true`,
      [req.user.school_id, classId, sessionId]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};
