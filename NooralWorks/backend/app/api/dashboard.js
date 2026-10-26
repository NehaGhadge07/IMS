const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken } = require('../core/auth');

// Helper to get intern id from user id
function getInternId(userId) {
  const row = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// GET /api/dashboard - Get KPIs based on role
router.get('/', authenticateToken, (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    if (role === 'HR') {
      // HR full institutional dashboard metrics (real-time sync across all modules)
      const totalInterns = db.prepare("SELECT COUNT(*) as cnt FROM interns WHERE status = 'Active'").get().cnt;
      const totalMentors = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'Mentor' AND status = 'Active'").get().cnt;
      
      const attendanceToday = db.prepare(`
        SELECT COUNT(*) as cnt 
        FROM attendance a 
        JOIN interns i ON a.intern_id = i.id 
        WHERE a.date = ? AND a.status IN ('Present', 'Late', 'Half Day')
      `).get(today).cnt;
      const attendanceRate = totalInterns > 0 ? Math.round((attendanceToday / totalInterns) * 100) : 0;
      
      const feeSummary = db.prepare(`
        SELECT SUM(f.total_amount) as total, SUM(f.paid_amount) as paid, SUM(f.remaining_amount) as remaining 
        FROM fees f
      `).get();
      
      const pendingDocs = db.prepare(`
        SELECT COUNT(*) as cnt 
        FROM documents d 
        WHERE d.status = 'Uploaded'
      `).get().cnt;

      const pendingTasks = db.prepare(`
        SELECT COUNT(*) as cnt 
        FROM tasks t 
        WHERE t.status = 'Review'
      `).get().cnt;
      
      const techStats = db.prepare(`
        SELECT technology, COUNT(*) as cnt 
        FROM interns 
        WHERE status = 'Active'
        GROUP BY technology
      `).all();

      // Enquiries metrics
      const totalEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries").get().cnt;
      const newEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'New'").get().cnt;
      const callbackEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'Callback'").get().cnt;
      const enrolledEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'Enrolled'").get().cnt;

      const recentEnquiries = db.prepare(`
        SELECT e.*, COALESCE(hr.name, 'Admin') as hr_name 
        FROM enquiries e 
        LEFT JOIN users hr ON e.hr_id = hr.id 
        ORDER BY e.created_at DESC 
        LIMIT 5
      `).all();

      const activities = db.prepare(`
        SELECT al.id, al.user_id, al.action, al.details,
               CASE 
                 WHEN al.timestamp LIKE '%Z' OR al.timestamp LIKE '%+%' THEN al.timestamp
                 WHEN al.timestamp LIKE '% %' THEN REPLACE(al.timestamp, ' ', 'T') || 'Z'
                 ELSE al.timestamp
               END AS timestamp,
               u.name as user_name, u.role as user_role 
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        ORDER BY al.id DESC
        LIMIT 10
      `).all();

      // Today's Trainer Daily Work Logs & Sessions for HR supervision
      const trainerDailyLogs = db.prepare(`
        SELECT u.id as user_id, u.name as trainer_name, u.email as trainer_email,
               dwl.title, dwl.work_summary, dwl.key_accomplishments, dwl.batch, dwl.session_timing,
               dwl.hours_spent, dwl.created_at as log_time,
               ma.status as attendance_status, ma.check_in_time, ma.check_out_time
        FROM users u
        LEFT JOIN daily_work_logs dwl ON dwl.user_id = u.id AND dwl.date = ?
        LEFT JOIN mentor_attendance ma ON ma.mentor_id = u.id AND ma.date = ?
        WHERE u.role = 'Mentor' AND u.status = 'Active'
        ORDER BY u.name ASC
      `).all(today, today);

      return res.json({
        role,
        stats: {
          totalInterns,
          totalMentors,
          attendanceRate,
          feeCollected: feeSummary.paid || 0,
          feeRemaining: feeSummary.remaining || 0,
          pendingDocs,
          pendingTasks,
          techStats,
          totalEnquiries,
          newEnquiries,
          callbackEnquiries,
          enrolledEnquiries
        },
        recentActivities: activities,
        recentEnquiries,
        trainerDailyLogs
      });
    }

    if (role === 'Director') {
      // Global metrics for Director
      const totalInterns = db.prepare("SELECT COUNT(*) as cnt FROM interns WHERE status = 'Active'").get().cnt;
      const totalMentors = db.prepare("SELECT COUNT(*) as cnt FROM users WHERE role = 'Mentor' AND status = 'Active'").get().cnt;
      
      const attendanceToday = db.prepare("SELECT COUNT(*) as cnt FROM attendance WHERE date = ? AND status IN ('Present', 'Late', 'Half Day')").get(today).cnt;
      const attendanceRate = totalInterns > 0 ? Math.round((attendanceToday / totalInterns) * 100) : 0;
      
      const feeSummary = db.prepare("SELECT SUM(total_amount) as total, SUM(paid_amount) as paid, SUM(remaining_amount) as remaining FROM fees").get();
      
      const pendingDocs = db.prepare("SELECT COUNT(*) as cnt FROM documents WHERE status = 'Uploaded'").get().cnt;
      const pendingTasks = db.prepare("SELECT COUNT(*) as cnt FROM tasks WHERE status = 'Review'").get().cnt;
      
      const techStats = db.prepare(`
        SELECT technology, COUNT(*) as cnt 
        FROM interns 
        WHERE status = 'Active' 
        GROUP BY technology
      `).all();

      const activities = db.prepare(`
        SELECT al.id, al.user_id, al.action, al.details,
               CASE 
                 WHEN al.timestamp LIKE '%Z' OR al.timestamp LIKE '%+%' THEN al.timestamp
                 WHEN al.timestamp LIKE '% %' THEN REPLACE(al.timestamp, ' ', 'T') || 'Z'
                 ELSE al.timestamp
               END AS timestamp,
               u.name as user_name, u.role as user_role 
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        ORDER BY al.id DESC
        LIMIT 10
      `).all();

      // Dedicated Login Logs auditing for Director
      const loginActivities = db.prepare(`
        SELECT al.id, al.user_id, al.action, al.details,
               CASE 
                 WHEN al.timestamp LIKE '%Z' OR al.timestamp LIKE '%+%' THEN al.timestamp
                 WHEN al.timestamp LIKE '% %' THEN REPLACE(al.timestamp, ' ', 'T') || 'Z'
                 ELSE al.timestamp
               END AS timestamp,
               u.name as user_name, u.email as user_email, u.role as user_role
        FROM activity_logs al
        JOIN users u ON al.user_id = u.id
        WHERE al.action IN ('User Login', 'Attendance Check-In')
        ORDER BY al.id DESC
        LIMIT 10
      `).all();

      // Enquiries metrics for Director
      const totalEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries").get().cnt;
      const newEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'New'").get().cnt;
      const callbackEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'Callback'").get().cnt;
      const enrolledEnquiries = db.prepare("SELECT COUNT(*) as cnt FROM enquiries WHERE status = 'Enrolled'").get().cnt;

      const recentEnquiries = db.prepare(`
        SELECT e.*, COALESCE(hr.name, 'Admin') as hr_name 
        FROM enquiries e 
        LEFT JOIN users hr ON e.hr_id = hr.id 
        ORDER BY e.created_at DESC 
        LIMIT 5
      `).all();

      // Today's Trainer Daily Work Logs & Sessions for Director supervision
      const trainerDailyLogs = db.prepare(`
        SELECT u.id as user_id, u.name as trainer_name, u.email as trainer_email,
               dwl.title, dwl.work_summary, dwl.key_accomplishments, dwl.batch, dwl.session_timing,
               dwl.hours_spent, dwl.created_at as log_time,
               ma.status as attendance_status, ma.check_in_time, ma.check_out_time
        FROM users u
        LEFT JOIN daily_work_logs dwl ON dwl.user_id = u.id AND dwl.date = ?
        LEFT JOIN mentor_attendance ma ON ma.mentor_id = u.id AND ma.date = ?
        WHERE u.role = 'Mentor' AND u.status = 'Active'
        ORDER BY u.name ASC
      `).all(today, today);

      return res.json({
        role,
        stats: {
          totalInterns,
          totalMentors,
          attendanceRate,
          feeCollected: feeSummary.paid || 0,
          feeRemaining: feeSummary.remaining || 0,
          pendingDocs,
          pendingTasks,
          techStats,
          totalEnquiries,
          newEnquiries,
          callbackEnquiries,
          enrolledEnquiries
        },
        recentActivities: activities,
        loginActivities,
        recentEnquiries,
        trainerDailyLogs
      });
    }

    if (role === 'Mentor') {
      // 1. Assigned interns
      const myInternsCount = db.prepare("SELECT COUNT(*) as cnt FROM interns WHERE mentor_id = ?").get(userId).cnt;
      
      // 2. Pending task reviews (tasks assigned by this mentor that are in 'Review')
      const pendingTaskReviews = db.prepare(`
        SELECT COUNT(*) as cnt 
        FROM tasks t
        JOIN interns i ON t.assigned_to = i.id
        WHERE i.mentor_id = ? AND t.status = 'Review'
      `).get(userId).cnt;
      
      // 3. Logs/attendance pending feedback (today's logs for their interns that have no comment)
      const pendingLogFeedbacks = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM attendance a
        JOIN interns i ON a.intern_id = i.id
        WHERE i.mentor_id = ? AND a.date = ? AND (a.comments IS NULL OR a.comments = '')
      `).get(userId, today).cnt;

      // 4. List of their interns
      const myInterns = db.prepare(`
        SELECT i.id, i.technology, i.training_time, u.name, u.email 
        FROM interns i
        JOIN users u ON i.user_id = u.id
        WHERE i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?)
        LIMIT 10
      `).all(userId, userId);

      // 5. Upcoming Training sessions they host
      const myTrainings = db.prepare(`
        SELECT ts.*, t.title as course_title,
               COALESCE(ts.topic, t.title) as topic,
               (SELECT COUNT(*) FROM interns i WHERE (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))) as attendee_count
        FROM training_sessions ts
        JOIN trainings t ON ts.training_id = t.id
        WHERE (ts.trainer_id = ? OR t.mentor_id = ?) AND ts.date >= ?
        ORDER BY ts.date ASC, ts.time ASC
        LIMIT 10
      `).all(userId, userId, userId, userId, today);

      // 6. Tasks assigned strictly to this specific trainer (by Director or HR)
      const myAssignedTasks = db.prepare(`
        SELECT t.*, ua.name as assigner_name, ua.role as assigner_role
        FROM tasks t
        JOIN users ua ON t.assigned_by = ua.id
        WHERE t.assigned_mentor_id = ?
        ORDER BY 
          CASE t.status 
            WHEN 'Pending' THEN 1 
            WHEN 'In Progress' THEN 2 
            WHEN 'Review' THEN 3 
            ELSE 4 
          END, 
          t.due_date ASC
        LIMIT 10
      `).all(userId);

      const myAssignedTasksCount = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('Pending', 'In Progress') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END) as in_review,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE assigned_mentor_id = ?
      `).get(userId);

      // 7. Help Desk queries from assigned interns or assigned to this trainer
      const myInternQueries = db.prepare(`
        SELECT hq.id, hq.subject, hq.query_text, hq.category, hq.priority, hq.status, hq.created_at,
               u.name as intern_name, u.email as intern_email
        FROM helpdesk_queries hq
        JOIN users u ON hq.user_id = u.id
        WHERE (hq.target_user_id = ? OR hq.user_id IN (SELECT user_id FROM interns WHERE mentor_id = ?))
          AND hq.user_id != ?
        ORDER BY 
          CASE hq.status WHEN 'Open' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END,
          hq.created_at DESC
        LIMIT 6
      `).all(userId, userId, userId);

      const pendingQueriesCount = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM helpdesk_queries hq
        WHERE (hq.target_user_id = ? OR hq.user_id IN (SELECT user_id FROM interns WHERE mentor_id = ?))
          AND hq.user_id != ?
          AND hq.status IN ('Open', 'In Progress')
      `).get(userId, userId, userId).cnt;

      // 8. Mock Assessments count for assigned interns
      const myMockAssessmentsCount = db.prepare(`
        SELECT COUNT(*) as cnt
        FROM mock_interviews m
        JOIN interns i ON m.intern_id = i.id
        WHERE i.mentor_id = ?
      `).get(userId).cnt;

      return res.json({
        role,
        stats: {
          myInternsCount,
          pendingTaskReviews,
          pendingLogFeedbacks,
          myAssignedTasksCount: myAssignedTasksCount ? (myAssignedTasksCount.active || 0) : 0,
          myAssignedTasksTotal: myAssignedTasksCount ? (myAssignedTasksCount.total || 0) : 0,
          pendingQueriesCount,
          myMockAssessmentsCount
        },
        myInterns,
        upcomingTrainings: myTrainings,
        myAssignedTasks,
        myInternQueries
      });
    }

    if (role === 'Intern') {
      const internId = getInternId(userId);
      if (!internId) {
        return res.status(404).json({ error: 'Intern profile not found.' });
      }

      // 1. Today's Attendance status
      const attRecord = db.prepare("SELECT status, check_in_time, check_out_time FROM attendance WHERE intern_id = ? AND date = ?").get(internId, today);
      let attendanceToday = 'Not Checked In';
      if (attRecord) {
        if (attRecord.status === 'Leave') {
          attendanceToday = 'Leave';
        } else if (attRecord.check_in_time) {
          attendanceToday = attRecord.status; // 'Present', 'Late', 'Half Day'
        } else {
          // If marked Absent previously without a check-in time, the intern has not checked in yet today
          attendanceToday = 'Not Checked In';
        }
      }
      
      // 2. Fee status
      const fee = db.prepare("SELECT total_amount, paid_amount, remaining_amount, due_date, status FROM fees WHERE intern_id = ?").get(internId);
      
      // 3. Task counts
      const taskStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE assigned_to = ?
      `).get(internId);

      // 4. Documents uploaded/approved
      const docStats = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) as approved
        FROM documents
        WHERE intern_id = ?
      `).get(internId);

      // 5. Next training sessions scheduled by assigned trainer (or general)
      const internInfo = db.prepare(`
        SELECT i.department, i.technology, i.training_time, i.mentor_id,
               COALESCE(m.user_id, i.mentor_id) as mentor_user_id
        FROM interns i
        LEFT JOIN mentors m ON (m.id = i.mentor_id OR m.user_id = i.mentor_id)
        WHERE i.id = ?
      `).get(internId);

      const mentorUserId = (internInfo && (internInfo.mentor_user_id || internInfo.mentor_id)) || null;
      const internDept = (internInfo && internInfo.department) || 'General';

      let nextSessions = [];
      if (mentorUserId) {
        nextSessions = db.prepare(`
          SELECT ts.*, COALESCE(ts.topic, t.title) as topic, t.title as course_title,
                 u.name as mentor_name, u.email as mentor_email
          FROM training_sessions ts
          JOIN trainings t ON ts.training_id = t.id
          LEFT JOIN users u ON (ts.trainer_id = u.id OR t.mentor_id = u.id)
          WHERE (ts.trainer_id = ? OR t.mentor_id = ?)
            AND ts.date >= ?
          ORDER BY ts.date ASC, ts.time ASC
          LIMIT 10
        `).all(mentorUserId, mentorUserId, today);
      }

      if (!nextSessions || nextSessions.length === 0) {
        nextSessions = db.prepare(`
          SELECT ts.*, COALESCE(ts.topic, t.title) as topic, t.title as course_title,
                 u.name as mentor_name, u.email as mentor_email
          FROM training_sessions ts
          JOIN trainings t ON ts.training_id = t.id
          LEFT JOIN users u ON (ts.trainer_id = u.id OR t.mentor_id = u.id)
          WHERE (t.department = ? OR t.department = 'General')
            AND ts.date >= ?
          ORDER BY ts.date ASC, ts.time ASC
          LIMIT 5
        `).all(internDept, today);
      }

      return res.json({
        role,
        stats: {
          attendanceToday,
          checkInTime: attRecord ? attRecord.check_in_time : null,
          checkOutTime: attRecord ? attRecord.check_out_time : null,
          feeRemaining: fee ? fee.remaining_amount : 0,
          feeStatus: fee ? fee.status : 'N/A',
          tasksPending: (taskStats.pending || 0) + (taskStats.in_progress || 0),
          tasksCompleted: taskStats.completed || 0,
          docsApproved: docStats.approved || 0,
          docsTotal: docStats.total || 0
        },
        nextSessions
      });
    }

    res.status(400).json({ error: 'Unknown role.' });
  } catch (error) {
    console.error('Fetch dashboard error:', error);
    res.status(500).json({ error: 'Server error generating dashboard data.' });
  }
});

module.exports = router;
