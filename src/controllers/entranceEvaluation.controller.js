const pool = require('../config/db');

exports.evaluateExam = async (req, res) => {
  try {
    const { marks_obtained } = req.body;
    const examId = req.params.examId;

    const existingEval = await pool.query(
  `SELECT 1 FROM entrance_exam_marks WHERE entrance_exam_id = $1`,
  [examId]
);

if (existingEval.rows.length) {
  return res.status(409).json({
    message: 'Exam already evaluated'
  });
}


    const examRes = await pool.query(
      `SELECT * FROM entrance_exams WHERE id = $1`,
      [examId]
    );

    if (!examRes.rows.length) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const exam = examRes.rows[0];
    const isQualified = marks_obtained >= exam.pass_marks;
if (marks_obtained < 0 || marks_obtained > exam.max_marks) {
  return res.status(400).json({
    message: 'Marks must be between 0 and max marks'
  });
}

    await pool.query('BEGIN');

    await pool.query(
      `INSERT INTO entrance_exam_marks
       (entrance_exam_id, marks_obtained, is_qualified, evaluated_by)
       VALUES ($1,$2,$3,$4)`,
      [examId, marks_obtained, isQualified, req.user.id]
    );

    await pool.query(
  `UPDATE entrance_exams
   SET status = $1
   WHERE id = $2`,
  [isQualified ? 'qualified' : 'rejected', examId]
);


    await pool.query(
      `UPDATE applicants
       SET status = $1
       WHERE id = $2`,
      [isQualified ? 'qualified' : 'rejected', exam.applicant_id]
    );

    await pool.query('COMMIT');

    res.json({
      message: 'Exam evaluated',
      qualified: isQualified
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
