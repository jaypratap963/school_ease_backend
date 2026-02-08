const pool = require('../config/db');

exports.getSystemDate = async (req, res) => {
  try {
    const result = await pool.query(`SELECT CURRENT_DATE AS current_date`);
    res.status(200).json({
      currentDate: result.rows[0].current_date
    });
  } catch (error) {
    console.error('getSystemDate ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
