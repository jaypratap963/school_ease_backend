const pool = require('../config/db');

exports.createStudent = async (req, res) => {
  try {
    const { name, roll_no, class_id } = req.body;
    const schoolId = req.user.school_id;

    if (!name || !class_id) {
      return res.status(400).json({ message: 'name and class_id are required' });
    }

    const result = await pool.query(
      `INSERT INTO students (school_id, class_id, roll_no, name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [schoolId, class_id, roll_no || null, name]
    );

    res.status(201).json({
      message: 'Student created successfully',
      student: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getStudentsByClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: 'classId is required' });
    }

    const result = await pool.query(
      `SELECT id, name
       FROM students
       WHERE class_id = $1
       AND school_id = $2
       ORDER BY name`,
      [classId, req.user.school_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getStudentsByClass ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};