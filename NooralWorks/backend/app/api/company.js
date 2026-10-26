const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');

// GET /api/company - Fetch company profile details (Available to all logged-in roles)
router.get('/', authenticateToken, (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM company_profile WHERE id = 1').get();
    if (!row) {
      return res.status(404).json({ error: 'Company profile configuration not found.' });
    }
    res.json(row);
  } catch (error) {
    console.error('Fetch company profile error:', error);
    res.status(500).json({ error: 'Server error retrieving company profile.' });
  }
});

// PUT /api/company - Edit company profile details (Director restricted)
router.put('/', authenticateToken, requireRole(['Director']), (req, res) => {
  try {
    const { name, cin, gstin, pan, email, phone, address, website, director_name } = req.body;
    
    db.prepare(`
      UPDATE company_profile
      SET name = COALESCE(?, name),
          cin = COALESCE(?, cin),
          gstin = COALESCE(?, gstin),
          pan = COALESCE(?, pan),
          email = COALESCE(?, email),
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          website = COALESCE(?, website),
          director_name = COALESCE(?, director_name)
      WHERE id = 1
    `).run(
      name !== undefined ? name : null,
      cin !== undefined ? cin : null,
      gstin !== undefined ? gstin : null,
      pan !== undefined ? pan : null,
      email !== undefined ? email : null,
      phone !== undefined ? phone : null,
      address !== undefined ? address : null,
      website !== undefined ? website : null,
      director_name !== undefined ? director_name : null
    );

    const row = db.prepare('SELECT * FROM company_profile WHERE id = 1').get();
    res.json({ message: 'Company profile updated successfully.', company: row });
  } catch (error) {
    console.error('Update company profile error:', error);
    res.status(500).json({ error: 'Server error updating company profile.' });
  }
});

module.exports = router;
