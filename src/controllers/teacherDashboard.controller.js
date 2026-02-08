const pool = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const schoolId = req.user.school_id;

    // 1️⃣ Active session
    const sessionRes = await pool.query(
      `SELECT id, name
       FROM academic_sessions
       WHERE school_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [schoolId]
    );

    if (!sessionRes.rows.length) {
      return res.json({ message: 'No active session' });
    }

    const session = sessionRes.rows[0];

    // 2️⃣ Teacher
    const teacherRes = await pool.query(
      `SELECT id, name
       FROM teachers
       WHERE user_id = $1 AND school_id = $2`,
      [userId, schoolId]
    );

    if (!teacherRes.rows.length) {
      return res.status(403).json({ message: 'Not a teacher' });
    }

    const teacherId = teacherRes.rows[0].id;

    // 3️⃣ Classes + subjects
    const assignments = await pool.query(
      `SELECT
         c.id AS class_id,
         c.class_name,
         c.section,
         s.id AS subject_id,
         s.name AS subject_name
       FROM teacher_subjects ts
       JOIN classes c ON c.id = ts.class_id
       JOIN subjects s ON s.id = ts.subject_id
       WHERE ts.teacher_id = $1`,
      [teacherId]
    );

    // 4️⃣ Student count per class
    const studentCounts = await pool.query(
      `SELECT class_id, COUNT(*) AS total
       FROM students
       WHERE school_id = $1
       GROUP BY class_id`,
      [schoolId]
    );

    res.json({
      session,
      teacher: teacherRes.rows[0],
      assignments: assignments.rows,
      studentCounts: studentCounts.rows
    });

  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
