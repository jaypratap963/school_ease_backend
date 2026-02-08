const pool = require('../config/db');

exports.createAdmissionFee = async (req, res) => {
  const { offer_id, amount } = req.body;
  const school_id = req.user.school_id;

  if (!offer_id || !amount) {
    return res.status(400).json({ message: 'offer_id and amount required' });
  }

  const offer = await pool.query(
    `SELECT * FROM admission_offers
     WHERE id = $1 AND school_id = $2 AND offer_status = 'ACCEPTED'`,
    [offer_id, school_id]
  );

  if (!offer.rows.length) {
    return res.status(400).json({ message: 'Offer not accepted' });
  }

  const fee = await pool.query(
    `INSERT INTO fee_payments
     (school_id, applicant_id, amount, purpose, status)
     VALUES ($1,$2,$3,'ADMISSION','PENDING')
     RETURNING *`,
    [school_id, offer.rows[0].applicant_id, amount]
  );

  res.status(201).json(fee.rows[0]);
};
