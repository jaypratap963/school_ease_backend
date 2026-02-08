const pool = require('../config/db');

/**
 * Attendance – Overall summary
 */
exports.attendanceSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        ROUND(
          100.0 * SUM(CASE WHEN status = 'P' THEN 1 ELSE 0 END) / COUNT(*),
          2
        ) AS percentage
      FROM attendance
      WHERE school_id = $1
      `,
      [req.user.school_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('attendanceSummary', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Attendance – Class-wise
 */
exports.attendanceByClass = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.class_name,
        c.section,
        ROUND(
          100.0 * SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) / COUNT(*),
          2
        ) AS percentage
      FROM attendance a
      JOIN classes c ON c.id = a.class_id
      WHERE a.school_id = $1
      GROUP BY c.id
      ORDER BY c.class_name
      `,
      [req.user.school_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('attendanceByClass', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Attendance – Risk students (<60%)
 */
exports.attendanceRiskStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        s.name,
        c.class_name,
        ROUND(
          100.0 * SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) / COUNT(*),
          2
        ) AS percentage
      FROM attendance a
      JOIN students s ON s.id = a.student_id
      JOIN classes c ON c.id = a.class_id
      WHERE a.school_id = $1
      GROUP BY s.id, c.class_name
      HAVING
        100.0 * SUM(CASE WHEN a.status = 'P' THEN 1 ELSE 0 END) / COUNT(*) < 60
      ORDER BY percentage
      `,
      [req.user.school_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('attendanceRiskStudents', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Marks – Exam-wise
 */
exports.marksByExam = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        e.name AS exam_name,
        ROUND(AVG(m.marks_obtained), 2) AS avg_marks
      FROM marks m
      JOIN exams e ON e.id = m.exam_id
      WHERE m.school_id = $1
      GROUP BY e.id
      ORDER BY e.id
      `,
      [req.user.school_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('marksByExam', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Marks – Class-wise
 */
exports.marksByClass = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        c.class_name,
        c.section,
        ROUND(AVG(m.marks_obtained), 2) AS avg_marks
      FROM marks m
      JOIN classes c ON c.id = m.class_id
      WHERE m.school_id = $1
      GROUP BY c.id
      ORDER BY c.class_name
      `,
      [req.user.school_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('marksByClass', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Marks – Risk students (<40%)
 */
exports.marksRiskStudents = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        s.name,
        c.class_name,
        ROUND(AVG(m.marks_obtained), 2) AS marks
      FROM marks m
      JOIN students s ON s.id = m.student_id
      JOIN classes c ON c.id = m.class_id
      WHERE m.school_id = $1
      GROUP BY s.id, c.class_name
      HAVING AVG(m.marks_obtained) < 40
      ORDER BY marks
      `,
      [req.user.school_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('marksRiskStudents', err);
    res.status(500).json({ message: 'Server error' });
  }
};
