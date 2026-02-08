const pool = require('../config/db');

exports.classAttendanceSummary = async (req, res) => {
  try {
    const { classId } = req.query;
    const schoolId = req.user.school_id;

    const result = await pool.query(
      `
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'P') AS present
      FROM attendance
      WHERE class_id = $1
        AND school_id = $2
      `,
      [classId, schoolId]
    );

    const { total, present } = result.rows[0];
    const percentage = total
      ? ((present * 100) / total).toFixed(2)
      : 0;

    res.json({
      total,
      present,
      percentage
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.studentAttendance = async (req, res) => {
  const { classId } = req.query;
  const schoolId = req.user.school_id;

  const result = await pool.query(
    `
    SELECT
      s.id,
      s.name,
      COUNT(a.id) AS total,
      COUNT(*) FILTER (WHERE a.status = 'P') AS present
    FROM students s
    LEFT JOIN attendance a
      ON a.student_id = s.id
    WHERE s.class_id = $1
      AND s.school_id = $2
    GROUP BY s.id
    ORDER BY s.name
    `,
    [classId, schoolId]
  );

  res.json(
    result.rows.map(r => ({
      ...r,
      percentage: r.total
        ? ((r.present * 100) / r.total).toFixed(2)
        : 0
    }))
  );
};

exports.subjectPerformance = async (req, res) => {
  const { classId, subjectId, examId } = req.query;
  const schoolId = req.user.school_id;

  const result = await pool.query(
    `
    SELECT
      AVG(marks_obtained) AS avg,
      MIN(marks_obtained) AS min,
      MAX(marks_obtained) AS max
    FROM marks
    WHERE class_id = $1
      AND subject_id = $2
      AND exam_id = $3
      AND school_id = $4
      AND is_locked = TRUE
    `,
    [classId, subjectId, examId, schoolId]
  );

  res.json(result.rows[0]);
};

exports.studentMarks = async (req, res) => {
  const { classId, subjectId, examId } = req.query;
  const schoolId = req.user.school_id;

  const result = await pool.query(
    `
    SELECT
      s.name,
      m.marks_obtained
    FROM students s
    JOIN marks m ON m.student_id = s.id
    WHERE m.class_id = $1
      AND m.subject_id = $2
      AND m.exam_id = $3
      AND m.school_id = $4
      AND m.is_locked = TRUE
    ORDER BY s.name
    `,
    [classId, subjectId, examId, schoolId]
  );

  res.json(result.rows);
};
