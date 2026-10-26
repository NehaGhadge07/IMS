const db = require('../db/connection');

function getDatesInRange(startDateStr, endDateStr) {
  const dates = [];
  const current = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

/**
 * When a leave request is approved (or already approved),
 * mark attendance as 'Leave' for each day in that leave period.
 */
function syncLeaveToAttendance(leaveRequest, approvedBy) {
  try {
    if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.start_date || !leaveRequest.end_date) {
      return;
    }

    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(leaveRequest.user_id);
    if (!user) return;

    const dates = getDatesInRange(leaveRequest.start_date, leaveRequest.end_date);
    const reviewerId = approvedBy || leaveRequest.reviewed_by || null;
    const comment = `On Approved Leave: ${leaveRequest.leave_type || 'Leave'}`;

    for (const dateStr of dates) {
      if (user.role === 'Mentor') {
        // Upsert into mentor_attendance
        db.prepare(`
          INSERT INTO mentor_attendance (mentor_id, date, status, approved_by, comments)
          VALUES (?, ?, 'Leave', ?, ?)
          ON CONFLICT(mentor_id, date) DO UPDATE SET
            status = 'Leave',
            approved_by = excluded.approved_by,
            comments = excluded.comments
          WHERE check_in_time IS NULL
        `).run(user.id, dateStr, reviewerId, comment);
      } else if (user.role === 'HR') {
        // Upsert into hr_attendance
        db.prepare(`
          INSERT INTO hr_attendance (hr_id, date, status, approved_by, comments)
          VALUES (?, ?, 'Leave', ?, ?)
          ON CONFLICT(hr_id, date) DO UPDATE SET
            status = 'Leave',
            approved_by = excluded.approved_by,
            comments = excluded.comments
          WHERE check_in_time IS NULL
        `).run(user.id, dateStr, reviewerId, comment);
      } else if (user.role === 'Intern') {
        const intern = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(user.id);
        if (intern) {
          db.prepare(`
            INSERT INTO attendance (intern_id, date, status, approved_by, comments)
            VALUES (?, ?, 'Leave', ?, ?)
            ON CONFLICT(intern_id, date) DO UPDATE SET
              status = 'Leave',
              approved_by = excluded.approved_by,
              comments = excluded.comments
            WHERE check_in_time IS NULL
          `).run(intern.id, dateStr, reviewerId, comment);
        }
      }
    }
  } catch (err) {
    console.error('Error syncing leave to attendance:', err);
  }
}

/**
 * When a leave request is cancelled or rejected,
 * remove the auto-marked 'Leave' records if they haven't been checked into.
 */
function removeLeaveFromAttendance(leaveRequest) {
  try {
    if (!leaveRequest || !leaveRequest.user_id || !leaveRequest.start_date || !leaveRequest.end_date) {
      return;
    }

    const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(leaveRequest.user_id);
    if (!user) return;

    const dates = getDatesInRange(leaveRequest.start_date, leaveRequest.end_date);

    for (const dateStr of dates) {
      if (user.role === 'Mentor') {
        db.prepare(`
          DELETE FROM mentor_attendance 
          WHERE mentor_id = ? AND date = ? AND status = 'Leave' AND check_in_time IS NULL
        `).run(user.id, dateStr);
      } else if (user.role === 'HR') {
        db.prepare(`
          DELETE FROM hr_attendance 
          WHERE hr_id = ? AND date = ? AND status = 'Leave' AND check_in_time IS NULL
        `).run(user.id, dateStr);
      } else if (user.role === 'Intern') {
        const intern = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(user.id);
        if (intern) {
          db.prepare(`
            DELETE FROM attendance 
            WHERE intern_id = ? AND date = ? AND status = 'Leave' AND check_in_time IS NULL
          `).run(intern.id, dateStr);
        }
      }
    }
  } catch (err) {
    console.error('Error removing leave from attendance:', err);
  }
}

/**
 * Sync all approved leaves in the system to attendance tables.
 */
function syncAllApprovedLeaves() {
  try {
    const approvedLeaves = db.prepare(`
      SELECT * FROM leave_requests WHERE status = 'Approved'
    `).all();

    for (const lr of approvedLeaves) {
      syncLeaveToAttendance(lr, lr.reviewed_by);
    }
  } catch (err) {
    console.error('Error syncing all approved leaves:', err);
  }
}

/**
 * Ensures that for all active interns, past dates (yesterday and earlier)
 * that have no attendance record are marked as 'Absent'.
 * NEVER pre-adds today or future dates as Absent!
 */
function ensureAbsentRecordsUpToToday() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const interns = db.prepare("SELECT id, joining_date FROM interns WHERE status = 'Active'").all();
    if (!interns || interns.length === 0) return;

    // Clean up any future dates if they exist
    db.prepare('DELETE FROM attendance WHERE date > ?').run(today);
    // Also remove any pre-marked Absent for today that has no check-in
    db.prepare("DELETE FROM attendance WHERE date = ? AND check_in_time IS NULL AND status = 'Absent'").run(today);

    // Go back up to 60 days max or from joining_date
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const checkStmt = db.prepare('SELECT id, status FROM attendance WHERE intern_id = ? AND date = ?');
    const insertStmt = db.prepare(`
      INSERT INTO attendance (intern_id, date, status, comments)
      VALUES (?, ?, 'Absent', 'Not checked in')
      ON CONFLICT(intern_id, date) DO NOTHING
    `);

    for (const intern of interns) {
      let startDateStr = intern.joining_date || sixtyDaysAgo;
      if (startDateStr < sixtyDaysAgo) startDateStr = sixtyDaysAgo;
      if (startDateStr > yesterday) continue; // Joined today or later, no past absent records

      const curr = new Date(`${startDateStr}T00:00:00Z`);
      const end = new Date(`${yesterday}T00:00:00Z`);

      while (curr <= end) {
        const dStr = curr.toISOString().split('T')[0];
        const existing = checkStmt.get(intern.id, dStr);
        if (!existing) {
          insertStmt.run(intern.id, dStr);
        }
        curr.setUTCDate(curr.getUTCDate() + 1);
      }
    }
  } catch (err) {
    console.error('Error ensuring absent records for past days:', err);
  }
}

module.exports = {
  syncLeaveToAttendance,
  removeLeaveFromAttendance,
  syncAllApprovedLeaves,
  ensureAbsentRecordsUpToToday,
  getDatesInRange
};
