exports.generateFeeDemandsForClass = async (req, res) => {
  try {
    const { class_id, academic_session_id } = req.body;
    const school_id = req.user.school_id;

    // 1. Students
    const students = await pool.query(
      `SELECT id FROM students
       WHERE class_id = $1
       AND school_id = $2
       AND status = 'ACTIVE'`,
      [class_id, school_id]
    );

    // 2. Fee schedules
    const schedules = await pool.query(
      `SELECT fs.id AS fee_structure_id, sch.*
       FROM fee_structures fs
       JOIN fee_schedules sch ON sch.fee_structure_id = fs.id
       WHERE fs.class_id = $1
       AND fs.academic_session_id = $2
       AND fs.school_id = $3`,
      [class_id, academic_session_id, school_id]
    );

    for (const student of students.rows) {
      for (const s of schedules.rows) {
        await pool.query(
          `INSERT INTO fee_demands
           (school_id, student_id, fee_structure_id, fee_schedule_id,
            due_date, amount, status)
           VALUES ($1,$2,$3,$4,$5,$6,'DUE')
           ON CONFLICT DO NOTHING`,
          [
            school_id,
            student.id,
            s.fee_structure_id,
            s.id,
            s.due_date,
            s.amount
          ]
        );
      }
    }

    res.json({ message: 'Fee demands generated' });
  } catch (err) {
    console.error('generateFeeDemands:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getStudentFeeDemands = async (req, res) => {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `SELECT fd.*, fs.name
       FROM fee_demands fd
       JOIN fee_structures fs ON fs.id = fd.fee_structure_id
       WHERE fd.student_id = $1
       ORDER BY due_date`,
      [studentId]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
