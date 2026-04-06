const pool = require('../config/db');

exports.createOrGetTimetable = async (req, res) => {
  const { academic_session_id, class_id } = req.body;
  const school_id = req.user.school_id;

  if (!academic_session_id || !class_id) {
    return res.status(400).json({ message: 'academic_session_id and class_id required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT id FROM timetables
       WHERE school_id = $1 AND academic_session_id = $2 AND class_id = $3`,
      [school_id, academic_session_id, class_id]
    );

    if (existing.rowCount > 0) {
      await client.query('COMMIT');
      return res.json({ timetable_id: existing.rows[0].id });
    }

    const result = await client.query(
      `INSERT INTO timetables (school_id, academic_session_id, class_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [school_id, academic_session_id, class_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ timetable_id: result.rows[0].id });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Timetable create error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};


exports.addTimetablePeriod = async (req, res) => {
  const {
    timetable_id,
    day_of_week,
    period_no,
    start_time,
    end_time,
    subject_id,
    teacher_id
  } = req.body;

  const school_id = req.user.school_id;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1️⃣ Validate teacher-subject-class mapping
    const mappingCheck = await client.query(
      `SELECT 1
       FROM teacher_subjects ts
       JOIN timetables t ON t.class_id = ts.class_id
       WHERE ts.teacher_id = $1
         AND ts.subject_id = $2
         AND t.id = $3
         AND ts.school_id = $4`,
      [teacher_id, subject_id, timetable_id, school_id]
    );

    if (mappingCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Teacher is not assigned to this subject for this class'
      });
    }

    // 2️⃣ Teacher conflict check
    const conflictCheck = await client.query(
      `SELECT 1
       FROM timetable_periods tp
       JOIN timetables t ON t.id = tp.timetable_id
       WHERE tp.teacher_id = $1
         AND t.academic_session_id = (
           SELECT academic_session_id FROM timetables WHERE id = $2
         )
         AND tp.day_of_week = $3
         AND ($4 < tp.end_time AND $5 > tp.start_time)`,
      [teacher_id, timetable_id, day_of_week, start_time, end_time]
    );

    if (conflictCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Teacher already has a class at this time' });
    }

    // 3️⃣ Insert period
    await client.query(
      `INSERT INTO timetable_periods
       (timetable_id, day_of_week, period_no, start_time, end_time, subject_id, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [timetable_id, day_of_week, period_no, start_time, end_time, subject_id, teacher_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Period added successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add timetable period error:', err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};


exports.getClassTimetable = async (req, res) => {
  const { class_id, academic_session_id } = req.query;
  const school_id = req.user.school_id;

  const result = await pool.query(
    `SELECT tp.*
     FROM timetable_periods tp
     JOIN timetables t ON t.id = tp.timetable_id
     WHERE t.class_id = $1
       AND t.academic_session_id = $2
       AND t.school_id = $3
     ORDER BY day_of_week, period_no`,
    [class_id, academic_session_id, school_id]
  );

  res.json(result.rows);
};

exports.getTeacherTimetable = async (req, res) => {
  const { academic_session_id } = req.query;
  const teacher_id = req.user.id;

  const result = await pool.query(
    `SELECT tp.*
     FROM timetable_periods tp
     JOIN timetables t ON t.id = tp.timetable_id
     WHERE tp.teacher_id = $1
       AND t.academic_session_id = $2
     ORDER BY day_of_week, start_time`,
    [teacher_id, academic_session_id]
  );

  res.json(result.rows);
};
