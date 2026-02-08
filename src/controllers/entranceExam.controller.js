const pool = require('../config/db');

exports.assignExam = async (req, res) => {
  try {
    const { applicant_id, exam_date, max_marks, pass_marks } = req.body;

    if (!applicant_id || !exam_date || !max_marks || !pass_marks) {
      return res.status(400).json({ message: 'Missing fields' });
    }

    await pool.query('BEGIN');

    await pool.query(
      `INSERT INTO entrance_exams
       (school_id, applicant_id, exam_date, max_marks, pass_marks)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.user.school_id, applicant_id, exam_date, max_marks, pass_marks]
    );

    await pool.query(
      `UPDATE applicants
       SET status = 'exam_assigned'
       WHERE id = $1`,
      [applicant_id]
    );

    await pool.query('COMMIT');

    res.json({ message: 'Entrance exam assigned' });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getExamByApplicant = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         ee.*,
         eem.marks_obtained,
         eem.is_qualified,
         eem.evaluated_at
       FROM entrance_exams ee
       LEFT JOIN entrance_exam_marks eem
         ON eem.entrance_exam_id = ee.id
       WHERE ee.applicant_id = $1`,
      [req.params.applicantId]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
