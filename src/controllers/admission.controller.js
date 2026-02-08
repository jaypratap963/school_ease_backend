const pool = require('../config/db');

/**
 * CREATE OFFER (Qualified applicants only)
 */
exports.createOffer = async (req, res) => {
  const { applicant_id, academic_session_id, offered_class_id } = req.body;
  const school_id = req.user.school_id;

  if (!applicant_id || !academic_session_id || !offered_class_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const applicant = await pool.query(
    `SELECT status FROM applicants
     WHERE id = $1 AND school_id = $2`,
    [applicant_id, school_id]
  );

  if (!applicant.rows.length || applicant.rows[0].status !== 'qualified') {
    return res.status(400).json({ message: 'Applicant not qualified' });
  }

  const existing = await pool.query(
    `SELECT id FROM admission_offers WHERE applicant_id = $1`,
    [applicant_id]
  );

  if (existing.rowCount) {
    return res.status(409).json({ message: 'Offer already exists' });
  }

  const offer = await pool.query(
    `INSERT INTO admission_offers
     (school_id, applicant_id, academic_session_id, offered_class_id, offer_status, offered_at)
     VALUES ($1,$2,$3,$4,'OFFERED',NOW())
     RETURNING *`,
    [school_id, applicant_id, academic_session_id, offered_class_id]
  );

  res.status(201).json(offer.rows[0]);
};

/**
 * ACCEPT / REJECT OFFER
 */
exports.respondToOffer = async (req, res) => {
  const { offer_id, status } = req.body;

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  if (status === 'ACCEPTED') {
    await pool.query(
      `
      UPDATE admission_offers
      SET offer_status = 'ACCEPTED',
          accepted_at = NOW()
      WHERE id = $1 AND offer_status = 'OFFERED'
      `,
      [offer_id]
    );
  } else {
    await pool.query(
      `
      UPDATE admission_offers
      SET offer_status = 'REJECTED',
          accepted_at = NULL
      WHERE id = $1 AND offer_status = 'OFFERED'
      `,
      [offer_id]
    );
  }

  res.json({ message: `Offer ${status.toLowerCase()}` });
};



exports.getOffers = async (req, res) => {
  try {
    const school_id = req.user.school_id;

    const result = await pool.query(
      `
      SELECT
        ao.id,
        ao.offer_status,
        ao.offered_at,
        ao.accepted_at,

        a.id AS applicant_id,
        a.full_name AS applicant_name,

        c.class_name,
        c.section,

        fp.id AS fee_payment_id
      FROM admission_offers ao
      JOIN applicants a ON a.id = ao.applicant_id
      JOIN classes c ON c.id = ao.offered_class_id
      LEFT JOIN fee_payments fp
        ON fp.applicant_id = ao.applicant_id
      WHERE ao.school_id = $1
      ORDER BY ao.created_at DESC
      `,
      [school_id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('getOffers ERROR:', err);
    res.status(500).json({ message: 'Failed to load offers' });
  }
};
