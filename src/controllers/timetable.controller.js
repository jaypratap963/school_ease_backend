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
    if (
      !timetable_id ||
      !day_of_week ||
      !period_no ||
      !start_time ||
      !end_time ||
      !subject_id ||
      !teacher_id
    ) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const start = start_time.length === 5 ? `${start_time}:00` : start_time;
    const end = end_time.length === 5 ? `${end_time}:00` : end_time;

    await client.query('BEGIN');

    // ✅ FIXED mapping check
    const mappingCheck = await client.query(
      `SELECT 1
       FROM timetables t
       JOIN teacher_subjects ts 
         ON ts.class_id = t.class_id
       WHERE t.id = $1
         AND t.school_id = $4
         AND ts.teacher_id = $2
         AND ts.subject_id = $3
         AND ts.school_id = $4`,
      [timetable_id, teacher_id, subject_id, school_id]
    );

    if (mappingCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Teacher is not assigned to this subject for this class'
      });
    }

    // ✅ safer conflict check
    const conflictCheck = await client.query(
      `SELECT 1
       FROM timetable_periods tp
       JOIN timetables t ON t.id = tp.timetable_id
       JOIN timetables t2 ON t2.id = $2
       WHERE tp.teacher_id = $1
         AND t.academic_session_id = t2.academic_session_id
         AND tp.day_of_week = $3
         AND ($4 < tp.end_time AND $5 > tp.start_time)`,
      [teacher_id, timetable_id, day_of_week, start, end]
    );

    if (conflictCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'Teacher already has a class at this time'
      });
    }

    await client.query(
      `INSERT INTO timetable_periods
       (timetable_id, day_of_week, period_no, start_time, end_time, subject_id, teacher_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [timetable_id, day_of_week, period_no, start, end, subject_id, teacher_id]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Period added successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add timetable period error:', err.message, err.stack);
    res.status(500).json({ message: err.message });
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
  const user_id = req.user.id;

  try {
    // 🔥 Step 1: get teacher_id from user_id
    const teacherResult = await pool.query(
      `SELECT id FROM teachers WHERE user_id = $1`,
      [user_id]
    );

    if (teacherResult.rowCount === 0) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const teacher_id = teacherResult.rows[0].id;

    // 🔥 Step 2: fetch timetable
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

  } catch (err) {
    console.error('Teacher timetable error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
