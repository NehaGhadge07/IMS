const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole, hashPassword } = require('../core/auth');
const { sendInternWelcomeEmail, sendStaffWelcomeEmail } = require('../core/email');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// GET /api/interns - List all interns with filters
router.get('/', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT i.id, i.batch, i.training_time, i.department, i.technology, i.status, i.joining_date, i.completion_date,
             i.linkedin_url, i.github_url, i.resume_url, i.mobile_number, i.college_name,
             u.id as user_id, u.name, u.email, u.plain_password, u.status as user_status,
             COALESCE(mu.id, i.mentor_id) as mentor_id, mu.id as mentor_user_id, m.id as mentor_table_id, mu.name as mentor_name,
             (SELECT a.status FROM attendance a WHERE a.intern_id = i.id AND a.date = date('now') LIMIT 1) as attendance_status_today,
             (SELECT a.check_in_time FROM attendance a WHERE a.intern_id = i.id AND a.date = date('now') LIMIT 1) as check_in_today,
             (SELECT f.status FROM fees f WHERE f.intern_id = i.id LIMIT 1) as fee_status,
             (SELECT f.remaining_amount FROM fees f WHERE f.intern_id = i.id LIMIT 1) as fee_remaining,
             (SELECT f.paid_amount FROM fees f WHERE f.intern_id = i.id LIMIT 1) as fee_paid,
             (SELECT COUNT(*) FROM documents d WHERE d.intern_id = i.id) as docs_count,
             (SELECT COUNT(*) FROM documents d WHERE d.intern_id = i.id AND d.status = 'Uploaded') as docs_pending,
             (SELECT COUNT(*) FROM mock_interviews mi WHERE mi.intern_id = i.id) as mock_count,
             (SELECT ROUND(AVG(mi.score), 1) FROM mock_interviews mi WHERE mi.intern_id = i.id) as mock_avg_score,
             (SELECT mi.score FROM mock_interviews mi WHERE mi.intern_id = i.id ORDER BY mi.scheduled_at DESC, mi.id DESC LIMIT 1) as latest_mock_score,
             (SELECT mi.scheduled_at FROM mock_interviews mi WHERE mi.intern_id = i.id ORDER BY mi.scheduled_at DESC, mi.id DESC LIMIT 1) as latest_mock_date
      FROM interns i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users mu ON (i.mentor_id = mu.id OR i.mentor_id IN (SELECT user_id FROM mentors WHERE id = i.mentor_id))
      LEFT JOIN mentors m ON (m.user_id = mu.id OR m.id = i.mentor_id)
      WHERE 1=1
    `;
    const params = [];

    // Filters
    if (req.query.search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR i.technology LIKE ?)`;
      const val = `%${req.query.search}%`;
      params.push(val, val, val);
    }
    if (req.query.slot) {
      query += ` AND (i.training_time = ? OR i.training_time LIKE ?)`;
      params.push(req.query.slot, `%${req.query.slot}%`);
    }
    if (req.query.status) {
      query += ` AND i.status = ?`;
      params.push(req.query.status);
    }
    if (req.query.mentor_id || req.query.trainer_id) {
      const mId = parseInt(req.query.mentor_id || req.query.trainer_id);
      query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
      params.push(mId, mId);
    }
    if (req.query.technology) {
      const tech = req.query.technology.trim();
      const techLower = tech.toLowerCase();
      if (techLower.includes('data science') || techLower === 'data') {
        query += ` AND (LOWER(i.technology) LIKE '%data science%' OR LOWER(i.technology) LIKE '%data%')`;
      } else if (techLower.includes('software') || techLower.includes('develop')) {
        query += ` AND (LOWER(i.technology) LIKE '%software%' OR LOWER(i.technology) LIKE '%develop%')`;
      } else if (techLower.includes('web')) {
        query += ` AND (LOWER(i.technology) LIKE '%web%')`;
      } else {
        query += ` AND (i.technology = ? OR LOWER(i.technology) LIKE ?)`;
        params.push(tech, `%${techLower}%`);
      }
    }

    // Role restrictions: Mentor can only see their own interns
    if (req.user.role === 'Mentor') {
      query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
      params.push(req.user.id, req.user.id);
    } else if (req.user.role === 'Intern') {
      // Intern can only see themselves
      query += ` AND i.user_id = ?`;
      params.push(req.user.id);
    }

    query += ` ORDER BY u.name ASC`;

    const stmt = db.prepare(query);
    const rows = stmt.all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch interns error:', error);
    res.status(500).json({ error: 'Server error fetching interns list.' });
  }
});

// GET /api/interns/mentors - Get list of active team leads with performance details
router.get('/mentors', authenticateToken, (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    let query = `
        SELECT u.id as user_id, m.id as mentor_id, u.name, u.email, u.role, u.profile_photo, u.mobile_number,
               COALESCE(u.department, m.department, 'HR Department') as department, 
               COALESCE(m.technology, u.designation, 'HR Professional') as technology,
               COALESCE(m.performance_rating, 0.0) as performance_rating, 
               COALESCE(m.performance_notes, 'N/A') as performance_notes,
               (SELECT COUNT(*) FROM interns i WHERE i.mentor_id = u.id) as intern_count,
               COALESCE(u.is_online, 0) as is_online,
               u.last_active_at,
               (SELECT check_in_time FROM mentor_attendance ma WHERE ma.mentor_id = u.id AND ma.date = ?) as today_check_in,
               (SELECT check_out_time FROM mentor_attendance ma WHERE ma.mentor_id = u.id AND ma.date = ?) as today_check_out,
               (SELECT status FROM mentor_attendance ma WHERE ma.mentor_id = u.id AND ma.date = ?) as today_status
        FROM users u
        LEFT JOIN mentors m ON m.user_id = u.id
        WHERE u.status = 'Active' AND u.role IN ('Mentor', 'HR')
      `;
    const params = [today, today, today];

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch mentors error:', error);
    res.status(500).json({ error: 'Server error fetching team leads.' });
  }
});

// POST /api/interns/mentors - Add new Team Lead (HR and Director only)
router.post('/mentors', authenticateToken, requireRole(['HR', 'Director']), upload.single('profile_photo'), (req, res) => {
  const { name, email, password, department, technology, role, mobile, mobile_number } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (role !== 'HR' && (!department || !technology)) {
    return res.status(400).json({ error: 'Department and technology are required for Trainers.' });
  }
  
  const assignedRole = (req.user.role === 'Director' && role === 'HR') ? 'HR' : 'Mentor';
  const userMobile = (mobile_number || mobile || '').toString().trim() || null;
  const initialPassword = (password && password.trim()) ? password.trim() : 'trainer123';
  const profilePhoto = req.file ? req.file.filename : null;

  try {
    db.exec('BEGIN TRANSACTION');
    
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      db.exec('ROLLBACK');
      return res.status(400).json({ error: 'Email already exists.' });
    }
    
    const userRes = db.prepare(`
      INSERT INTO users (name, email, password_hash, plain_password, role, status, department, designation, mobile_number, profile_photo)
      VALUES (?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?)
    `).run(
      name.trim(),
      email.trim().toLowerCase(),
      hashPassword(initialPassword),
      initialPassword,
      assignedRole,
      department ? department.trim() : null,
      technology ? technology.trim() : null,
      userMobile,
      profilePhoto
    );
    
    const userId = userRes.lastInsertRowid;
    
    if (assignedRole === 'Mentor') {
      db.prepare(`
        INSERT INTO mentors (user_id, department, technology, performance_rating, performance_notes, hr_id)
        VALUES (?, ?, ?, 5.0, 'Performance review pending.', ?)
      `).run(userId, department ? department.trim() : 'General', technology ? technology.trim() : 'General', req.user.id);
    }
    
    db.exec('COMMIT');

    // Asynchronously send credentials email to trainer/staff
    sendStaffWelcomeEmail({
      to: email.trim().toLowerCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: initialPassword,
      role: assignedRole,
      department: department ? department.trim() : 'General',
      technology: technology ? technology.trim() : 'General'
    }).catch(e => console.error('Staff welcome email error:', e));

    res.status(201).json({ message: 'Staff created successfully.', user_id: userId, profile_photo: profilePhoto });
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch (e) {}
    console.error('Create Staff error:', error);
    res.status(500).json({ error: 'Server error creating staff.' });
  }
});

// PUT /api/interns/mentors/:userId/performance - Update Performance details (HR and Director only)
router.put('/mentors/:userId/performance', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { userId } = req.params;
  const { performance_rating, performance_notes } = req.body;
  
  if (performance_rating === undefined || performance_notes === undefined) {
    return res.status(400).json({ error: 'Missing rating or notes.' });
  }
  
  const ratingVal = parseFloat(performance_rating);
  if (isNaN(ratingVal) || ratingVal < 0 || ratingVal > 5) {
    return res.status(400).json({ error: 'Performance rating must be between 0.0 and 5.0.' });
  }
  
  try {
    const resUpdate = db.prepare(`
      UPDATE mentors
      SET performance_rating = ?, performance_notes = ?
      WHERE user_id = ?
    `).run(ratingVal, performance_notes, parseInt(userId));
    
    if (resUpdate.changes === 0) {
      return res.status(404).json({ error: 'Team Lead profile not found.' });
    }
    
    res.json({ message: 'Performance details updated successfully.' });
  } catch (error) {
    console.error('Update performance error:', error);
    res.status(500).json({ error: 'Server error updating performance.' });
  }
});

// DELETE /api/interns/mentors/:userId - Remove Trainer (Director only)
router.delete('/mentors/:userId', authenticateToken, requireRole(['Director']), (req, res) => {
  const { userId } = req.params;
  try {
    const tlId = parseInt(userId);
    
    // Remove references to prevent SQLite NOT NULL constraint failures on ON DELETE SET NULL
    db.prepare('DELETE FROM helpdesk_queries WHERE trainer_id = ?').run(tlId);
    db.prepare('DELETE FROM tasks WHERE assigned_by = ?').run(tlId);
    db.prepare('UPDATE tasks SET assigned_mentor_id = NULL WHERE assigned_mentor_id = ?').run(tlId);

    // Reassign interns to null if they were assigned to this mentor
    db.prepare('UPDATE interns SET mentor_id = NULL WHERE mentor_id = ?').run(tlId);
    
    // Delete from mentors table
    db.prepare('DELETE FROM mentors WHERE user_id = ?').run(tlId);
    
    // Delete from users table
    db.prepare('DELETE FROM users WHERE id = ?').run(tlId);
    
    res.json({ message: 'Trainer removed successfully.' });
  } catch (error) {
    console.error('Delete trainer error:', error);
    res.status(500).json({ error: 'Server error removing trainer.' });
  }
});

// GET /api/interns/mock-assessments - List mock tests & interviews (scoped for mentors, all for HR/Director)
router.get('/mock-assessments', authenticateToken, (req, res) => {
  try {
    let sql = `
      SELECT m.*, u.name as intern_name, u.email as intern_email, i.batch, i.technology, i.mentor_id
      FROM mock_interviews m
      JOIN interns i ON m.intern_id = i.id
      JOIN users u ON i.user_id = u.id
    `;
    const params = [];
    if (req.user.role === 'Mentor') {
      sql += ` WHERE (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
      params.push(req.user.id, req.user.id);
    } else if (req.user.role === 'Intern') {
      sql += ` WHERE i.user_id = ?`;
      params.push(req.user.id);
    }
    sql += ` ORDER BY m.scheduled_at DESC, m.id DESC`;
    const rows = db.prepare(sql).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch mock assessments error:', error);
    res.status(500).json({ error: 'Server error fetching mock assessments.' });
  }
});

// GET /api/interns/:id - Get specific intern's full profile details
router.get('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    // 1. Fetch Intern & User info
    const intern = db.prepare(`
      SELECT i.*, u.name, u.email, u.profile_photo, u.plain_password, u.mobile_number as user_mobile_number, u.status as user_status, mu.name as mentor_name, mu.email as mentor_email
      FROM interns i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users mu ON i.mentor_id = mu.id
      WHERE i.id = ?
    `).get(parseInt(id));

    if (!intern) {
      return res.status(404).json({ error: 'Intern not found.' });
    }

    intern.mobile_number = intern.mobile_number || intern.user_mobile_number || null;

    // Check permissions: Mentor can only see their assigned interns, Intern can only see themselves
    if (req.user.role === 'Mentor') {
      const mentorRow = db.prepare('SELECT id FROM mentors WHERE user_id = ?').get(req.user.id);
      const mentorTableId = mentorRow ? mentorRow.id : null;
      if (intern.mentor_id !== req.user.id && intern.mentor_id !== mentorTableId) {
        return res.status(403).json({ error: 'Access forbidden. This intern is not assigned to you.' });
      }
    }
    if (req.user.role === 'Intern' && intern.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access forbidden. You can only view your own profile.' });
    }

    // 2. Fetch Attendance Summary & Recent Punch Logs
    const attendanceSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) as leave_days,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) as late_days,
        SUM(working_hours) as total_hours
      FROM attendance
      WHERE intern_id = ?
    `).get(intern.id);

    const recentAttendance = db.prepare(`
      SELECT a.*, ap.name as approved_by_name
      FROM attendance a
      LEFT JOIN users ap ON a.approved_by = ap.id
      WHERE a.intern_id = ?
      ORDER BY a.date DESC, a.id DESC
      LIMIT 30
    `).all(intern.id);

    // 3. Fetch Tasks summary & Recent Tasks
    const tasksSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'Review' THEN 1 ELSE 0 END) as in_review,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
      FROM tasks
      WHERE assigned_to = ?
    `).get(intern.id);

    const recentTasks = db.prepare(`
      SELECT t.*, u_assigner.name as assigned_by_name
      FROM tasks t
      LEFT JOIN users u_assigner ON t.assigned_by = u_assigner.id
      WHERE t.assigned_to = ?
      ORDER BY t.created_at DESC
      LIMIT 15
    `).all(intern.id);

    // 4. Fetch Fee detail & Payment History receipts
    const feeDetail = db.prepare(`
      SELECT * FROM fees WHERE intern_id = ?
    `).get(intern.id);

    const paymentHistory = db.prepare(`
      SELECT p.*
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      WHERE f.intern_id = ?
      ORDER BY p.payment_date DESC, p.id DESC
    `).all(intern.id);

    // 5. Fetch Documents list with verifier and uploader names
    const docs = db.prepare(`
      SELECT d.*, uv.name as verified_by_name, uu.name as uploader_name
      FROM documents d
      LEFT JOIN users uv ON d.verified_by = uv.id
      LEFT JOIN users uu ON d.uploaded_by = uu.id
      WHERE d.intern_id = ?
      ORDER BY d.uploaded_at DESC
    `).all(intern.id);

    // 6. Fetch Recent Daily Work Logs
    const recentDailyLogs = db.prepare(`
      SELECT dl.*, u.name as user_name
      FROM daily_work_logs dl
      JOIN users u ON dl.user_id = u.id
      WHERE dl.user_id = ?
      ORDER BY dl.date DESC, dl.id DESC
      LIMIT 10
    `).all(intern.user_id);

    // 7. Fetch Mock Interviews
    const mockInterviews = db.prepare(`
      SELECT * FROM mock_interviews WHERE intern_id = ? ORDER BY scheduled_at DESC, id DESC
    `).all(intern.id);

    // Combine everything into 360-degree intern dossier
    res.json({
      intern,
      attendanceSummary,
      recentAttendance,
      tasksSummary,
      recentTasks,
      feeDetail,
      paymentHistory,
      documents: docs,
      recentDailyLogs,
      mockInterviews
    });
  } catch (error) {
    console.error('Fetch intern detail error:', error);
    res.status(500).json({ error: 'Server error fetching intern profile details.' });
  }
});

// POST /api/interns - Create a new Intern (HR / Director only)
router.post('/', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { name, email, password, batch, training_time, mentor_id, joining_date, fee_total, fee_due_date, linkedin_url, github_url, resume_url, position, duration } = req.body;

  if (!name || !email || !password || !joining_date || !position || !duration) {
    return res.status(400).json({ error: 'Required fields: name, email, password, joining_date, position, duration' });
  }

  try {
    // Check if user exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Begin database transaction manually
    db.exec('BEGIN TRANSACTION');

    // Hash the password provided by HR
      const passHash = hashPassword(password);
  
      // 1. Create User
      const userRes = db.prepare(`
        INSERT INTO users (name, email, password_hash, plain_password, role, status)
        VALUES (?, ?, ?, ?, 'Intern', 'Active')
      `).run(name.trim(), email.trim().toLowerCase(), passHash, password);
    const userId = userRes.lastInsertRowid;

    // 2. Create Intern Profile (department and technology use defaults)
    const internRes = db.prepare(`
      INSERT INTO interns (user_id, batch, training_time, mentor_id, hr_id, department, technology, status, joining_date, linkedin_url, github_url, resume_url, duration_months)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, ?, ?)
    `).run(
      userId,
      batch ? batch.trim() : '',
      training_time ? training_time.trim() : '09:00 AM - 01:00 PM',
      mentor_id ? parseInt(mentor_id) : null,
      req.user.id,
      'General',
      position.trim(),
      joining_date,
      linkedin_url ? linkedin_url.trim() : null,
      github_url ? github_url.trim() : null,
      resume_url ? resume_url.trim() : null,
      parseInt(duration)
    );
    const internId = internRes.lastInsertRowid;

    // 3. Initialize Fee Structure (default to 0 total if not provided)
    const amount = fee_total ? parseFloat(fee_total) : 0;
    const dueDate = fee_due_date || joining_date;
    db.prepare(`
      INSERT INTO fees (intern_id, total_amount, paid_amount, remaining_amount, due_date, status)
      VALUES (?, ?, 0, ?, ?, 'Unpaid')
    `).run(internId, amount, amount, dueDate);

    // 4. Create welcome notification
    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Welcome to the Intern Portal!', 'Your intern record has been created. Please complete your profile and upload documents.')
    `).run(userId);

    // Commit Transaction
    db.exec('COMMIT');

    // Asynchronously send welcome email with credentials to newly created intern
    sendInternWelcomeEmail({
      to: email.trim().toLowerCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      technology: position.trim(),
      training_time: training_time ? training_time.trim() : '09:00 AM - 01:00 PM',
      joining_date: joining_date
    }).catch(e => console.error('Intern welcome email error:', e));

    res.status(201).json({ message: 'Intern created successfully.', internId, userId });
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Create intern error:', error);
    res.status(500).json({ error: 'Server error creating intern.' });
  }
});

// PUT /api/interns/:id - Update Intern (HR / Director / Mentor)
router.put('/:id', authenticateToken, requireRole(['HR', 'Director', 'Mentor']), (req, res) => {
  const { 
    name, 
    email, 
    password, 
    batch, 
    training_time, 
    mentor_id, 
    department, 
    technology, 
    status, 
    joining_date, 
    completion_date, 
    linkedin_url, 
    github_url, 
    resume_url,
    mobile_number,
    dob,
    college_name,
    qualifications
  } = req.body;

  try {
    const intern = db.prepare('SELECT * FROM interns WHERE id = ?').get(parseInt(id));
    if (!intern) {
      return res.status(404).json({ error: 'Intern not found.' });
    }

    if (req.user.role === 'Mentor' && intern.mentor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access forbidden. This intern is not assigned to you.' });
    }

    db.exec('BEGIN TRANSACTION');

    // 1. Update User info (name, email, password, mobile_number)
    if (name || email || (password && password.trim()) || mobile_number !== undefined) {
      let uQuery = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
      const uParams = [];
      if (name) {
        uQuery += ', name = ?';
        uParams.push(name.trim());
      }
      if (email) {
        uQuery += ', email = ?';
        uParams.push(email.trim().toLowerCase());
      }
      if (password && password.trim()) {
        const passHash = hashPassword(password.trim());
        uQuery += ', password_hash = ?, plain_password = ?, password = ?';
        uParams.push(passHash, password.trim(), password.trim());
      }
      if (mobile_number !== undefined) {
        uQuery += ', mobile_number = ?';
        uParams.push(mobile_number ? mobile_number.trim() : null);
      }
      uQuery += ' WHERE id = ?';
      uParams.push(intern.user_id);
      db.prepare(uQuery).run(...uParams);
    }

    // 2. Update Intern profile info
    db.prepare(`
      UPDATE interns
      SET batch = COALESCE(?, batch),
          training_time = COALESCE(?, training_time),
          mentor_id = COALESCE(?, mentor_id),
          department = COALESCE(?, department),
          technology = COALESCE(?, technology),
          status = COALESCE(?, status),
          joining_date = COALESCE(?, joining_date),
          completion_date = COALESCE(?, completion_date),
          linkedin_url = COALESCE(?, linkedin_url),
          github_url = COALESCE(?, github_url),
          resume_url = COALESCE(?, resume_url),
          mobile_number = COALESCE(?, mobile_number),
          dob = COALESCE(?, dob),
          college_name = COALESCE(?, college_name),
          qualifications = COALESCE(?, qualifications)
      WHERE id = ?
    `).run(
      batch !== undefined && batch !== null ? batch.trim() : null,
      training_time !== undefined && training_time !== null ? training_time.trim() : null,
      mentor_id !== undefined ? (mentor_id ? parseInt(mentor_id) : null) : null,
      department !== undefined && department !== null ? department.trim() : null,
      technology !== undefined && technology !== null ? technology.trim() : null,
      status !== undefined && status !== null ? status.trim() : null,
      joining_date !== undefined ? joining_date : null,
      completion_date !== undefined ? completion_date : null,
      linkedin_url !== undefined ? (linkedin_url ? linkedin_url.trim() : '') : null,
      github_url !== undefined ? (github_url ? github_url.trim() : '') : null,
      resume_url !== undefined ? (resume_url ? resume_url.trim() : '') : null,
      mobile_number !== undefined ? (mobile_number ? mobile_number.trim() : '') : null,
      dob !== undefined ? (dob ? dob.trim() : '') : null,
      college_name !== undefined ? (college_name ? college_name.trim() : '') : null,
      qualifications !== undefined ? (qualifications ? qualifications.trim() : '') : null,
      parseInt(id)
    );

    // If status changes to completed/terminated, update user status too
    if (status === 'Completed' || status === 'Terminated') {
      db.prepare("UPDATE users SET status = 'Inactive' WHERE id = ?").run(intern.user_id);
    } else if (status === 'Active') {
      db.prepare("UPDATE users SET status = 'Active' WHERE id = ?").run(intern.user_id);
    }

    db.exec('COMMIT');
    res.json({ message: 'Intern updated successfully.' });
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Update intern error:', error);
    res.status(500).json({ error: 'Server error updating intern.' });
  }
});

// DELETE /api/interns/:id - Delete Intern (HR / Director only)
router.delete('/:id', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { id } = req.params;
  try {
    const intern = db.prepare('SELECT user_id FROM interns WHERE id = ?').get(parseInt(id));
    if (!intern) {
      return res.status(404).json({ error: 'Intern not found.' });
    }

    // Deleting the user cascades to deletes in interns, attendance, tasks, fees, documents, etc.
    db.prepare('DELETE FROM users WHERE id = ?').run(intern.user_id);
    res.json({ message: 'Intern and all related data deleted successfully.' });
  } catch (error) {
    console.error('Delete intern error:', error);
    res.status(500).json({ error: 'Server error deleting intern.' });
  }
});

// GET /api/interns/:id/mock-interviews
router.get('/:id/mock-interviews', authenticateToken, (req, res) => {
  const { id } = req.params;
  try {
    const rows = db.prepare(`
      SELECT m.*, u.name as intern_name, u.email as intern_email, i.batch, i.technology
      FROM mock_interviews m
      JOIN interns i ON m.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE m.intern_id = ?
      ORDER BY m.scheduled_at DESC, m.id DESC
    `).all(parseInt(id));
    res.json(rows);
  } catch (error) {
    console.error('Fetch mock interviews error:', error);
    res.status(500).json({ error: 'Server error fetching mock interviews.' });
  }
});

// POST /api/interns/:id/mock-interviews - Schedule mock test or interview
router.post('/:id/mock-interviews', authenticateToken, requireRole(['HR', 'Director', 'Mentor']), (req, res) => {
  if (req.user.role === 'Director') {
    return res.status(403).json({ error: 'Director has read-only access to placement and mock records. Only Trainers and HR can schedule or evaluate mock tests/interviews.' });
  }

  const { id } = req.params;
  const internId = parseInt(id);

  try {
    const intern = db.prepare(`
      SELECT i.*, u.name as intern_name, u.id as user_id 
      FROM interns i 
      JOIN users u ON i.user_id = u.id 
      WHERE i.id = ?
    `).get(internId);

    if (!intern) {
      return res.status(404).json({ error: 'Intern not found.' });
    }

    // Role check: Mentor can only schedule for assigned interns
    if (req.user.role === 'Mentor' && intern.mentor_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only schedule mock tests and interviews for your assigned interns.' });
    }

    const { type = 'Mock Interview', interviewer_name, scheduled_at, focus_areas, feedback, score, status } = req.body;
    
    if (!scheduled_at) {
      return res.status(400).json({ error: 'Required field: scheduled_at (Date)' });
    }

    const invName = (interviewer_name && interviewer_name.trim()) || req.user.name || 'Trainer';
    const hasScore = score !== undefined && score !== null && score !== '' && !isNaN(parseFloat(score));
    const parsedScore = hasScore ? parseFloat(score) : null;
    const finalStatus = status || (hasScore ? 'Completed' : 'Scheduled');
    const validTypes = ['Mock Interview', 'Mock Test'];
    const finalType = validTypes.includes(type) ? type : 'Mock Interview';

    const info = db.prepare(`
      INSERT INTO mock_interviews (intern_id, mentor_id, type, interviewer_name, scheduled_at, focus_areas, feedback, score, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      internId,
      req.user.role === 'Mentor' ? req.user.id : (intern.mentor_id || null),
      finalType,
      invName,
      scheduled_at,
      focus_areas ? focus_areas.trim() : null,
      feedback ? feedback.trim() : null,
      parsedScore,
      finalStatus
    );

    // Notify intern
    try {
      const notifMsg = hasScore 
        ? `Your ${finalType} on ${scheduled_at} has been evaluated by Trainer ${invName}. Score: ${parsedScore}/10`
        : `A ${finalType} has been scheduled for ${scheduled_at} by Trainer ${invName}.${focus_areas ? ` Focus: ${focus_areas}` : ''}`;
      db.prepare(`
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, ?, ?)
      `).run(intern.user_id, `${finalType} ${hasScore ? 'Evaluated' : 'Scheduled'}`, notifMsg);
    } catch (notifErr) {
      console.warn('Failed to insert mock notification:', notifErr.message);
    }

    res.status(201).json({ 
      message: `${finalType} ${hasScore ? 'recorded' : 'scheduled'} successfully.`, 
      id: info.lastInsertRowid,
      mock: {
        id: info.lastInsertRowid,
        intern_id: internId,
        intern_name: intern.intern_name,
        type: finalType,
        interviewer_name: invName,
        scheduled_at,
        focus_areas,
        feedback,
        score: parsedScore,
        status: finalStatus
      }
    });
  } catch (error) {
    console.error('Create mock interview error:', error);
    res.status(500).json({ error: 'Server error creating mock interview.' });
  }
});

// Helper function to update mock assessment & mark score
const handleUpdateMockAssessment = (req, res) => {
  const mockId = parseInt(req.params.mockId);
  try {
    const mock = db.prepare(`
      SELECT m.*, i.mentor_id, i.user_id as intern_user_id, u.name as intern_name 
      FROM mock_interviews m 
      JOIN interns i ON m.intern_id = i.id 
      JOIN users u ON i.user_id = u.id 
      WHERE m.id = ?
    `).get(mockId);

    if (!mock) {
      return res.status(404).json({ error: 'Mock assessment not found.' });
    }

    if (req.user.role === 'Mentor' && mock.mentor_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only evaluate or mark scores for your assigned interns.' });
    }

    const { score, feedback, status, focus_areas, interviewer_name, scheduled_at, type } = req.body;
    
    const hasScore = score !== undefined && score !== null && score !== '' && !isNaN(parseFloat(score));
    const newScore = hasScore ? parseFloat(score) : (score === '' || score === null ? null : mock.score);
    const newStatus = status || (newScore !== null ? 'Completed' : mock.status);
    const newFeedback = feedback !== undefined ? (feedback ? feedback.trim() : null) : mock.feedback;
    const newFocus = focus_areas !== undefined ? (focus_areas ? focus_areas.trim() : null) : mock.focus_areas;
    const newInterviewer = interviewer_name !== undefined ? (interviewer_name ? interviewer_name.trim() : mock.interviewer_name) : mock.interviewer_name;
    const newScheduledAt = scheduled_at || mock.scheduled_at;
    const newType = type || mock.type || 'Mock Interview';

    db.prepare(`
      UPDATE mock_interviews 
      SET score = ?, feedback = ?, status = ?, focus_areas = ?, interviewer_name = ?, scheduled_at = ?, type = ?
      WHERE id = ?
    `).run(newScore, newFeedback, newStatus, newFocus, newInterviewer, newScheduledAt, newType, mockId);

    // Notify intern
    try {
      if (hasScore) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message)
          VALUES (?, ?, ?)
        `).run(
          mock.intern_user_id, 
          `${newType} Score Marked`, 
          `Your ${newType} conducted by ${newInterviewer} has been scored: ${newScore}/10.${newFeedback ? ` Feedback: ${newFeedback}` : ''}`
        );
      }
    } catch (notifErr) {
      console.warn('Failed to insert score notification:', notifErr.message);
    }

    res.json({ 
      message: 'Mock assessment updated and score marked successfully.',
      mock: {
        id: mockId,
        score: newScore,
        feedback: newFeedback,
        status: newStatus,
        focus_areas: newFocus,
        interviewer_name: newInterviewer,
        scheduled_at: newScheduledAt,
        type: newType
      }
    });
  } catch (error) {
    console.error('Update mock assessment error:', error);
    res.status(500).json({ error: 'Server error updating mock assessment.' });
  }
};

// PUT /api/interns/mock-interviews/:mockId - Mark score & update mock assessment
router.put('/mock-interviews/:mockId', authenticateToken, requireRole(['HR', 'Mentor']), handleUpdateMockAssessment);
router.put('/:id/mock-interviews/:mockId', authenticateToken, requireRole(['HR', 'Mentor']), handleUpdateMockAssessment);

// Helper function to delete mock assessment
const handleDeleteMockAssessment = (req, res) => {
  const mockId = parseInt(req.params.mockId);
  try {
    const mock = db.prepare(`SELECT m.*, i.mentor_id FROM mock_interviews m JOIN interns i ON m.intern_id = i.id WHERE m.id = ?`).get(mockId);
    if (!mock) return res.status(404).json({ error: 'Mock assessment not found.' });

    if (req.user.role === 'Mentor' && mock.mentor_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete assessments for your assigned interns.' });
    }

    db.prepare('DELETE FROM mock_interviews WHERE id = ?').run(mockId);
    res.json({ message: 'Mock assessment removed successfully.' });
  } catch (error) {
    console.error('Delete mock assessment error:', error);
    res.status(500).json({ error: 'Server error deleting mock assessment.' });
  }
};

router.delete('/mock-interviews/:mockId', authenticateToken, requireRole(['HR', 'Mentor']), handleDeleteMockAssessment);
router.delete('/:id/mock-interviews/:mockId', authenticateToken, requireRole(['HR', 'Mentor']), handleDeleteMockAssessment);

module.exports = router;
