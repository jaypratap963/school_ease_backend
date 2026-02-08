const pool = require('../config/db');

// GET all exams (teacher + admin)
exports.getAllExams = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, max_marks
       FROM exams
       WHERE school_id = $1
       ORDER BY id`,
      [req.user.school_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getAllExams ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST create exam (school admin only)
exports.createExam = async (req, res) => {
  try {
    const { name, max_marks } = req.body;

    if (!name || !max_marks) {
      return res.status(400).json({ message: 'Name and max_marks required' });
    }

    const result = await pool.query(
      `INSERT INTO exams (school_id, name, max_marks)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.school_id, name, max_marks]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('createExam ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
