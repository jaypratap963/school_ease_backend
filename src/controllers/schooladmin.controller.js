const pool = require('../config/db');
const bcrypt = require('bcrypt');

exports.getDashboard = async (req, res) => {
  try {
    const schoolId = req.user.school_id;

    // 1️⃣ Active session
    const sessionRes = await pool.query(
      `SELECT id, name
       FROM academic_sessions
       WHERE school_id = $1 AND is_active = TRUE
       LIMIT 1`,
      [schoolId]
    );

    const session = sessionRes.rows[0] || null;

    // 2️⃣ Total students
    const studentsRes = await pool.query(
      `SELECT COUNT(*) FROM students
       WHERE school_id = $1`,
      [schoolId]
    );

    // 3️⃣ Total teachers
    const teachersRes = await pool.query(
      `SELECT COUNT(*) FROM teachers
       WHERE school_id = $1`,
      [schoolId]
    );

    // 4️⃣ Total classes
    const classesRes = await pool.query(
      `SELECT COUNT(*) FROM classes
       WHERE school_id = $1`,
      [schoolId]
    );

    // 5️⃣ Attendance today %
    const attendanceRes = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'P') * 100.0 / NULLIF(COUNT(*), 0)
        AS percentage
      FROM attendance
      WHERE school_id = $1
        AND attendance_date = CURRENT_DATE
      `,
      [schoolId]
    );

    // 6️⃣ Marks status
    const marksRes = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE is_locked = FALSE) AS pending,
        COUNT(*) FILTER (WHERE is_locked = TRUE) AS locked
      FROM marks
      WHERE school_id = $1
      `,
      [schoolId]
    );

    res.json({
      session,
      stats: {
        students: Number(studentsRes.rows[0].count),
        teachers: Number(teachersRes.rows[0].count),
        classes: Number(classesRes.rows[0].count),
        attendanceToday: attendanceRes.rows[0].percentage
          ? Number(attendanceRes.rows[0].percentage.toFixed(2))
          : 0,
        marks: {
          pending: Number(marksRes.rows[0].pending),
          locked: Number(marksRes.rows[0].locked)
        }
      }
    });

  } catch (error) {
    console.error('School admin dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getTeachers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.name, u.email
       FROM teachers t
       JOIN users u ON u.id = t.user_id
       WHERE t.school_id = $1
       ORDER BY t.id DESC`,
      [req.user.school_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.class_name, c.section, t.name AS teacher_name
       FROM classes c
       LEFT JOIN teachers t ON t.id = c.teacher_id
       WHERE c.school_id = $1
       ORDER BY c.id DESC`,
      [req.user.school_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSubjects = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name
       FROM subjects
       WHERE school_id = $1
       ORDER BY id DESC`,
      [req.user.school_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAssignments = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT 
        ts.id,
        t.name AS teacher_name,
        c.class_name,
        c.section,
        s.name AS subject_name
      FROM teacher_subjects ts
      JOIN teachers t ON t.id = ts.teacher_id
      JOIN classes c ON c.id = ts.class_id
      JOIN subjects s ON s.id = ts.subject_id
      WHERE ts.school_id = $1
      ORDER BY ts.id DESC
      `,
      [req.user.school_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.createTeacher = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password, name } = req.body;
    const school_id = req.user.school_id;

    if (!email || !password || !name) {
      return res.status(400).json({
        message: 'Email, password, and name are required'
      });
    }

    await client.query('BEGIN');

    // 1️⃣ Check duplicate email
    const userCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Email already exists' });
    }

    // 2️⃣ Create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const userResult = await client.query(
      `INSERT INTO users (email, password, role, school_id)
       VALUES ($1, $2, 'teacher', $3)
       RETURNING id`,
      [email, hashedPassword, school_id]
    );

    const user_id = userResult.rows[0].id;

    // 3️⃣ Create teacher profile
    const teacherResult = await client.query(
      `INSERT INTO teachers (school_id, user_id, name)
       VALUES ($1, $2, $3)
       RETURNING id, name`,
      [school_id, user_id, name]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Teacher created successfully',
      teacher: teacherResult.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create teacher error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.createClass = async (req, res) => {
  const client = await pool.connect();

  try {
    const { class_name, section, teacher_id } = req.body;
    const school_id = req.user.school_id;

    if (!class_name || !section) {
      return res.status(400).json({
        message: 'class_name and section are required'
      });
    }

    await client.query('BEGIN');

    // 1️⃣ Prevent duplicate class + section
    const classCheck = await client.query(
      `SELECT id FROM classes
       WHERE school_id = $1 AND class_name = $2 AND section = $3`,
      [school_id, class_name, section]
    );

    if (classCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'Class with same name and section already exists'
      });
    }

    // 2️⃣ Validate teacher (if provided)
    if (teacher_id) {
      const teacherCheck = await client.query(
        `SELECT id FROM teachers
         WHERE id = $1 AND school_id = $2`,
        [teacher_id, school_id]
      );

      if (teacherCheck.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          message: 'Invalid teacher_id for this school'
        });
      }
    }

    // 3️⃣ Create class
    const result = await client.query(
      `INSERT INTO classes (school_id, class_name, section, teacher_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, class_name, section`,
      [school_id, class_name, section, teacher_id || null]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Class created successfully',
      class: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create class error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.createSubject = async (req, res) => {
  const client = await pool.connect();

  try {
    const { name } = req.body;
    const school_id = req.user.school_id;

    if (!name) {
      return res.status(400).json({
        message: 'Subject name is required'
      });
    }

    await client.query('BEGIN');

    // 1️⃣ Prevent duplicate subject in same school
    const subjectCheck = await client.query(
      `SELECT id FROM subjects
       WHERE school_id = $1 AND LOWER(name) = LOWER($2)`,
      [school_id, name]
    );

    if (subjectCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'Subject already exists in this school'
      });
    }

    // 2️⃣ Insert subject
    const result = await client.query(
      `INSERT INTO subjects (school_id, name)
       VALUES ($1, $2)
       RETURNING id, name`,
      [school_id, name]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Subject created successfully',
      subject: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create subject error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.assignTeacherSubject = async (req, res) => {
  const client = await pool.connect();

  try {
    const { teacher_id, class_id, subject_id } = req.body;
    const school_id = req.user.school_id;

    if (!teacher_id || !class_id || !subject_id) {
      return res.status(400).json({
        message: 'teacher_id, class_id, and subject_id are required'
      });
    }

    await client.query('BEGIN');

    // 1️⃣ Validate teacher
    const teacherCheck = await client.query(
      `SELECT id FROM teachers
       WHERE id = $1 AND school_id = $2`,
      [teacher_id, school_id]
    );
    if (teacherCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid teacher_id' });
    }

    // 2️⃣ Validate class
    const classCheck = await client.query(
      `SELECT id FROM classes
       WHERE id = $1 AND school_id = $2`,
      [class_id, school_id]
    );
    if (classCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid class_id' });
    }

    // 3️⃣ Validate subject
    const subjectCheck = await client.query(
      `SELECT id FROM subjects
       WHERE id = $1 AND school_id = $2`,
      [subject_id, school_id]
    );
    if (subjectCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid subject_id' });
    }

    // 4️⃣ Prevent duplicate mapping
    const mappingCheck = await client.query(
      `SELECT id FROM teacher_subjects
       WHERE teacher_id = $1
         AND class_id = $2
         AND subject_id = $3`,
      [teacher_id, class_id, subject_id]
    );

    if (mappingCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        message: 'This teacher is already assigned to this subject for this class'
      });
    }

    // 5️⃣ Insert mapping
    const result = await client.query(
      `INSERT INTO teacher_subjects
       (school_id, teacher_id, class_id, subject_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [school_id, teacher_id, class_id, subject_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Teacher assigned to subject successfully',
      assignment_id: result.rows[0].id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Assign teacher subject error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

exports.schoolAttendanceOverview = async (req, res) => {
  const schoolId = req.user.school_id;

  const result = await pool.query(
    `
    SELECT
      c.class_name,
      c.section,
      COUNT(a.id) FILTER (WHERE a.status = 'P') * 100.0 /
      NULLIF(COUNT(a.id),0) AS percentage
    FROM classes c
    LEFT JOIN attendance a ON a.class_id = c.id
    WHERE c.school_id = $1
    GROUP BY c.id
    ORDER BY c.class_name
    `,
    [schoolId]
  );

  res.json(result.rows);
};

exports.examCompletion = async (req, res) => {
  const schoolId = req.user.school_id;

  const result = await pool.query(
    `
    SELECT
      e.name,
      COUNT(m.id) FILTER (WHERE m.is_locked = FALSE) AS pending,
      COUNT(m.id) FILTER (WHERE m.is_locked = TRUE) AS locked
    FROM exams e
    LEFT JOIN marks m ON m.exam_id = e.id
    WHERE e.school_id = $1
    GROUP BY e.id
    `,
    [schoolId]
  );

  res.json(result.rows);
};
