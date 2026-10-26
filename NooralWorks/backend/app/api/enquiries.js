const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');

// Enforce HR/Director role for all enquiry routes
router.use(authenticateToken, requireRole(['HR', 'Director']));

// GET /api/enquiries - Retrieve all enquiries with optional filters
router.get('/', (req, res) => {
  try {
    let query = `
      SELECT e.*, COALESCE(hr.name, 'Admin') as hr_name, hr.email as hr_email 
      FROM enquiries e
      LEFT JOIN users hr ON e.hr_id = hr.id
      WHERE 1=1
    `;
    const params = [];

    if (req.query.status) {
      query += ' AND e.status = ?';
      params.push(req.query.status);
    }
    if (req.query.interest) {
      query += ' AND e.interest = ?';
      params.push(req.query.interest);
    }
    if (req.query.hr_id) {
      query += ' AND e.hr_id = ?';
      params.push(req.query.hr_id);
    }
    if (req.query.search) {
      query += ' AND (e.name LIKE ? OR e.phone LIKE ? OR e.email LIKE ? OR e.notes LIKE ? OR hr.name LIKE ?)';
      const term = `%${req.query.search}%`;
      params.push(term, term, term, term, term);
    }

    query += ' ORDER BY e.created_at DESC, e.next_follow_up_date ASC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch enquiries error:', error);
    res.status(500).json({ error: 'Server error retrieving enquiries.' });
  }
});

// POST /api/enquiries - Add a new lead enquiry
router.post('/', (req, res) => {
  const { name, phone, email, interest, notes, next_follow_up_date } = req.body;

  if (!name || !phone || !interest) {
    return res.status(400).json({ error: 'Name, phone number, and interest (Software Development / Data Science) are required.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO enquiries (name, phone, email, interest, status, notes, next_follow_up_date, hr_id)
      VALUES (?, ?, ?, ?, 'New', ?, ?, ?)
    `).run(
      name.trim(),
      phone.trim(),
      email ? email.trim().toLowerCase() : null,
      interest.trim(),
      notes ? notes.trim() : null,
      next_follow_up_date || null,
      req.user.id
    );

    res.status(201).json({ message: 'Enquiry registered successfully.', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Create enquiry error:', error);
    res.status(500).json({ error: 'Server error registering enquiry.' });
  }
});

// PUT /api/enquiries/:id - Update enquiry details or log a callback
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, phone, email, interest, status, notes, last_follow_up_date, next_follow_up_date } = req.body;

  try {
    const existing = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(parseInt(id));
    if (!existing) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }

    db.prepare(`
      UPDATE enquiries
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          interest = COALESCE(?, interest),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          last_follow_up_date = COALESCE(?, last_follow_up_date),
          next_follow_up_date = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim().toLowerCase() : null,
      interest ? interest.trim() : null,
      status ? status.trim() : null,
      notes ? notes.trim() : null,
      last_follow_up_date || null,
      next_follow_up_date || null,
      parseInt(id)
    );

    res.json({ message: 'Enquiry updated successfully.' });
  } catch (error) {
    console.error('Update enquiry error:', error);
    res.status(500).json({ error: 'Server error updating enquiry.' });
  }
});

// DELETE /api/enquiries/:id - Remove an enquiry record
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const result = db.prepare('DELETE FROM enquiries WHERE id = ?').run(parseInt(id));
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Enquiry not found.' });
    }
    res.json({ message: 'Enquiry deleted successfully.' });
  } catch (error) {
    console.error('Delete enquiry error:', error);
    res.status(500).json({ error: 'Server error deleting enquiry.' });
  }
});

module.exports = router;
