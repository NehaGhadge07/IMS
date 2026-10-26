const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');
const { syncLeaveToAttendance, removeLeaveFromAttendance } = require('../core/leave-sync');

const VALID_TYPES = ['Casual', 'Sick', 'Emergency', 'Work From Home', 'Other'];
const VALID_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  return Math.floor((endDate - startDate) / 86400000) + 1;
}

// Employees see their own requests; HR sees the company queue; team leads see their team's requests.
router.get('/', authenticateToken, (req, res) => {
  try {
    let query = `SELECT lr.*, u.name AS employee_name, u.email AS employee_email, u.role AS employee_role,
                        reviewer.name AS reviewed_by_name
                 FROM leave_requests lr
                 JOIN users u ON u.id = lr.user_id
                 LEFT JOIN users reviewer ON reviewer.id = lr.reviewed_by
                 WHERE 1 = 1`;
    const params = [];

    if (req.user.role === 'Intern') {
      query += ' AND lr.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'Mentor') {
      query += ` AND (lr.user_id = ? OR lr.user_id IN (
        SELECT i.user_id FROM interns i WHERE i.mentor_id = ?
      ))`;
      params.push(req.user.id, req.user.id);
    } else if (req.query.user_id) {
      query += ' AND lr.user_id = ?';
      params.push(Number(req.query.user_id));
    }

    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      query += ' AND lr.status = ?';
      params.push(req.query.status);
    }
    query += ' ORDER BY CASE WHEN lr.status = \'Pending\' THEN 0 ELSE 1 END, lr.start_date DESC';
    res.json(db.prepare(query).all(...params));
  } catch (error) {
    console.error('Fetch leave requests error:', error);
    res.status(500).json({ error: 'Unable to fetch leave requests.' });
  }
});

router.post('/', authenticateToken, (req, res) => {
  const { leave_type, start_date, end_date, reason } = req.body;
  if (!VALID_TYPES.includes(leave_type) || !start_date || !end_date || !reason?.trim()) {
    return res.status(400).json({ error: 'Leave type, dates, and a reason are required.' });
  }
  const totalDays = daysBetween(start_date, end_date);
  if (!Number.isFinite(totalDays) || totalDays < 1 || totalDays > 90) {
    return res.status(400).json({ error: 'Provide a valid leave period of up to 90 days.' });
  }
  try {
    const overlap = db.prepare(`SELECT id FROM leave_requests
      WHERE user_id = ? AND status IN ('Pending', 'Approved')
      AND start_date <= ? AND end_date >= ?`).get(req.user.id, end_date, start_date);
    if (overlap) return res.status(409).json({ error: 'This request overlaps an existing leave record.' });

    const isDirector = req.user.role === 'Director';
    const status = isDirector ? 'Approved' : 'Pending';
    const reviewNotes = isDirector ? 'Executive leave notice - No approval required.' : null;
    const reviewedBy = isDirector ? req.user.id : null;

    const result = db.prepare(`INSERT INTO leave_requests
      (user_id, leave_type, start_date, end_date, total_days, reason, status, review_notes, reviewed_by, reviewed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${isDirector ? 'CURRENT_TIMESTAMP' : 'NULL'})`)
      .run(req.user.id, leave_type, start_date, end_date, totalDays, reason.trim(), status, reviewNotes, reviewedBy);

    if (isDirector) {
      syncLeaveToAttendance({ user_id: req.user.id, start_date, end_date, leave_type }, req.user.id);

      // Notify all HR personnel of Director's leave notice
      const hrUsers = db.prepare("SELECT id FROM users WHERE role = 'HR' AND status = 'Active'").all();
      const notify = db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)');
      hrUsers.forEach(({ id }) => {
        notify.run(
          id,
          'Director Leave Notice',
          `Director ${req.user.name} has scheduled ${totalDays} day(s) of ${leave_type} leave from ${start_date} to ${end_date}. Reason: "${reason.trim()}". (Informational notice - no approval required)`
        );
      });
      return res.status(201).json({ id: result.lastInsertRowid, message: 'Director leave notice recorded and notified to HR successfully.' });
    } else {
      // Normal employee request: Notify HR and Director that approval is pending
      const hrUsers = db.prepare("SELECT id FROM users WHERE role IN ('HR', 'Director') AND status = 'Active'").all();
      const notify = db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)');
      hrUsers.forEach(({ id }) => notify.run(id, 'Leave request pending', `${req.user.name} requested ${totalDays} day(s) of ${leave_type} leave.`));
      return res.status(201).json({ id: result.lastInsertRowid, message: 'Leave request submitted for approval.' });
    }
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ error: 'Unable to submit the leave request.' });
  }
});

router.post('/:id/cancel', authenticateToken, (req, res) => {
  const request = db.prepare('SELECT * FROM leave_requests WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!request) return res.status(404).json({ error: 'Leave record not found.' });

  const isDirector = req.user.role === 'Director';
  const allowedStatuses = isDirector ? ['Pending', 'Approved'] : ['Pending'];
  if (!allowedStatuses.includes(request.status)) {
    return res.status(400).json({ error: 'Only pending or scheduled leave records can be cancelled.' });
  }

  const result = db.prepare("UPDATE leave_requests SET status = 'Cancelled' WHERE id = ? AND user_id = ?")
    .run(Number(req.params.id), req.user.id);
  if (!result.changes) return res.status(400).json({ error: 'Unable to cancel this leave record.' });

  removeLeaveFromAttendance(request);

  if (isDirector) {
    // Notify HR of Director's cancellation
    const hrUsers = db.prepare("SELECT id FROM users WHERE role = 'HR' AND status = 'Active'").all();
    const notify = db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)');
    hrUsers.forEach(({ id }) => {
      notify.run(
        id,
        'Director Leave Cancelled',
        `Director ${req.user.name} cancelled their scheduled leave for ${request.start_date} to ${request.end_date}.`
      );
    });
  }

  res.json({ message: 'Leave record cancelled.' });
});

router.post('/:id/review', authenticateToken, requireRole(['Director', 'HR', 'Mentor']), (req, res) => {
  const { status, review_notes = '' } = req.body;
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Select Approved or Rejected.' });
  try {
    const request = db.prepare(`
      SELECT lr.*, u.role as employee_role
      FROM leave_requests lr
      JOIN users u ON u.id = lr.user_id
      WHERE lr.id = ?
    `).get(Number(req.params.id));

    if (!request) return res.status(404).json({ error: 'Leave request not found.' });

    // Director leave cannot be reviewed or rejected by anyone (no approval required)
    if (request.employee_role === 'Director') {
      return res.status(400).json({ error: 'Director leaves are executive notices and do not require approval.' });
    }

    // Director can approve leaves ONLY of Trainers (Mentors) and HR, NOT interns!
    if (req.user.role === 'Director' && request.employee_role === 'Intern') {
      return res.status(403).json({ error: 'Director can only approve leaves of Trainers and HR, not interns. Intern leaves are managed by HR and Mentors.' });
    }

    // Mentor can only review their assigned interns
    if (req.user.role === 'Mentor') {
      const intern = db.prepare('SELECT mentor_id FROM interns WHERE user_id = ?').get(request.user_id);
      if (!intern || intern.mentor_id !== req.user.id) {
        return res.status(403).json({ error: 'Mentors can only review leave requests for their assigned interns.' });
      }
    }

    if (request.status !== 'Pending') return res.status(400).json({ error: 'This leave request has already been reviewed.' });
    
    if (req.user.role === 'HR' && request.user_id === req.user.id) {
      return res.status(403).json({ error: 'You cannot review your own leave request.' });
    }

    db.prepare(`UPDATE leave_requests SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(status, review_notes.trim() || null, req.user.id, request.id);

    // Automatically mark attendance as 'Leave' for the respective person (Trainer or Intern)
    if (status === 'Approved') {
      syncLeaveToAttendance({ ...request, status: 'Approved' }, req.user.id);
    } else if (status === 'Rejected') {
      removeLeaveFromAttendance(request);
    }

    db.prepare('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)')
      .run(request.user_id, `Leave request ${status.toLowerCase()}`, `Your ${request.leave_type} leave request for ${request.start_date} to ${request.end_date} was ${status.toLowerCase()}.`);
    res.json({ message: `Leave request ${status.toLowerCase()}.` });
  } catch (error) {
    console.error('Review leave request error:', error);
    res.status(500).json({ error: 'Unable to review the leave request.' });
  }
});

module.exports = router;
