const pool = require('../config/db');

exports.enterMarks = async (req, res) => {
  try {
    const { classId, subjectId, examId, marks } = req.body;

    if (!classId || !subjectId || !examId || !Array.isArray(marks)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }
    console.log('Logged-in user:', req.user);
    
    
    // find teacher
    const teacherResult = await pool.query(
      `SELECT id
       FROM teachers
       WHERE user_id = $1
       AND school_id = $2`,
       [req.user.userId || req.user.id, req.user.school_id]
      );
      
      if (!teacherResult.rows.length) {
        return res.status(403).json({ message: 'Not a teacher' });
      }
      
      const teacherId = teacherResult.rows[0].id;
      console.log('Resolved teacherId:', teacherId);
      
    // verify teacher is assigned subject to class
    const assignmentCheck = await pool.query(
      `SELECT 1
       FROM teacher_subjects
       WHERE teacher_id = $1
       AND subject_id = $2
       AND class_id = $3`,
      [teacherId, subjectId, classId]
    );

    if (!assignmentCheck.rows.length) {
      return res.status(403).json({ message: 'Unauthorized subject access' });
    }

    // insert marks
    for (const m of marks) {
      await pool.query(
        `INSERT INTO marks
         (school_id, class_id, student_id, subject_id, exam_id, marks_obtained, entered_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.school_id,
          classId,
          m.studentId,
          subjectId,
          examId,
          m.marks,
          teacherId,
        ]
      );
    }

    res.status(200).json({ message: 'Marks entered successfully' });
  } catch (error) {
    console.error('enterMarks ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getMarks = async (req, res) => {
  try {
    const { classId, subjectId, examId } = req.query;

    const result = await pool.query(
      `
      SELECT student_id, marks_obtained, is_locked
      FROM marks
      WHERE class_id = $1
        AND subject_id = $2
        AND exam_id = $3
        AND school_id = $4
      `,
      [classId, subjectId, examId, req.user.school_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getMarks ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.saveMarks = async (req, res) => {
  try {
    const { classId, subjectId, examId, marks } = req.body;

    for (const m of marks) {
      await pool.query(
        `
        INSERT INTO marks
        (school_id, class_id, student_id, subject_id, exam_id, marks_obtained, entered_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (student_id, subject_id, exam_id)
        DO UPDATE SET
          marks_obtained = EXCLUDED.marks_obtained,
          entered_by = EXCLUDED.entered_by,
          updated_at = NOW()
        WHERE marks.is_locked = FALSE
        `,
        [
          req.user.school_id,
          classId,
          m.studentId,
          subjectId,
          examId,
          m.marks,
          req.user.id
        ]
      );
    }

    res.json({ message: 'Marks saved' });
  } catch (error) {
    console.error('saveMarks ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.lockMarks = async (req, res) => {
  const client = await pool.connect();

  try {
    const { classId, subjectId, examId, marks } = req.body;
    const userId = req.user.id;
    const schoolId = req.user.school_id;

    await client.query('BEGIN');

    // 1️⃣ SAVE / UPDATE MARKS (ONLY IF NOT LOCKED)
    for (const m of marks) {
      await client.query(
        `
        INSERT INTO marks
        (school_id, class_id, student_id, subject_id, exam_id, marks_obtained, entered_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (student_id, subject_id, exam_id)
        DO UPDATE SET
          marks_obtained = EXCLUDED.marks_obtained,
          entered_by = EXCLUDED.entered_by,
          updated_at = NOW()
        WHERE marks.is_locked = FALSE
        `,
        [
          schoolId,
          classId,
          m.studentId,
          subjectId,
          examId,
          m.marks,
          userId
        ]
      );
    }

    // 2️⃣ LOCK ALL RELATED MARKS
    await client.query(
      `
      UPDATE marks
      SET is_locked = TRUE,
          locked_at = NOW(),
          locked_by = $1
      WHERE class_id = $2
        AND subject_id = $3
        AND exam_id = $4
        AND school_id = $5
        AND is_locked = FALSE
      `,
      [userId, classId, subjectId, examId, schoolId]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Marks saved and locked successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('lockMarks ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};
