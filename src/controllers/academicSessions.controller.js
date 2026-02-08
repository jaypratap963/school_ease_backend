const pool = require('../config/db');

/* ===============================
   GET ALL SESSIONS
================================ */
exports.getSessions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, start_date, end_date, is_active
       FROM academic_sessions
       WHERE school_id = $1
       ORDER BY start_date DESC`,
      [req.user.school_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ===============================
   CREATE SESSION
================================ */
exports.createSession = async (req, res) => {
  const { name, start_date, end_date } = req.body;

  if (!name || !start_date || !end_date) {
    return res.status(400).json({
      message: 'Name, start_date and end_date are required'
    });
  }

  try {
    const duplicate = await pool.query(
      `SELECT 1 FROM academic_sessions
       WHERE school_id = $1 AND name = $2`,
      [req.user.school_id, name]
    );

    if (duplicate.rowCount > 0) {
      return res.status(409).json({ message: 'Session already exists' });
    }

    const result = await pool.query(
      `INSERT INTO academic_sessions
       (school_id, name, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.school_id, name, start_date, end_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/* ===============================
   ACTIVATE SESSION
================================ */
exports.activateSession = async (req, res) => {
  const { session_id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // deactivate current
    await client.query(
      `UPDATE academic_sessions
       SET is_active = FALSE
       WHERE school_id = $1`,
      [req.user.school_id]
    );

    // activate selected
    const result = await client.query(
      `UPDATE academic_sessions
       SET is_active = TRUE
       WHERE id = $1 AND school_id = $2
       RETURNING *`,
      [session_id, req.user.school_id]
    );

    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Session not found' });
    }

    await client.query('COMMIT');
    res.json({ message: 'Session activated successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Activate session error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
