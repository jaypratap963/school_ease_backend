const pool = require('../config/db');

exports.createClass = async (req, res) => {
  try {
    const { class_name, section } = req.body;
    const schoolId = req.user.school_id;

    if (!class_name || !section) {
      return res.status(400).json({ message: 'class_name and section are required' });
    }

    const result = await pool.query(
      `INSERT INTO classes (school_id, class_name, section)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [schoolId, class_name, section]
    );

    res.status(201).json({
      message: 'Class created successfully',
      class: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getTeacherClasses = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 🔴 IMPORTANT: adjust this line based on console output
    const userId = req.user.userId || req.user.id;

    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    // 1️⃣ Find teacher using user_id
    const teacherResult = await pool.query(
      `SELECT id 
       FROM teachers 
       WHERE user_id = $1 
       AND school_id = $2`,
      [userId, req.user.school_id]
    );

    if (!teacherResult.rows.length) {
      return res.status(403).json({ message: 'Teacher not found' });
    }

    const teacherId = teacherResult.rows[0].id;

    // 2️⃣ Fetch classes assigned to this teacher
    const classesResult = await pool.query(
      `SELECT id, class_name, section
       FROM classes
       WHERE teacher_id = $1
       AND school_id = $2`,
      [teacherId, req.user.school_id]
    );

    res.status(200).json(classesResult.rows);
  } catch (error) {
    console.error('getTeacherClasses ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
