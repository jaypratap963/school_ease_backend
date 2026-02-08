const pool = require('../config/db');

module.exports = async function generateEnrollmentNo(
  schoolId,
  academicSessionId
) {
  // 1️⃣ Get school code
  const schoolRes = await pool.query(
    `SELECT school_code FROM schools WHERE id = $1`,
    [schoolId]
  );

  if (!schoolRes.rows.length || !schoolRes.rows[0].school_code) {
    throw new Error('School code not configured');
  }

  const schoolCode = schoolRes.rows[0].school_code;

  // 2️⃣ Get academic session start year from start_date
  const sessionRes = await pool.query(
    `SELECT start_date FROM academic_sessions WHERE id = $1`,
    [academicSessionId]
  );

  if (!sessionRes.rows.length || !sessionRes.rows[0].start_date) {
    throw new Error('Academic session start date missing');
  }

  const startDate = new Date(sessionRes.rows[0].start_date);
  const year = startDate.getFullYear();

  // 3️⃣ Sequence for this school + session
  const seqRes = await pool.query(
    `SELECT COUNT(*)::int + 1 AS seq
     FROM students
     WHERE school_id = $1
       AND academic_session_id = $2`,
    [schoolId, academicSessionId]
  );

  const seq = String(seqRes.rows[0].seq).padStart(4, '0');

  // 4️⃣ Final enrollment number
  return `${schoolCode}-${year}-${seq}`;
};
