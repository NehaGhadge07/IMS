const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');

// Helper to convert array of objects to CSV string with Excel UTF-8 BOM
function convertToCSV(data) {
  if (!data || data.length === 0) {
    return '\uFEFFNo data available';
  }
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      }
      val = val.toString().replace(/"/g, '""'); // escape double quotes
      return `"${val}"`;
    }).join(',')
  );
  return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

// Master SQL queries for all generated reports
const REPORT_QUERIES = {
  interns: {
    title: 'Interns Master Directory Report',
    filename: 'interns_master_directory',
    category: 'Students & Training',
    description: 'Complete roster of registered interns with technology, training slot, contact info, status, and mentor allocation.',
    sql: `
      SELECT i.id as intern_id, u.name as intern_name, u.email, i.training_time as training_slot, i.technology, i.department, 
             i.status, i.joining_date, i.completion_date, i.mobile_number, i.college_name,
             mu.name as mentor_name
      FROM interns i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users mu ON i.mentor_id = mu.id
      ORDER BY u.name ASC
    `
  },
  attendance: {
    title: 'Intern Attendance & Biometric Audit Report',
    filename: 'intern_attendance_audit',
    category: 'Attendance & HR',
    description: 'Daily check-in and check-out timestamps, working hours calculation, comments, and supervisor sign-offs.',
    sql: `
      SELECT a.id as attendance_id, a.date, u.name as intern_name, i.training_time as training_slot, i.technology,
             a.check_in_time, a.check_out_time, a.working_hours, a.status, a.comments,
             ap.name as approved_by_name
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users ap ON a.approved_by = ap.id
      ORDER BY a.date DESC, u.name ASC
    `
  },
  'staff-attendance': {
    title: 'Staff & Trainer Attendance Log Report',
    filename: 'staff_trainer_attendance',
    category: 'Attendance & HR',
    description: 'Attendance logs for Trainers and HR staff members including punch times and working duration.',
    sql: `
      SELECT sa.id as record_id, sa.date, u.name as staff_name, u.email as staff_email, u.role as staff_role,
             sa.check_in_time, sa.check_out_time, sa.working_hours, sa.status, sa.comments,
             ap.name as verified_by_name
      FROM staff_attendance sa
      JOIN users u ON sa.staff_id = u.id
      LEFT JOIN users ap ON sa.approved_by = ap.id
      ORDER BY sa.date DESC, u.name ASC
    `
  },
  fees: {
    title: 'Fee Collection & Balances Summary Report',
    filename: 'fees_collection_summary',
    category: 'Finance & Accounts',
    description: 'Comprehensive financial report of total program fees, collected amounts, outstanding dues, and due dates.',
    sql: `
      SELECT f.id as fee_id, u.name as intern_name, u.email, i.technology,
             f.total_amount, f.paid_amount, f.remaining_amount, f.due_date, f.status as fee_status
      FROM fees f
      JOIN interns i ON f.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      ORDER BY u.name ASC
    `
  },
  payments: {
    title: 'Payment Transactions & Receipts Register Report',
    filename: 'payment_transactions_register',
    category: 'Finance & Accounts',
    description: 'All recorded payments with receipt voucher numbers, payment modes, intern tags, and dates.',
    sql: `
      SELECT p.id as payment_id, p.receipt_number, u.name as intern_name, i.technology,
             p.amount_paid, p.payment_date, p.payment_mode, p.comments
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      JOIN interns i ON f.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      ORDER BY p.payment_date DESC, p.id DESC
    `
  },
  tasks: {
    title: 'Tasks & Milestone Assignments Report',
    filename: 'tasks_milestones_assignments',
    category: 'Students & Training',
    description: 'Institutional task records, assignee roles, priorities, due dates, and completion status.',
    sql: `
      SELECT t.id as task_id, t.title, t.description, 
             COALESCE(um.name, ui.name, 'Unassigned') as assigned_to_name,
             COALESCE(um.role, 'Intern') as assignee_role,
             COALESCE(ua.name, 'System') as assigned_by_name,
             t.priority, t.due_date, t.status as task_status, t.created_at
      FROM tasks t
      LEFT JOIN interns i ON t.assigned_to = i.id
      LEFT JOIN users ui ON i.user_id = ui.id
      LEFT JOIN users um ON t.assigned_mentor_id = um.id
      LEFT JOIN users ua ON t.assigned_by = ua.id
      ORDER BY t.created_at DESC
    `
  },
  placements: {
    title: 'Placement Profiles & Portfolios Report',
    filename: 'placement_profiles_portfolios',
    category: 'Students & Training',
    description: 'Intern career profiles with GitHub, LinkedIn, Resume portfolios, mock interview count, and scores.',
    sql: `
      SELECT i.id as intern_id, u.name as intern_name, u.email, i.technology,
             i.linkedin_url, i.github_url, i.resume_url, i.status as training_status,
             COUNT(m.id) as mock_interviews_count,
             ROUND(AVG(m.score), 1) as avg_mock_score
      FROM interns i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN mock_interviews m ON m.intern_id = i.id
      GROUP BY i.id
      ORDER BY u.name ASC
    `
  },
  'mock-interviews': {
    title: 'Mock Interview Assessment Log Report',
    filename: 'mock_interviews_assessment_log',
    category: 'Students & Training',
    description: 'Detailed mock test & interview evaluations, interviewer remarks, scoring, and technical focus areas.',
    sql: `
      SELECT m.id as interview_id, u.name as intern_name, i.technology,
             COALESCE(m.type, 'Mock Interview') as assessment_type,
             m.interviewer_name, m.scheduled_at, m.focus_areas,
             COALESCE(m.status, CASE WHEN m.score IS NOT NULL THEN 'Completed' ELSE 'Scheduled' END) as assessment_status,
             m.score, m.feedback, m.created_at
      FROM mock_interviews m
      JOIN interns i ON m.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      ORDER BY m.scheduled_at DESC, m.id DESC
    `
  },
  'daily-logs': {
    title: 'Daily Work Logs (Trainer & HR Activity) Report',
    filename: 'daily_work_logs_staff',
    category: 'Attendance & HR',
    description: 'Executive daily log submissions from Trainers and HR staff with accomplishments, blockers, and Director reviews.',
    sql: `
      SELECT dl.id as log_id, dl.date, u.name as author_name, dl.role, dl.title,
             dl.hours_spent, dl.work_summary, dl.key_accomplishments, dl.challenges_blockers,
             dl.director_feedback, dl.director_acknowledged, dl.created_at
      FROM daily_work_logs dl
      JOIN users u ON dl.user_id = u.id
      ORDER BY dl.date DESC, dl.id DESC
    `
  },
  leaves: {
    title: 'Leave Applications & Executive Approvals Report',
    filename: 'leave_applications_approvals',
    category: 'Attendance & HR',
    description: 'Historical leave requests across the institute with leave type, duration, reasons, and review resolutions.',
    sql: `
      SELECT lr.id as request_id, u.name as applicant_name, u.role as applicant_role,
             lr.leave_type, lr.start_date, lr.end_date, lr.total_days, lr.reason,
             lr.status as request_status, lr.review_notes, 
             reviewer.name as reviewed_by_name, lr.created_at
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN users reviewer ON lr.reviewed_by = reviewer.id
      ORDER BY lr.created_at DESC
    `
  },
  helpdesk: {
    title: 'Help Desk & Grievance Resolution Register Report',
    filename: 'helpdesk_resolutions_register',
    category: 'Operations & Support',
    description: 'Central ticket records across all roles with category, priority, problem statements, and resolution notes.',
    sql: `
      SELECT hq.id as ticket_id, u.name as raised_by, u.role as sender_role,
             hq.target_role, hq.category, hq.priority, hq.subject,
             hq.query_text, hq.answer_text, hq.status as ticket_status,
             solver.name as solved_by_name, hq.created_at, hq.answered_at
      FROM helpdesk_queries hq
      JOIN users u ON hq.user_id = u.id
      LEFT JOIN users solver ON hq.solved_by = solver.id
      ORDER BY hq.created_at DESC
    `
  },
  enquiries: {
    title: 'Admissions & Lead Enquiries Report',
    filename: 'admissions_leads_enquiries',
    category: 'Students & Training',
    description: 'Prospective student enquiries, interested internship tracks, follow-up callbacks, and recruitment status.',
    sql: `
      SELECT e.id as enquiry_id, e.name as enquirer_name, e.phone, e.email, e.interest as interest_track,
             e.status as enquiry_status, e.last_follow_up_date, e.next_follow_up_date,
             COALESCE(hr.name, 'Admin') as handled_by_hr, e.notes, e.created_at
      FROM enquiries e
      LEFT JOIN users hr ON e.hr_id = hr.id
      ORDER BY e.created_at DESC
    `
  }
};

function getScopedReportQuery(key, userRole, userId) {
  const report = REPORT_QUERIES[key];
  if (!report) return null;

  if (userRole === 'Mentor') {
    if (key === 'mock-interviews') {
      return {
        ...report,
        sql: `
          SELECT m.id as interview_id, u.name as intern_name, i.technology,
                 COALESCE(m.type, 'Mock Interview') as assessment_type,
                 m.interviewer_name, m.scheduled_at, m.focus_areas,
                 COALESCE(m.status, CASE WHEN m.score IS NOT NULL THEN 'Completed' ELSE 'Scheduled' END) as assessment_status,
                 m.score, m.feedback, m.created_at
          FROM mock_interviews m
          JOIN interns i ON m.intern_id = i.id
          JOIN users u ON i.user_id = u.id
          WHERE i.mentor_id = ?
          ORDER BY m.scheduled_at DESC, m.id DESC
        `,
        params: [userId]
      };
    } else if (key === 'placements') {
      return {
        ...report,
        sql: `
          SELECT i.id as intern_id, u.name as intern_name, u.email, i.technology,
                 i.linkedin_url, i.github_url, i.resume_url, i.status as training_status,
                 COUNT(m.id) as mock_interviews_count,
                 ROUND(AVG(m.score), 1) as avg_mock_score
          FROM interns i
          JOIN users u ON i.user_id = u.id
          LEFT JOIN mock_interviews m ON m.intern_id = i.id
          WHERE i.mentor_id = ?
          GROUP BY i.id
          ORDER BY u.name ASC
        `,
        params: [userId]
      };
    }
  }

  return {
    ...report,
    params: []
  };
}

// GET /api/reports/catalog - List all available Excel report definitions with live counts
router.get('/catalog', authenticateToken, (req, res) => {
  try {
    const userRole = req.user.role;
    const catalog = [];

    for (const [key, report] of Object.entries(REPORT_QUERIES)) {
      // Role check: Mentors can only see placement and mock interview reports in institutional catalog
      if (userRole === 'Mentor' && !['placements', 'mock-interviews'].includes(key)) {
        continue;
      }
      // Interns cannot access institutional admin reports
      if (userRole === 'Intern') {
        continue;
      }

      let count = 0;
      let sampleColumns = [];
      try {
        const scoped = getScopedReportQuery(key, userRole, req.user.id);
        const rows = db.prepare(scoped.sql).all(...scoped.params);
        count = rows.length;
        if (rows.length > 0) {
          sampleColumns = Object.keys(rows[0]);
        }
      } catch (cntErr) {
        console.error(`Count query error for ${key}:`, cntErr.message);
      }

      catalog.push({
        id: key,
        title: report.title,
        filename: report.filename,
        category: report.category,
        description: report.description,
        recordCount: count,
        columns: sampleColumns,
        fileType: 'Excel (.CSV)',
        lastUpdated: new Date().toISOString()
      });
    }

    res.json(catalog);
  } catch (error) {
    console.error('Fetch report catalog error:', error);
    res.status(500).json({ error: 'Server error retrieving reports catalog.' });
  }
});

// GET /api/reports/export/:type - Export any report to Excel/CSV with BOM
router.get('/export/:type', authenticateToken, (req, res) => {
  const type = req.params.type;
  const userRole = req.user.role;

  // Role permissions
  if (userRole === 'Intern') {
    return res.status(403).json({ error: 'Access denied: Interns cannot export system reports.' });
  }
  if (userRole === 'Mentor' && !['placements', 'mock-interviews'].includes(type)) {
    return res.status(403).json({ error: 'Access denied: Mentors can only export training and placement reports.' });
  }

  const scoped = getScopedReportQuery(type, userRole, req.user.id);
  if (!scoped) {
    return res.status(400).json({ error: `Invalid report type: ${type}` });
  }

  try {
    const rows = db.prepare(scoped.sql).all(...scoped.params);
    const csvContent = convertToCSV(rows);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${scoped.filename}_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error(`Export ${type} error:`, error);
    res.status(500).json({ error: 'Server error generating Excel/CSV report.' });
  }
});

// GET /api/reports/preview/:type - Live preview of first rows for interactive table inspection
router.get('/preview/:type', authenticateToken, (req, res) => {
  const type = req.params.type;
  const userRole = req.user.role;

  if (userRole === 'Intern') {
    return res.status(403).json({ error: 'Access denied.' });
  }
  if (userRole === 'Mentor' && !['placements', 'mock-interviews'].includes(type)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const scoped = getScopedReportQuery(type, userRole, req.user.id);
  if (!scoped) {
    return res.status(400).json({ error: `Invalid report type: ${type}` });
  }

  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const allRows = db.prepare(scoped.sql).all(...scoped.params);
    const rows = allRows.slice(0, limit);
    const columns = allRows.length > 0 ? Object.keys(allRows[0]) : [];

    res.json({
      type,
      title: scoped.title,
      totalCount: allRows.length,
      columns,
      rows
    });
  } catch (error) {
    console.error(`Preview ${type} error:`, error);
    res.status(500).json({ error: 'Server error generating preview.' });
  }
});

// Legacy backward-compatible routes
router.get('/interns', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  res.redirect('/api/reports/export/interns');
});
router.get('/attendance', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  res.redirect('/api/reports/export/attendance');
});
router.get('/fees', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  res.redirect('/api/reports/export/fees');
});

// Trainer / Mentor Weekly Specific Endpoints
router.get('/mentor/weekly-attendance', authenticateToken, requireRole(['Mentor']), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT a.date, u.name as intern_name, i.training_time as training_slot, i.technology, a.check_in_time, a.check_out_time, a.working_hours, a.status, a.comments
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE i.mentor_id = ? AND a.date >= date('now', '-7 days')
      ORDER BY a.date DESC, u.name ASC
    `).all(req.user.id);

    if (req.query.format === 'json') {
      return res.json(rows);
    }
    const csvContent = convertToCSV(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="weekly_attendance_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export mentor attendance error:', error);
    res.status(500).json({ error: 'Server error generating report.' });
  }
});

router.get('/mentor/weekly-tasks', authenticateToken, requireRole(['Mentor']), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT t.id, t.title, u.name as intern_name, t.priority, t.due_date, t.status as task_status, t.created_at
      FROM tasks t
      JOIN interns i ON t.assigned_to = i.id
      JOIN users u ON i.user_id = u.id
      WHERE t.assigned_mentor_id = ? AND t.created_at >= datetime('now', '-7 days')
      ORDER BY t.created_at DESC, u.name ASC
    `).all(req.user.id);

    if (req.query.format === 'json') {
      return res.json(rows);
    }
    const csvContent = convertToCSV(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="weekly_tasks_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export mentor tasks error:', error);
    res.status(500).json({ error: 'Server error generating report.' });
  }
});

router.get('/mentor/weekly-logs', authenticateToken, requireRole(['Mentor']), (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT a.date, u.name as intern_name, a.working_hours, a.status, a.comments as feedback_or_log
      FROM attendance a
      JOIN interns i ON a.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE i.mentor_id = ? AND a.date >= date('now', '-7 days') AND a.status != 'Absent' AND a.status != 'Leave'
      ORDER BY a.date DESC, u.name ASC
    `).all(req.user.id);

    if (req.query.format === 'json') {
      return res.json(rows);
    }
    const csvContent = convertToCSV(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="weekly_logs_${new Date().toISOString().split('T')[0]}.csv"`);
    res.status(200).send(csvContent);
  } catch (error) {
    console.error('Export mentor logs error:', error);
    res.status(500).json({ error: 'Server error generating report.' });
  }
});

module.exports = router;
