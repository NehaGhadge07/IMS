const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');
const { syncAllApprovedLeaves, ensureAbsentRecordsUpToToday } = require('../core/leave-sync');

// Helper to get intern id from user id
function getInternId(userId) {
  const row = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// GET /api/attendance - List attendance records with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    // Keep approved leaves synchronized to attendance
    syncAllApprovedLeaves();
    // Ensure interns without attendance up to today are marked as Absent
    ensureAbsentRecordsUpToToday();

    let query = `
      SELECT a.*, i.technology, u.name as intern_name, u.email as intern_email, ap.name as approved_by_name,
             mu.name as mentor_name, mu.id as mentor_user_id
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users ap ON a.approved_by = ap.id
      LEFT JOIN users mu ON (i.mentor_id = mu.id OR i.mentor_id IN (SELECT user_id FROM mentors WHERE id = i.mentor_id))
      WHERE 1=1
    `;
    const params = [];

    // Filter by intern_id (or enforce for Intern role)
    if (req.user.role === 'Intern') {
      const internId = getInternId(req.user.id);
      if (!internId) return res.status(404).json({ error: 'Intern profile not found.' });
      query += ` AND a.intern_id = ?`;
      params.push(internId);
    } else {
      // HR / Mentor filters
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
        // Mentor only sees their interns' attendance
        query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
        params.push(req.user.id, req.user.id);
      }
      
    }

    if (req.query.date) {
      query += ` AND a.date = ?`;
      params.push(req.query.date);
    }
    if (req.query.start_date && req.query.end_date) {
      query += ` AND a.date >= ? AND a.date <= ?`;
      params.push(req.query.start_date, req.query.end_date);
    } else if (req.query.start_date) {
      query += ` AND a.date >= ?`;
      params.push(req.query.start_date);
    } else if (req.query.end_date) {
      query += ` AND a.date <= ?`;
      params.push(req.query.end_date);
    } else if (req.query.month) {
      // Month format 'YYYY-MM'
      query += ` AND a.date LIKE ?`;
      params.push(`${req.query.month}%`);
    }

    // Never return future dates
    query += ` AND a.date <= DATE('now', 'localtime')`;

    query += ` ORDER BY a.date DESC, u.name ASC`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ error: 'Server error fetching attendance.' });
  }
});

// POST /api/attendance/check-in - Daily check-in for Interns
router.post('/check-in', authenticateToken, (req, res) => {
  if (req.user.role !== 'Intern') {
    return res.status(403).json({ error: 'Only interns can check-in.' });
  }

  const internId = getInternId(req.user.id);
  if (!internId) {
    return res.status(404).json({ error: 'Intern profile not found.' });
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const checkInTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

  // Retrieve intern's training slot to determine check-in status
  const intern = db.prepare('SELECT training_time FROM interns WHERE id = ?').get(internId);
  const slot = intern && intern.training_time ? intern.training_time : '09:00 AM - 01:00 PM';
  
  let status = 'Present';
  try {
    const startTimePart = slot.split('-')[0].trim(); // e.g. "09:00 AM"
    const parts = startTimePart.split(' ');
    const hm = parts[0].split(':');
    let startHours = parseInt(hm[0]);
    const startMinutes = parseInt(hm[1]);
    const ampm = parts[1] ? parts[1].toUpperCase() : 'AM';
    
    if (ampm === 'PM' && startHours < 12) startHours += 12;
    if (ampm === 'AM' && startHours === 12) startHours = 0;
    
    const slotStartMinutes = startHours * 60 + startMinutes;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    // Marked late if checking in more than 15 minutes past their slot start time
    if (currentMinutes > slotStartMinutes + 15) {
      status = 'Late';
    }
  } catch (e) {
    console.error('Error parsing training slot time:', e);
    // fallback to default 09:30 AM logic
    const minutes = now.getHours() * 60 + now.getMinutes();
    if (minutes > 9 * 60 + 30) status = 'Late';
  }

  try {
    // Check if already checked in today
    const existing = db.prepare('SELECT id, check_in_time, status FROM attendance WHERE intern_id = ? AND date = ?').get(internId, today);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'You have already checked in today.' });
    }
    if (existing && existing.status === 'Leave') {
      return res.status(400).json({ error: 'You are on approved leave today.' });
    }

    if (existing) {
      db.prepare(`
        UPDATE attendance 
        SET check_in_time = ?, status = ?, comments = ?
        WHERE id = ?
      `).run(checkInTime, status, req.body.comments || null, existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance (intern_id, date, check_in_time, status, comments)
        VALUES (?, ?, ?, ?, ?)
      `).run(internId, today, checkInTime, status, req.body.comments || null);
    }

    try {
      db.prepare(`
        INSERT INTO activity_logs (user_id, action, timestamp, details)
        VALUES (?, 'Attendance Check-In', ?, ?)
      `).run(req.user.id, new Date().toISOString(), `Daily attendance check-in marked at ${checkInTime}`);
    } catch (e) {
      console.warn('Activity log check-in error:', e.message);
    }

    res.json({ message: 'Checked in successfully.', time: checkInTime, status });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Server error registering check-in.' });
  }
});

// POST /api/attendance/check-out - Daily check-out for Interns
router.post('/check-out', authenticateToken, (req, res) => {
  if (req.user.role !== 'Intern') {
    return res.status(403).json({ error: 'Only interns can check-out.' });
  }

  const internId = getInternId(req.user.id);
  if (!internId) {
    return res.status(404).json({ error: 'Intern profile not found.' });
  }

  const today = new Date().toISOString().split('T')[0];
  const checkOutTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  try {
    const attendance = db.prepare('SELECT * FROM attendance WHERE intern_id = ? AND date = ?').get(internId, today);
    if (!attendance) {
      return res.status(400).json({ error: 'No check-in record found for today. Please check-in first.' });
    }

    if (attendance.check_out_time) {
      return res.status(400).json({ error: 'You have already checked out today.' });
    }

    // Calculate working hours
    const ciParts = attendance.check_in_time.split(':');
    const coParts = checkOutTime.split(':');
    const ciDate = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1]), parseInt(ciParts[2]));
    const coDate = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1]), parseInt(coParts[2]));
    
    let diffMs = coDate - ciDate;
    if (diffMs < 0) diffMs = 0; // Guard
    const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    // Determine status (if workingHours < 1.5, set to Half Day)
    let newStatus = attendance.status;
    if (workingHours < 1.5) {
      newStatus = 'Half Day';
    }

    // Update attendance record
    db.prepare(`
      UPDATE attendance
      SET check_out_time = ?, working_hours = ?, status = ?
      WHERE id = ?
    `).run(checkOutTime, workingHours, newStatus, attendance.id);

    res.json({ message: 'Checked out successfully.', time: checkOutTime, workingHours });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ error: 'Server error registering check-out.' });
  }
});

// POST /api/attendance/leave - Intern requests leave
router.post('/leave', authenticateToken, (req, res) => {
  if (req.user.role !== 'Intern') {
    return res.status(403).json({ error: 'Only interns can request leaves.' });
  }

  const internId = getInternId(req.user.id);
  if (!internId) {
    return res.status(404).json({ error: 'Intern profile not found.' });
  }

  const { date, comments } = req.body;
  if (!date) {
    return res.status(400).json({ error: 'Date is required for leave request.' });
  }

  try {
    const existing = db.prepare('SELECT id, check_in_time, status FROM attendance WHERE intern_id = ? AND date = ?').get(internId, date);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'You have already checked in on this date.' });
    }
    if (existing && existing.status === 'Leave') {
      return res.status(400).json({ error: 'An attendance or leave record already exists for this date.' });
    }

    if (existing) {
      db.prepare(`
        UPDATE attendance SET status = 'Leave', comments = ? WHERE id = ?
      `).run(comments || 'Requested leave', existing.id);
    } else {
      db.prepare(`
        INSERT INTO attendance (intern_id, date, status, comments)
        VALUES (?, ?, 'Leave', ?)
      `).run(internId, date, comments || 'Requested leave');
    }

    // Notify Mentors/HR
    // For simplicity, find the mentor_id of this intern and notify them
    const intern = db.prepare('SELECT mentor_id, user_id FROM interns WHERE id = ?').get(internId);
    if (intern && intern.mentor_id) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, 'Leave Request', 'Your intern has requested leave for date ${date}.')
      `).run(intern.mentor_id);
    }

    res.json({ message: 'Leave requested successfully.' });
  } catch (error) {
    console.error('Leave request error:', error);
    res.status(500).json({ error: 'Server error submitting leave request.' });
  }
});

// POST /api/attendance/approve/:id - Approve leaf or mark check-in (HR / Director only)
router.post('/approve/:id', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body; // e.g. Present, Leave, Half Day, etc.

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  try {
    const att = db.prepare(`
      SELECT a.*, i.user_id 
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      WHERE a.id = ?
    `).get(parseInt(id));

    if (!att) {
      return res.status(404).json({ error: 'Attendance record not found.' });
    }

    db.prepare(`
      UPDATE attendance
      SET status = ?, approved_by = ?, comments = COALESCE(?, comments)
      WHERE id = ?
    `).run(status, req.user.id, comments || null, parseInt(id));

    // Notify intern
    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Attendance Approved', 'Your attendance record for ${att.date} has been updated to ${status}.')
    `).run(att.user_id);

    res.json({ message: 'Attendance updated and approved successfully.' });
  } catch (error) {
    console.error('Approve attendance error:', error);
    res.status(500).json({ error: 'Server error updating attendance record.' });
  }
});

// Auto-sync active trainers/staff from session activity
function syncActiveTrainersToday() {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    // Find any Mentor or HR user who has logged in today or is marked online
    const activeStaff = db.prepare(`
      SELECT u.id, u.name, u.role, u.is_online,
        (SELECT MAX(timestamp) FROM activity_logs WHERE user_id = u.id AND action IN ('User Login', 'Attendance Check-In') AND timestamp >= ?) as login_today
      FROM users u
      WHERE u.role IN ('Mentor', 'HR') AND u.status = 'Active'
    `).all(`${today}T00:00:00.000Z`);

    for (const staff of activeStaff) {
      if (staff.login_today || staff.is_online) {
        if (staff.role === 'Mentor') {
          const existing = db.prepare('SELECT id, check_in_time FROM mentor_attendance WHERE mentor_id = ? AND date = ?').get(staff.id, today);
          if (!existing) {
            let checkInTime = now.toTimeString().split(' ')[0];
            let status = 'Present';
            if (staff.login_today) {
              try {
                const logD = new Date(staff.login_today);
                checkInTime = logD.toTimeString().split(' ')[0];
                status = computeStatusFromTime(logD);
              } catch (e) {}
            }
            db.prepare('INSERT INTO mentor_attendance (mentor_id, date, check_in_time, status, comments) VALUES (?, ?, ?, ?, ?)')
              .run(staff.id, today, checkInTime, status, 'System Login Session');
          } else if (!existing.check_in_time) {
            const checkInTime = now.toTimeString().split(' ')[0];
            db.prepare('UPDATE mentor_attendance SET check_in_time = ?, status = ? WHERE id = ?')
              .run(checkInTime, computeStatusFromTime(now), existing.id);
          }
        } else if (staff.role === 'HR') {
          const existing = db.prepare('SELECT id, check_in_time FROM hr_attendance WHERE hr_id = ? AND date = ?').get(staff.id, today);
          if (!existing) {
            let checkInTime = now.toTimeString().split(' ')[0];
            let status = 'Present';
            if (staff.login_today) {
              try {
                const logD = new Date(staff.login_today);
                checkInTime = logD.toTimeString().split(' ')[0];
                status = computeStatusFromTime(logD);
              } catch (e) {}
            }
            db.prepare('INSERT INTO hr_attendance (hr_id, date, check_in_time, status, comments) VALUES (?, ?, ?, ?, ?)')
              .run(staff.id, today, checkInTime, status, 'System Login Session');
          } else if (!existing.check_in_time) {
            const checkInTime = now.toTimeString().split(' ')[0];
            db.prepare('UPDATE hr_attendance SET check_in_time = ?, status = ? WHERE id = ?')
              .run(checkInTime, computeStatusFromTime(now), existing.id);
          }
        }
      }
    }
  } catch (e) {
    console.warn('syncActiveTrainersToday warning:', e.message);
  }
}

// GET /api/attendance/mentors - Fetch mentor attendance records (HR, Director, Mentor)
router.get('/mentors', authenticateToken, requireRole(['HR', 'Director', 'Mentor']), (req, res) => {
  try {
    // Keep approved leaves and active online trainers synchronized to attendance
    syncAllApprovedLeaves();
    syncActiveTrainersToday();

    let query = `
      SELECT ma.*, u.name as mentor_name, u.email as mentor_email, ap.name as approved_by_name,
             COALESCE(u.is_online, 0) as is_online, u.last_active_at
      FROM mentor_attendance ma
      JOIN users u ON ma.mentor_id = u.id
      LEFT JOIN mentors m ON m.user_id = u.id
      LEFT JOIN users ap ON ma.approved_by = ap.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'Mentor') {
      query += ` AND ma.mentor_id = ?`;
      params.push(req.user.id);
    }

    if (req.query.mentor_id) {
      query += ' AND ma.mentor_id = ?';
      params.push(parseInt(req.query.mentor_id));
    }
    if (req.query.date) {
      query += ' AND ma.date = ?';
      params.push(req.query.date);
    }
    if (req.query.start_date && req.query.end_date) {
      query += ' AND ma.date >= ? AND ma.date <= ?';
      params.push(req.query.start_date, req.query.end_date);
    } else if (req.query.start_date) {
      query += ' AND ma.date >= ?';
      params.push(req.query.start_date);
    } else if (req.query.end_date) {
      query += ' AND ma.date <= ?';
      params.push(req.query.end_date);
    } else if (req.query.month) {
      query += ' AND ma.date LIKE ?';
      params.push(`${req.query.month}%`);
    }

    query += ' ORDER BY ma.date DESC, u.name ASC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch mentor attendance error:', error);
    res.status(500).json({ error: 'Server error retrieving mentor attendance.' });
  }
});

// POST /api/attendance/mentors/log - HR manually logs or updates mentor attendance
router.post('/mentors/log', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { mentor_id, date, check_in_time, check_out_time, status, comments } = req.body;

  if (!mentor_id || !date || !status) {
    return res.status(400).json({ error: 'mentor_id, date, and status are required.' });
  }

  try {
    let workingHours = 0;
    if (check_in_time && check_out_time) {
      const ciParts = check_in_time.split(':');
      const coParts = check_out_time.split(':');
      const ciDate = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1] || 0), parseInt(ciParts[2] || 0));
      const coDate = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1] || 0), parseInt(coParts[2] || 0));
      let diffMs = coDate - ciDate;
      if (diffMs < 0) diffMs = 0;
      workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    }

    db.prepare(`
      INSERT INTO mentor_attendance (mentor_id, date, check_in_time, check_out_time, working_hours, status, approved_by, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(mentor_id, date) DO UPDATE SET
        check_in_time = excluded.check_in_time,
        check_out_time = excluded.check_out_time,
        working_hours = excluded.working_hours,
        status = excluded.status,
        approved_by = excluded.approved_by,
        comments = excluded.comments
    `).run(
      parseInt(mentor_id),
      date,
      check_in_time || null,
      check_out_time || null,
      workingHours,
      status,
      req.user.id,
      comments || null
    );

    res.json({ message: 'Mentor attendance logged successfully.' });
  } catch (error) {
    console.error('Log mentor attendance error:', error);
    res.status(500).json({ error: 'Server error registering mentor attendance.' });
  }
});

// Helper: compute status from check-in hour
function computeStatusFromTime(now) {
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  if (totalMinutes >= 12 * 60) return 'Half Day';  // 12:00 PM or later
  if (totalMinutes >= 10 * 60) return 'Late';       // 10:00 AM or later
  return 'Present';                                  // before 10:00 AM
}

// POST /api/attendance/hr-login - HR marks login for an intern (auto time & status)
router.post('/hr-login', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { intern_id } = req.body;
  if (!intern_id) return res.status(400).json({ error: 'intern_id is required.' });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const checkInTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
  const status = computeStatusFromTime(now);

  try {
    const existing = db.prepare('SELECT id, check_in_time FROM attendance WHERE intern_id = ? AND date = ?').get(parseInt(intern_id), today);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'Attendance already logged for today.' });
    }

    if (existing) {
      // Update leave record to login
      db.prepare('UPDATE attendance SET check_in_time = ?, status = ?, approved_by = ? WHERE id = ?')
        .run(checkInTime, status, req.user.id, existing.id);
    } else {
      db.prepare('INSERT INTO attendance (intern_id, date, check_in_time, status, approved_by) VALUES (?, ?, ?, ?, ?)')
        .run(parseInt(intern_id), today, checkInTime, status, req.user.id);
    }

    try {
      const internUser = db.prepare('SELECT user_id FROM interns WHERE id = ?').get(parseInt(intern_id));
      if (internUser) {
        db.prepare(`
          INSERT INTO activity_logs (user_id, action, timestamp, details)
          VALUES (?, 'Attendance Check-In', ?, ?)
        `).run(internUser.user_id, new Date().toISOString(), `Attendance login marked by HR (${req.user.name}) at ${checkInTime}`);
      }
    } catch (e) {
      console.warn('Activity log hr-login error:', e.message);
    }

    res.json({ message: 'Login marked successfully.', time: checkInTime, status, date: today });
  } catch (error) {
    console.error('HR login error:', error);
    res.status(500).json({ error: 'Server error marking login.' });
  }
});

// POST /api/attendance/hr-logout - HR marks logout for an intern (auto time)
router.post('/hr-logout', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { intern_id } = req.body;
  if (!intern_id) return res.status(400).json({ error: 'intern_id is required.' });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const checkOutTime = now.toTimeString().split(' ')[0];

  try {
    const att = db.prepare('SELECT * FROM attendance WHERE intern_id = ? AND date = ?').get(parseInt(intern_id), today);
    if (!att || !att.check_in_time) return res.status(400).json({ error: 'No login found for today. Please login first.' });
    if (att.check_out_time) return res.status(400).json({ error: 'Already logged out for today.' });

    const ciParts = att.check_in_time.split(':');
    const coParts = checkOutTime.split(':');
    const ciMs = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1]), parseInt(ciParts[2]));
    const coMs = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1]), parseInt(coParts[2]));
    const workingHours = parseFloat(Math.max(0, (coMs - ciMs) / (1000 * 60 * 60)).toFixed(2));

    db.prepare('UPDATE attendance SET check_out_time = ?, working_hours = ? WHERE id = ?')
      .run(checkOutTime, workingHours, att.id);

    res.json({ message: 'Logout marked successfully.', time: checkOutTime, workingHours, date: today });
  } catch (error) {
    console.error('HR logout error:', error);
    res.status(500).json({ error: 'Server error marking logout.' });
  }
});

// POST /api/attendance/mentors/login - HR marks login for a trainer (auto time & status)
router.post('/mentors/login', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { mentor_id } = req.body;
  if (!mentor_id) return res.status(400).json({ error: 'mentor_id is required.' });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const checkInTime = now.toTimeString().split(' ')[0];
  const status = computeStatusFromTime(now);

  try {
    const existing = db.prepare('SELECT id, check_in_time FROM mentor_attendance WHERE mentor_id = ? AND date = ?').get(parseInt(mentor_id), today);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: 'Attendance already logged for today.' });
    }

    if (existing) {
      db.prepare('UPDATE mentor_attendance SET check_in_time = ?, status = ?, approved_by = ? WHERE id = ?')
        .run(checkInTime, status, req.user.id, existing.id);
    } else {
      db.prepare('INSERT INTO mentor_attendance (mentor_id, date, check_in_time, status, approved_by) VALUES (?, ?, ?, ?, ?)')
        .run(parseInt(mentor_id), today, checkInTime, status, req.user.id);
    }

    try {
      db.prepare(`
        INSERT INTO activity_logs (user_id, action, timestamp, details)
        VALUES (?, 'Attendance Check-In', ?, ?)
      `).run(parseInt(mentor_id), new Date().toISOString(), `Trainer attendance login marked by HR (${req.user.name}) at ${checkInTime}`);
    } catch (e) {
      console.warn('Activity log trainer login error:', e.message);
    }

    res.json({ message: 'Trainer login marked successfully.', time: checkInTime, status, date: today });
  } catch (error) {
    console.error('Trainer login error:', error);
    res.status(500).json({ error: 'Server error marking trainer login.' });
  }
});

// POST /api/attendance/mentors/logout - HR marks logout for a trainer (auto time)
router.post('/mentors/logout', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { mentor_id } = req.body;
  if (!mentor_id) return res.status(400).json({ error: 'mentor_id is required.' });

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const checkOutTime = now.toTimeString().split(' ')[0];

  try {
    const att = db.prepare('SELECT * FROM mentor_attendance WHERE mentor_id = ? AND date = ?').get(parseInt(mentor_id), today);
    if (!att || !att.check_in_time) return res.status(400).json({ error: 'No login found for today. Please login first.' });
    if (att.check_out_time) return res.status(400).json({ error: 'Already logged out for today.' });

    const ciParts = att.check_in_time.split(':');
    const coParts = checkOutTime.split(':');
    const ciMs = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1]), parseInt(ciParts[2]));
    const coMs = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1]), parseInt(coParts[2]));
    const workingHours = parseFloat(Math.max(0, (coMs - ciMs) / (1000 * 60 * 60)).toFixed(2));

    db.prepare('UPDATE mentor_attendance SET check_out_time = ?, working_hours = ? WHERE id = ?')
      .run(checkOutTime, workingHours, att.id);

    res.json({ message: 'Trainer logout marked successfully.', time: checkOutTime, workingHours, date: today });
  } catch (error) {
    console.error('Trainer logout error:', error);
    res.status(500).json({ error: 'Server error marking trainer logout.' });
  }
});

// ==========================================
// HR ATTENDANCE ENDPOINTS (Director & HR)
// ==========================================

// GET /api/attendance/hr/list - Get list of HR users for selection
router.get('/hr/list', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  try {
    const hrUsers = db.prepare(`
      SELECT id as user_id, name, email, department, designation, COALESCE(is_online, 0) as is_online, last_active_at
      FROM users 
      WHERE role = 'HR' AND status = 'Active'
      ORDER BY name ASC
    `).all();
    res.json(hrUsers);
  } catch (error) {
    console.error('Fetch HR list error:', error);
    res.status(500).json({ error: 'Server error retrieving HR user list.' });
  }
});

// GET /api/attendance/hr - Fetch HR attendance records
router.get('/hr', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  try {
    syncAllApprovedLeaves();
    syncActiveTrainersToday();

    let query = `
      SELECT ha.*, u.name as hr_name, u.email as hr_email, u.department, u.designation,
             COALESCE(u.is_online, 0) as is_online, u.last_active_at, ap.name as approved_by_name
      FROM hr_attendance ha
      JOIN users u ON ha.hr_id = u.id
      LEFT JOIN users ap ON ha.approved_by = ap.id
      WHERE 1=1
    `;
    const params = [];

    // If logged in as HR and not requesting specific HR id (or HR only viewing self)
    if (req.user.role === 'HR' && !req.query.hr_id) {
      query += ' AND ha.hr_id = ?';
      params.push(req.user.id);
    } else if (req.query.hr_id) {
      query += ' AND ha.hr_id = ?';
      params.push(parseInt(req.query.hr_id));
    }

    if (req.query.date) {
      query += ' AND ha.date = ?';
      params.push(req.query.date);
    }
    if (req.query.start_date && req.query.end_date) {
      query += ' AND ha.date >= ? AND ha.date <= ?';
      params.push(req.query.start_date, req.query.end_date);
    } else if (req.query.start_date) {
      query += ' AND ha.date >= ?';
      params.push(req.query.start_date);
    } else if (req.query.end_date) {
      query += ' AND ha.date <= ?';
      params.push(req.query.end_date);
    } else if (req.query.month) {
      query += ' AND ha.date LIKE ?';
      params.push(`${req.query.month}%`);
    }

    query += ' ORDER BY ha.date DESC, u.name ASC';
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch HR attendance error:', error);
    res.status(500).json({ error: 'Server error retrieving HR attendance.' });
  }
});

// POST /api/attendance/hr/log - Manually logs or edits HR attendance
router.post('/hr/log', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { hr_id, date, check_in_time, check_out_time, status, comments } = req.body;

  const targetHrId = hr_id || (req.user.role === 'HR' ? req.user.id : null);
  if (!targetHrId || !date || !status) {
    return res.status(400).json({ error: 'hr_id, date, and status are required.' });
  }

  try {
    let workingHours = 0;
    if (check_in_time && check_out_time) {
      const ciParts = check_in_time.split(':');
      const coParts = check_out_time.split(':');
      const ciDate = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1] || 0), parseInt(ciParts[2] || 0));
      const coDate = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1] || 0), parseInt(coParts[2] || 0));
      let diffMs = coDate - ciDate;
      if (diffMs < 0) diffMs = 0;
      workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    }

    db.prepare(`
      INSERT INTO hr_attendance (hr_id, date, check_in_time, check_out_time, working_hours, status, approved_by, comments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(hr_id, date) DO UPDATE SET
        check_in_time = excluded.check_in_time,
        check_out_time = excluded.check_out_time,
        working_hours = excluded.working_hours,
        status = excluded.status,
        approved_by = excluded.approved_by,
        comments = excluded.comments
    `).run(
      parseInt(targetHrId),
      date,
      check_in_time || null,
      check_out_time || null,
      workingHours,
      status,
      req.user.id,
      comments || null
    );

    res.json({ message: 'HR attendance record saved successfully.' });
  } catch (error) {
    console.error('Log HR attendance error:', error);
    res.status(500).json({ error: 'Server error logging HR attendance.' });
  }
});

// POST /api/attendance/hr/login - Mark login for HR (auto system time & calculated status)
router.post('/hr/login', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const targetHrId = req.body.hr_id || (req.user.role === 'HR' ? req.user.id : null);
  if (!targetHrId) return res.status(400).json({ error: 'hr_id is required.' });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  const checkInTime = now.toTimeString().split(' ')[0];

  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;
  let status = 'Present';
  if (totalMinutes >= 12 * 60) status = 'Half Day';
  else if (totalMinutes >= 10 * 60) status = 'Late';

  try {
    const existing = db.prepare('SELECT id, check_in_time FROM hr_attendance WHERE hr_id = ? AND date = ?').get(parseInt(targetHrId), today);
    if (existing && existing.check_in_time) {
      return res.status(400).json({ error: `Already checked in today at ${existing.check_in_time}` });
    }

    if (existing) {
      db.prepare('UPDATE hr_attendance SET check_in_time = ?, status = ?, approved_by = ? WHERE id = ?')
        .run(checkInTime, status, req.user.id, existing.id);
    } else {
      db.prepare('INSERT INTO hr_attendance (hr_id, date, check_in_time, status, approved_by) VALUES (?, ?, ?, ?, ?)')
        .run(parseInt(targetHrId), today, checkInTime, status, req.user.id);
    }

    res.json({ message: 'HR login marked successfully.', time: checkInTime, status, date: today });
  } catch (error) {
    console.error('HR login error:', error);
    res.status(500).json({ error: 'Server error marking HR login.' });
  }
});

// POST /api/attendance/hr/logout - Mark logout for HR (auto system time & calculates working hours)
router.post('/hr/logout', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const targetHrId = req.body.hr_id || (req.user.role === 'HR' ? req.user.id : null);
  if (!targetHrId) return res.status(400).json({ error: 'hr_id is required.' });

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;
  const checkOutTime = now.toTimeString().split(' ')[0];

  try {
    const att = db.prepare('SELECT * FROM hr_attendance WHERE hr_id = ? AND date = ?').get(parseInt(targetHrId), today);
    if (!att || !att.check_in_time) return res.status(400).json({ error: 'No login found for today. Please login first.' });
    if (att.check_out_time) return res.status(400).json({ error: 'Already logged out for today.' });

    const ciParts = att.check_in_time.split(':');
    const coParts = checkOutTime.split(':');
    const ciMs = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1] || 0), parseInt(ciParts[2] || 0));
    const coMs = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1] || 0), parseInt(coParts[2] || 0));
    const workingHours = parseFloat(Math.max(0, (coMs - ciMs) / (1000 * 60 * 60)).toFixed(2));

    db.prepare('UPDATE hr_attendance SET check_out_time = ?, working_hours = ? WHERE id = ?')
      .run(checkOutTime, workingHours, att.id);

    res.json({ message: 'HR logout marked successfully.', time: checkOutTime, workingHours, date: today });
  } catch (error) {
    console.error('HR logout error:', error);
    res.status(500).json({ error: 'Server error marking HR logout.' });
  }
});

module.exports = router;
