const pool = require('../config/db');

exports.getTeacherAssignments = async (req, res) => {
  try {
    const user = req.user;

    const teacherRes = await pool.query(
      `SELECT id FROM teachers
       WHERE user_id = $1 AND school_id = $2`,
      [user.id, user.school_id]
    );

    if (!teacherRes.rows.length) {
      return res.status(403).json({ message: 'Not a teacher' });
    }

    const teacher_id = teacherRes.rows[0].id;

    const result = await pool.query(
      `
      SELECT
        c.id AS class_id,
        c.class_name,
        c.section,
        s.id AS subject_id,
        s.name AS subject_name
      FROM teacher_subjects ts
      JOIN classes c ON c.id = ts.class_id
      JOIN subjects s ON s.id = ts.subject_id
      WHERE ts.teacher_id = $1
        AND ts.school_id = $2
      ORDER BY c.class_name, c.section
      `,
      [teacher_id, user.school_id]
    );

    const grouped = {};

    for (const row of result.rows) {
      if (!grouped[row.class_id]) {
        grouped[row.class_id] = {
          class_id: row.class_id,
          class_name: row.class_name,
          section: row.section,
          subjects: []
        };
      }

      grouped[row.class_id].subjects.push({
        subject_id: row.subject_id,
        subject_name: row.subject_name
      });
    }

    res.json(Object.values(grouped));
  } catch (error) {
    console.error('getTeacherAssignments ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
