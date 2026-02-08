const pool = require('../config/db');
const bcrypt = require('bcrypt');

exports.getSchools = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, address, created_at
       FROM schools
       ORDER BY created_at DESC`
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.createSchool = async (req, res) => {
  try {
    const { name, address } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        message: 'School name and address are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO schools (name, address)
       VALUES ($1, $2)
       RETURNING id, name`,
      [name, address]
    );

    res.status(201).json({
      message: 'School created successfully',
      school: result.rows[0]
    });

  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
};

exports.createSchoolAdmin = async (req, res) => {
  const client = await pool.connect();

  try {
    const { email, password, school_id } = req.body;

    if (!email || !password || !school_id) {
      return res.status(400).json({
        message: 'Email, password, and school_id are required'
      });
    }

    await client.query('BEGIN');

    // 1️⃣ Check school exists
    const schoolCheck = await client.query(
      'SELECT id FROM schools WHERE id = $1',
      [school_id]
    );

    if (schoolCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Invalid school_id' });
    }

    // 2️⃣ Check duplicate email
    const userCheck = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (userCheck.rowCount > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Email already exists' });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Insert school admin
    const result = await client.query(
      `INSERT INTO users (email, password, role, school_id)
       VALUES ($1, $2, 'school_admin', $3)
       RETURNING id, email, role, school_id`,
      [email, hashedPassword, school_id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'School admin created successfully',
      user: result.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create school admin error:', error);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    client.release();
  }
};

