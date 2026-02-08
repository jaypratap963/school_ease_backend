const pool = require('../config/db');

exports.assignSubjectToTeacher = async (req, res) => {
  try {
    const { teacherId, subjectId, classId } = req.body;

    if (!teacherId || !subjectId || !classId) {
      return res.status(400).json({ message: 'All fields required' });
    }

    await pool.query(
      `INSERT INTO teacher_subjects (teacher_id, subject_id, class_id)
       VALUES ($1, $2, $3)`,
      [teacherId, subjectId, classId]
    );

    res.status(201).json({ message: 'Subject assigned to teacher' });
  } catch (error) {
    console.error('assignSubjectToTeacher ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getSubjectsForTeacherClass = async (req, res) => {
  try {
    const { classId } = req.params;

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

    const result = await pool.query(
      `SELECT s.id, s.name
       FROM teacher_subjects ts
       JOIN subjects s ON s.id = ts.subject_id
       WHERE ts.teacher_id = $1
       AND ts.class_id = $2`,
      [teacherId, classId]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('getSubjectsForTeacherClass ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
