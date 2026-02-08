const pool = require('../config/db');

/**
 * Create fee structure
 */
exports.createFeeStructure = async (req, res) => {
  const {
    class_id,
    academic_session_id,
    frequency,
    total_amount,
    installment_count
  } = req.body;

  const school_id = req.user.school_id;

  if (!class_id || !academic_session_id || !frequency || !total_amount) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const result = await pool.query(
    `INSERT INTO fee_structures
     (school_id, class_id, academic_session_id, frequency, total_amount, installment_count)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [school_id, class_id, academic_session_id, frequency, total_amount, installment_count]
  );

  res.status(201).json({
    message: 'Fee structure created',
    fee_structure_id: result.rows[0].id
  });
};

/**
 * Create installments
 */
exports.createInstallments = async (req, res) => {
  const { fee_structure_id, installments } = req.body;

  if (!fee_structure_id || !Array.isArray(installments)) {
    return res.status(400).json({ message: 'Invalid payload' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let total = 0;

    for (const i of installments) {
      total += Number(i.amount);

      await client.query(
        `INSERT INTO fee_installments
         (fee_structure_id, installment_no, amount, due_date)
         VALUES ($1,$2,$3,$4)`,
        [fee_structure_id, i.installment_no, i.amount, i.due_date]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Installments created' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

exports.payFeeDemand = async (req, res) => {
  try {
    const { fee_demand_id, amount, payment_mode } = req.body;
    const user = req.user;

    const demand = await pool.query(
      `SELECT * FROM fee_demands
       WHERE id = $1 AND status = 'DUE'`,
      [fee_demand_id]
    );

    if (!demand.rows.length) {
      return res.status(400).json({ message: 'Invalid or paid demand' });
    }

    await pool.query(
      `INSERT INTO fee_payments
       (school_id, student_id, fee_demand_id, amount, payment_mode, paid_at)
       VALUES ($1,$2,$3,$4,$5,NOW())`,
      [
        user.school_id,
        demand.rows[0].student_id,
        fee_demand_id,
        amount,
        payment_mode
      ]
    );

    await pool.query(
      `UPDATE fee_demands
       SET status = 'PAID'
       WHERE id = $1`,
      [fee_demand_id]
    );

    res.json({ message: 'Payment successful' });
  } catch (err) {
    console.error('payFeeDemand:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
