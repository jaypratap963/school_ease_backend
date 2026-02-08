const pool = require('../config/db');

exports.createSubject = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Subject name required' });
    }

    const result = await pool.query(
      `INSERT INTO subjects (school_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [req.user.school_id, name]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createSubject ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
