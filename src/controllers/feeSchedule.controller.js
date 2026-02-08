exports.createFeeSchedule = async (req, res) => {
  try {
    const { fee_structure_id, schedules } = req.body;

    if (!fee_structure_id || !Array.isArray(schedules)) {
      return res.status(400).json({ message: 'Invalid payload' });
    }

    for (const s of schedules) {
      await pool.query(
        `INSERT INTO fee_schedules
         (fee_structure_id, period_no, due_date, amount)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT DO NOTHING`,
        [fee_structure_id, s.period_no, s.due_date, s.amount]
      );
    }

    res.json({ message: 'Fee schedule created' });
  } catch (err) {
    console.error('createFeeSchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getFeeSchedules = async (req, res) => {
  try {
    const { feeStructureId } = req.params;

    const result = await pool.query(
      `SELECT * FROM fee_schedules
       WHERE fee_structure_id = $1
       ORDER BY period_no`,
      [feeStructureId]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
