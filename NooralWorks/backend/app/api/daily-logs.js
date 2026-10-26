const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');

// Helper to get intern id from user id
function getInternId(userId) {
  const row = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// GET /api/daily-logs - List work logs
router.get('/', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT a.*, i.technology, ui.name as intern_name, ui.email as intern_email,
             mu.name as mentor_name, mu.id as mentor_user_id
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      JOIN users ui ON i.user_id = ui.id
      LEFT JOIN users mu ON (i.mentor_id = mu.id OR i.mentor_id IN (SELECT user_id FROM mentors WHERE id = i.mentor_id))
      WHERE 1=1 AND a.status != 'Absent' AND a.status != 'Leave'
    `;
    const params = [];

    if (req.user.role === 'Intern') {
      const internId = getInternId(req.user.id);
      if (!internId) return res.status(404).json({ error: 'Intern profile not found.' });
      query += ` AND a.intern_id = ?`;
      params.push(internId);
    } else {
      if (req.query.intern_id) {
        query += ` AND a.intern_id = ?`;
        params.push(parseInt(req.query.intern_id));
      }
      if (req.query.mentor_id || req.query.trainer_id) {
        const mId = parseInt(req.query.mentor_id || req.query.trainer_id);
        query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
        params.push(mId, mId);
      }
      if (req.user.role === 'Mentor') {
        // Mentor only sees their interns' logs
        query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
        params.push(req.user.id, req.user.id);
      }
    }

    query += ` ORDER BY a.date DESC`;
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch daily logs error:', error);
    res.status(500).json({ error: 'Server error fetching daily logs.' });
  }
});

// POST /api/daily-logs/:id/feedback - Add feedback to log/attendance record (Mentor / HR only)
router.post('/:id/feedback', authenticateToken, requireRole(['HR', 'Mentor']), (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;

  if (!comments) {
    return res.status(400).json({ error: 'Feedback comments are required.' });
  }

  try {
    const att = db.prepare(`
      SELECT a.*, i.user_id, i.mentor_id
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      WHERE a.id = ?
    `).get(parseInt(id));

    if (!att) {
      return res.status(404).json({ error: 'Log record not found.' });
    }

    if (req.user.role === 'Mentor' && att.mentor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access forbidden. This intern is not assigned to you.' });
    }

    db.prepare(`
      UPDATE attendance
      SET comments = ?, approved_by = ?
      WHERE id = ?
    `).run(comments, req.user.id, parseInt(id));

    // Notify intern
    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Daily Log Feedback', 'Your mentor left feedback on your log for ${att.date}: "${comments.slice(0, 50)}..."')
    `).run(att.user_id);

    res.json({ message: 'Feedback added successfully.' });
  } catch (error) {
    console.error('Feedback log error:', error);
    res.status(500).json({ error: 'Server error saving log feedback.' });
  }
});

// Helper: No dummy seed in clean database
function seedStaffLogsIfEmpty() {
  // Empty - clean database with no auto-generated mock records
}

// GET /api/daily-logs/staff - List staff (HR/Trainer) work logs, attendance, and tasks for Director / Staff
router.get('/staff', authenticateToken, (req, res) => {
  try {
    seedStaffLogsIfEmpty();

    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const roleFilter = req.query.role; // 'Trainer' or 'HR' or undefined

    // Fetch all active staff (HR & Mentors/Trainers)
    let staffQuery = `
      SELECT u.id as user_id, u.name, u.email, u.role, u.department, u.designation, u.profile_photo,
             m.technology
      FROM users u
      LEFT JOIN mentors m ON m.user_id = u.id
      WHERE u.role IN ('HR', 'Mentor') AND u.status = 'Active'
    `;
    const params = [];
    if (roleFilter === 'Trainer') {
      staffQuery += ` AND u.role = 'Mentor'`;
    } else if (roleFilter === 'HR') {
      staffQuery += ` AND u.role = 'HR'`;
    }
    staffQuery += ` ORDER BY u.role DESC, u.name ASC`;
    const staffMembers = db.prepare(staffQuery).all(...params);

    const result = staffMembers.map(staff => {
      const displayRole = staff.role === 'Mentor' ? 'Trainer' : 'HR';

      // 1. Fetch work log for targetDate
      const log = db.prepare(`
        SELECT * FROM daily_work_logs WHERE user_id = ? AND date = ?
      `).get(staff.user_id, targetDate);

      // 2. Fetch attendance for targetDate
      const att = db.prepare(`
        SELECT * FROM mentor_attendance WHERE mentor_id = ? AND date = ?
      `).get(staff.user_id, targetDate);

      // 3. Fetch tasks assigned by Director
      const tasks = db.prepare(`
        SELECT id, title, status, priority, due_date, description
        FROM tasks
        WHERE assigned_mentor_id = ?
        ORDER BY due_date ASC
      `).all(staff.user_id);

      return {
        user_id: staff.user_id,
        name: staff.name,
        email: staff.email,
        role: displayRole,
        original_role: staff.role,
        department: staff.department || (displayRole === 'Trainer' ? 'Training & Development' : 'Human Resources'),
        designation: staff.designation || (displayRole === 'Trainer' ? 'Senior Technical Trainer' : 'HR Executive'),
        technology: staff.technology,
        profile_photo: staff.profile_photo,
        date: targetDate,
        has_log: !!log,
        log: log || null,
        attendance: att ? {
          check_in_time: att.check_in_time,
          check_out_time: att.check_out_time,
          working_hours: att.working_hours,
          status: att.status,
          comments: att.comments,
          is_live: att.check_in_time && !att.check_out_time
        } : null,
        tasks: tasks || []
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Fetch staff logs error:', error);
    res.status(500).json({ error: 'Server error fetching staff daily logs.' });
  }
});

// POST /api/daily-logs/staff - Submit or update daily work log (Trainers / HR / Director)
router.post('/staff', authenticateToken, requireRole(['HR', 'Mentor', 'Director']), (req, res) => {
  const { date, title, work_summary, key_accomplishments, challenges_blockers, hours_spent, batch, session_timing, user_id } = req.body;

  const targetUserId = (req.user.role === 'Director' && user_id) ? parseInt(user_id) : req.user.id;
  const targetDate = date || new Date().toISOString().split('T')[0];

  if (!work_summary) {
    return res.status(400).json({ error: 'Work summary/accomplishments are required.' });
  }

  try {
    const user = db.prepare('SELECT id, role, name FROM users WHERE id = ?').get(targetUserId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const roleName = user.role === 'Mentor' ? 'Trainer' : user.role;

    db.prepare(`
      INSERT INTO daily_work_logs (user_id, date, role, title, work_summary, key_accomplishments, challenges_blockers, hours_spent, batch, session_timing)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, date) DO UPDATE SET
        title = excluded.title,
        work_summary = excluded.work_summary,
        key_accomplishments = excluded.key_accomplishments,
        challenges_blockers = excluded.challenges_blockers,
        hours_spent = excluded.hours_spent,
        batch = excluded.batch,
        session_timing = excluded.session_timing,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      targetUserId,
      targetDate,
      roleName,
      title || `${roleName} Daily Activities`,
      work_summary,
      key_accomplishments || null,
      challenges_blockers || null,
      hours_spent ? parseFloat(hours_spent) : 8.0,
      batch || null,
      session_timing || null
    );

    // Activity log entry so HR and Director dashboards reflect the work immediately
    try {
      const detailsMsg = batch || session_timing 
        ? `Logged work for ${batch || 'General'} (${session_timing || 'Full Day'})` 
        : 'Submitted daily work log';
      db.prepare(`
        INSERT INTO activity_logs (user_id, action, timestamp, details)
        VALUES (?, 'Daily Work Log', ?, ?)
      `).run(targetUserId, new Date().toISOString(), detailsMsg);
    } catch (e) {
      console.warn('Activity log error for daily work log:', e.message);
    }

    // If staff submitted their log, notify Director
    if (req.user.role !== 'Director') {
      const directors = db.prepare("SELECT id FROM users WHERE role = 'Director'").all();
      for (const dir of directors) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message)
          VALUES (?, 'Staff Work Log Submitted', '${user.name} (${roleName}) submitted their daily work log for ${targetDate}.')
        `).run(dir.id);
      }
    }

    res.json({ message: 'Daily work log saved successfully.' });
  } catch (error) {
    console.error('Save staff work log error:', error);
    res.status(500).json({ error: 'Server error saving daily work log.' });
  }
});

// POST /api/daily-logs/staff/:userId/feedback - Director coaching feedback and acknowledgement
router.post('/staff/:userId/feedback', authenticateToken, requireRole('Director'), (req, res) => {
  const { userId } = req.params;
  const { date, feedback, acknowledge } = req.body;
  const targetDate = date || new Date().toISOString().split('T')[0];

  try {
    const log = db.prepare('SELECT * FROM daily_work_logs WHERE user_id = ? AND date = ?').get(parseInt(userId), targetDate);
    
    if (log) {
      db.prepare(`
        UPDATE daily_work_logs
        SET director_feedback = ?, director_acknowledged = ?, acknowledged_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(feedback || log.director_feedback, acknowledge ? 1 : log.director_acknowledged, log.id);
    } else {
      const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(parseInt(userId));
      const roleName = user ? (user.role === 'Mentor' ? 'Trainer' : user.role) : 'Staff';
      db.prepare(`
        INSERT INTO daily_work_logs (user_id, date, role, title, work_summary, director_feedback, director_acknowledged, acknowledged_at)
        VALUES (?, ?, ?, 'Daily Work Log', 'Daily log pending submission by staff.', ?, ?, CURRENT_TIMESTAMP)
      `).run(parseInt(userId), targetDate, roleName, feedback || 'Log reviewed by Director.', acknowledge ? 1 : 0);
    }

    // Notify staff member
    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Director Reviewed Your Log', 'Director added executive feedback on your work log for ${targetDate}: "${(feedback || 'Acknowledged').slice(0, 50)}..."')
    `).run(parseInt(userId));

    res.json({ message: 'Feedback and acknowledgement recorded successfully.' });
  } catch (error) {
    console.error('Director feedback error:', error);
    res.status(500).json({ error: 'Server error saving director feedback.' });
  }
});

module.exports = router;
