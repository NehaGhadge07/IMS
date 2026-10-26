const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken } = require('../core/auth');
const { checkTaskDueNotifications } = require('./tasks');

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, (req, res) => {
  try {
    if (typeof checkTaskDueNotifications === 'function') {
      checkTaskDueNotifications();
    }

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (req.query.unread === 'true' || req.query.unread === '1') {
      sql += ' AND (is_read = 0 OR is_read IS NULL)';
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch notifications error:', error);
    res.status(500).json({ error: 'Server error fetching notifications.' });
  }
});

// POST /api/notifications/read/:id - Mark notification as read
router.post('/read/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(parseInt(id), req.user.id);
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error updating notification.' });
  }
});

// POST /api/notifications/read-all - Mark all as read
router.post('/read-all', authenticateToken, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark read all error:', error);
    res.status(500).json({ error: 'Server error updating notifications.' });
  }
});

// POST /api/notifications/read-category - Mark all notifications of a specific category as read
router.post('/read-category', authenticateToken, (req, res) => {
  const { category } = req.body;
  try {
    let sql = 'UPDATE notifications SET is_read = 1 WHERE user_id = ?';
    const params = [req.user.id];

    if (category === 'tasks') {
      sql += ` AND (
        LOWER(title) LIKE '%task%' OR LOWER(title) LIKE '%mock%' OR LOWER(title) LIKE '%test%' OR LOWER(title) LIKE '%interview%'
        OR LOWER(message) LIKE '%task%' OR LOWER(message) LIKE '%mock%' OR LOWER(message) LIKE '%test%' OR LOWER(message) LIKE '%interview%'
      )`;
    } else if (category === 'attendance') {
      sql += ` AND (
        LOWER(title) LIKE '%attendance%' OR LOWER(title) LIKE '%check%' OR LOWER(title) LIKE '%leave%' OR LOWER(title) LIKE '%absent%'
        OR LOWER(message) LIKE '%attendance%' OR LOWER(message) LIKE '%check%' OR LOWER(message) LIKE '%leave%' OR LOWER(message) LIKE '%absent%'
      )`;
    } else if (category === 'helpdesk') {
      sql += ` AND (
        LOWER(title) LIKE '%help%' OR LOWER(title) LIKE '%query%' OR LOWER(title) LIKE '%ticket%'
        OR LOWER(message) LIKE '%help%' OR LOWER(message) LIKE '%query%' OR LOWER(message) LIKE '%ticket%'
      )`;
    } else if (category === 'documents') {
      sql += ` AND (
        LOWER(title) LIKE '%document%' OR LOWER(title) LIKE '%paperwork%' OR LOWER(title) LIKE '%resume%'
        OR LOWER(message) LIKE '%document%' OR LOWER(message) LIKE '%paperwork%' OR LOWER(message) LIKE '%resume%'
      )`;
    } else if (category === 'training') {
      sql += ` AND (
        LOWER(title) LIKE '%train%' OR LOWER(title) LIKE '%session%'
        OR LOWER(message) LIKE '%train%' OR LOWER(message) LIKE '%session%'
      )`;
    }

    db.prepare(sql).run(...params);
    res.json({ message: 'Category notifications marked as read.' });
  } catch (error) {
    console.error('Mark category read error:', error);
    res.status(500).json({ error: 'Server error updating notifications.' });
  }
});

// DELETE /api/notifications - Delete / clear all notifications for user
router.delete('/', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications cleared.' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Server error clearing notifications.' });
  }
});

// POST /api/notifications/clear-all - Alternative POST endpoint to clear all notifications
router.post('/clear-all', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(req.user.id);
    res.json({ message: 'All notifications cleared.' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Server error clearing notifications.' });
  }
});

// POST /api/notifications/test - Generate a sample/test notification for current user
router.post('/test', authenticateToken, (req, res) => {
  try {
    const titles = [
      'New Task Update Assigned',
      'Daily Work Log Approved',
      'Attendance Checked-In',
      'Help Desk Query Response'
    ];
    const messages = [
      'Your supervisor updated task deliverables. Click to review details.',
      'Your daily log for today was successfully reviewed and approved.',
      'System attendance recorded: Checked in on time today.',
      'A new response was posted on your support ticket.'
    ];
    const idx = Math.floor(Math.random() * titles.length);
    const result = db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `).run(req.user.id, titles[idx], messages[idx]);

    res.json({ message: 'Test notification triggered.', id: result.lastInsertRowid });
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Server error triggering test notification.' });
  }
});

module.exports = router;
