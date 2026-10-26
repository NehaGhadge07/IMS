const cron = require('node-cron');
const db = require('../db/connection');
const { syncAllApprovedLeaves, ensureAbsentRecordsUpToToday } = require('./leave-sync');

// Run sync on startup so any approved leaves and absent records are immediately present
try {
  syncAllApprovedLeaves();
  ensureAbsentRecordsUpToToday();
} catch (e) {
  console.error('[CRON] Initial sync error:', e);
}

// Schedule job to run at 17:00 (5:00 PM) every day
cron.schedule('0 17 * * *', () => {
  console.log('[CRON] Running daily attendance check at 5:00 PM...');
  const today = new Date().toISOString().split('T')[0];

  try {
    // 0. Ensure all approved leaves and absent records are reflected in attendance tables
    syncAllApprovedLeaves();
    ensureAbsentRecordsUpToToday();

    // 1. Mark Absent for all interns who don't have an attendance record for today
    const interns = db.prepare("SELECT id FROM interns WHERE status = 'Active'").all();
    const checkInternStmt = db.prepare('SELECT id FROM attendance WHERE intern_id = ? AND date = ?');
    const insertInternStmt = db.prepare(`
      INSERT INTO attendance (intern_id, date, status, comments) 
      VALUES (?, ?, 'Absent', 'Auto-marked as absent at 5:00 PM')
    `);

    let internAbsentCount = 0;
    for (const intern of interns) {
      const record = checkInternStmt.get(intern.id, today);
      if (!record) {
        insertInternStmt.run(intern.id, today);
        internAbsentCount++;
      }
    }

    console.log(`[CRON] Auto-marked ${internAbsentCount} interns as Absent.`);

    // 2. Mark Absent for all mentors who don't have an attendance record for today
    // Note: mentor_attendance references users(id), which is mentors.user_id
    const mentors = db.prepare('SELECT user_id AS id FROM mentors').all();
    const checkMentorStmt = db.prepare('SELECT id FROM mentor_attendance WHERE mentor_id = ? AND date = ?');
    const insertMentorStmt = db.prepare(`
      INSERT INTO mentor_attendance (mentor_id, date, status, comments) 
      VALUES (?, ?, 'Absent', 'Auto-marked as absent at 5:00 PM')
    `);

    let mentorAbsentCount = 0;
    for (const mentor of mentors) {
      const record = checkMentorStmt.get(mentor.id, today);
      if (!record) {
        insertMentorStmt.run(mentor.id, today);
        mentorAbsentCount++;
      }
    }

    console.log(`[CRON] Auto-marked ${mentorAbsentCount} trainers as Absent.`);
    
  } catch (error) {
    console.error('[CRON] Error during daily attendance check:', error);
  }
});

console.log('[CRON] Auto-attendance background jobs initialized.');
