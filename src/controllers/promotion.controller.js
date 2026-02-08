const pool = require('../config/db');

exports.promoteStudents = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      from_class_id,
      to_class_id,
      student_ids,
      from_session_id,
      to_session_id
    } = req.body;

    if (
      !from_class_id ||
      !to_class_id ||
      !from_session_id ||
      !to_session_id ||
      !Array.isArray(student_ids) ||
      !student_ids.length
    ) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    await client.query('BEGIN');

    // 1️⃣ Validate sessions
    const sessionCheck = await client.query(
      `SELECT id FROM academic_sessions
       WHERE id IN ($1,$2) AND school_id = $3`,
      [from_session_id, to_session_id, req.user.school_id]
    );

    if (sessionCheck.rowCount !== 2) {
      throw new Error('Invalid session');
    }

    // 2️⃣ Promote students
    for (const student_id of student_ids) {

      // Insert history
      await client.query(
        `INSERT INTO student_class_history
         (student_id, class_id, session_id, promoted_from)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (student_id, session_id) DO NOTHING`,
        [student_id, to_class_id, to_session_id, from_class_id]
      );

      // Update current class
      await client.query(
        `UPDATE students
         SET class_id = $1
         WHERE id = $2 AND school_id = $3`,
        [to_class_id, student_id, req.user.school_id]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Students promoted successfully' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Promote students error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
