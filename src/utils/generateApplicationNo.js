const pool = require('../config/db');

module.exports = async function generateApplicationNo() {
  const year = new Date().getFullYear();

  const result = await pool.query(
    `SELECT COUNT(*) FROM applicants
     WHERE EXTRACT(YEAR FROM created_at) = $1`,
    [year]
  );

  const seq = String(Number(result.rows[0].count) + 1).padStart(5, '0');

  return `APP-${year}-${seq}`;
};