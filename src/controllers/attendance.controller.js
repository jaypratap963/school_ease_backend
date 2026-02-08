const pool = require('../config/db');
exports.saveAttendance = async (req, res) => {
  try {
    const { class_id, date, records } = req.body;
    const user = req.user;

    if (!class_id || !Array.isArray(records)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    // 1️⃣ Resolve teacher
    const teacherRes = await pool.query(
      `SELECT id FROM teachers
       WHERE user_id = $1 AND school_id = $2`,
      [user.id, user.school_id]
    );

    if (!teacherRes.rows.length) {
      return res.status(403).json({ message: 'Not a teacher' });
    }

    const teacher_id = teacherRes.rows[0].id;

    // 2️⃣ Authorize class access via teacher_subjects
    const accessCheck = await pool.query(
      `SELECT 1 FROM teacher_subjects
       WHERE teacher_id = $1
         AND class_id = $2
         AND school_id = $3
       LIMIT 1`,
      [teacher_id, class_id, user.school_id]
    );

    if (!accessCheck.rows.length) {
      return res.status(403).json({ message: 'Unauthorized class access' });
    }

    // 3️⃣ Resolve system date
    const sysDateRes = await pool.query(`SELECT CURRENT_DATE`);
    const systemDate = sysDateRes.rows[0].current_date;
    const attendanceDate = date || systemDate;

    const diffDays =
      (new Date(systemDate) - new Date(attendanceDate)) /
      (1000 * 60 * 60 * 24);

    // 4️⃣ Save attendance
    for (const r of records) {
      const existing = await pool.query(
        `SELECT unlocked_until
         FROM attendance
         WHERE student_id = $1
           AND attendance_date = $2`,
        [r.student_id, attendanceDate]
      );

      const unlockedUntil = existing.rows[0]?.unlocked_until;

      const canEdit =
        user.role === 'super_admin' ||
        diffDays <= 2 ||
        (unlockedUntil && new Date(unlockedUntil) >= new Date(systemDate));

      if (!canEdit) {
        return res.status(403).json({
          message: 'Attendance editing period expired'
        });
      }

      await pool.query(
        `INSERT INTO attendance
         (school_id, class_id, student_id, attendance_date, status, marked_by)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (student_id, attendance_date)
         DO UPDATE SET
           status = EXCLUDED.status,
           marked_by = EXCLUDED.marked_by,
           updated_at = NOW()`,
        [
          user.school_id,
          class_id,
          r.student_id,
          attendanceDate,
          r.status,
          user.id
        ]
      );
    }

    res.json({ message: 'Attendance saved successfully' });

  } catch (error) {
    console.error('saveAttendance ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAttendanceByDate = async (req, res) => {
  try {
    const { classId, date } = req.query;
    const user = req.user;

    if (!classId || !date) {
      return res.status(400).json({
        message: 'classId and date are required'
      });
    }

    // 1️⃣ Resolve teacher
    const teacherRes = await pool.query(
      `SELECT id FROM teachers
       WHERE user_id = $1 AND school_id = $2`,
      [user.id, user.school_id]
    );

    if (!teacherRes.rows.length) {
      return res.status(403).json({ message: 'Not a teacher' });
    }

    const teacher_id = teacherRes.rows[0].id;

    // 2️⃣ Authorize class access
    const accessCheck = await pool.query(
      `SELECT 1 FROM teacher_subjects
       WHERE teacher_id = $1
         AND class_id = $2
         AND school_id = $3
       LIMIT 1`,
      [teacher_id, classId, user.school_id]
    );

    if (!accessCheck.rows.length) {
      return res.status(403).json({ message: 'Unauthorized class access' });
    }

    // 3️⃣ Fetch attendance
    const result = await pool.query(
      `SELECT student_id, status
       FROM attendance
       WHERE class_id = $1
         AND attendance_date = $2
         AND school_id = $3
       ORDER BY student_id`,
      [classId, date, user.school_id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('getAttendanceByDate ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
