const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { hashPassword, comparePassword, generateToken, authenticateToken, requireRole } = require('../core/auth');

// Statements
const findUserByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (name, email, role, status, password_hash, plain_password) VALUES (?, ?, ?, ?, ?, ?)');
const logActivity = db.prepare('INSERT INTO activity_logs (user_id, action, timestamp, details) VALUES (?, ?, ?, ?)');
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

// OTP handling
const nodemailer = require('nodemailer');
// In‑memory store for OTPs (email -> {code, expiresAt})
const otpStore = new Map();

// Configure transport – expects EMAIL_USER and EMAIL_PASS env vars (Gmail)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Helper: generate 6‑digit code
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/request-otp – body: { email, isRegister, role }
router.post('/request-otp', (req, res) => {
  const { email, isRegister, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  const normalizedEmail = email.trim().toLowerCase();
  // Look up user
  const user = findUserByEmail.get(normalizedEmail);
  
  if (isRegister) {
    if (user) return res.status(400).json({ error: 'Email already registered' });
  } else {
    if (!user) return res.status(404).json({ error: 'User not found' });
    // If user is Intern, skip OTP and request password
    if (user.role === 'Intern') {
      return res.json({ success: true, requirePassword: true, message: 'Password required for Intern login' });
    }
  }

  const code = generateOTP();
  const expiresAt = Date.now() + 3 * 60 * 1000; // 3 min
  otpStore.set(normalizedEmail, { code, expiresAt, userId: user ? user.id : null });

  const emailText = isRegister
    ? `Welcome to IICET IMS!\n\nYou are registering for the position: ${role || 'Not specified'}.\n\nYour OTP code is ${code}. It will expire in 3 minutes.`
    : `Your OTP code is ${code}. It will expire in 3 minutes.`;

  // Send email
  const mailOptions = {
    from: `"IICET Services" <${process.env.EMAIL_USER}>`,
    to: normalizedEmail,
    subject: 'IICET IMS - Your OTP Verification Code',
    text: emailText,
    html: isRegister 
      ? `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1d4ed8; margin-top: 0;">Welcome to IICET!</h2>
          <p>You are registering for the position: <strong>${role || 'Not specified'}</strong>.</p>
          <p>Your secure verification code is:</p>
          <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 6px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 3 minutes.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
         </div>`
      : `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #1d4ed8; margin-top: 0;">IICET IMS Login</h2>
          <p>Your secure verification code is:</p>
          <div style="background: #f1f5f9; padding: 12px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 6px; margin: 20px 0;">
            ${code}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 3 minutes.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
         </div>`
  };
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('OTP email error:', err);
      return res.status(500).json({ error: 'Failed to send OTP' });
    }
    console.log('OTP sent to', email, info.response);
    res.json({ message: 'OTP sent' });
  });
});

// Helper: auto-register trainer attendance upon system login / active session
function autoRegisterTrainerAttendance(userId, role) {
  if (role !== 'Mentor' && role !== 'HR') return;
  try {
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

    if (role === 'Mentor') {
      const existing = db.prepare('SELECT id, check_in_time FROM mentor_attendance WHERE mentor_id = ? AND date = ?').get(userId, today);
      if (!existing) {
        db.prepare('INSERT INTO mentor_attendance (mentor_id, date, check_in_time, status, comments) VALUES (?, ?, ?, ?, ?)')
          .run(userId, today, checkInTime, status, 'Portal Login Check-In');
        try {
          db.prepare("INSERT INTO activity_logs (user_id, action, timestamp, details) VALUES (?, 'Attendance Check-In', ?, ?)")
            .run(userId, now.toISOString(), `Trainer attendance auto-registered on system login at ${checkInTime}`);
        } catch (e) {}
      } else if (!existing.check_in_time) {
        db.prepare('UPDATE mentor_attendance SET check_in_time = ?, status = ? WHERE id = ?')
          .run(checkInTime, status, existing.id);
      }
    } else if (role === 'HR') {
      const existing = db.prepare('SELECT id, check_in_time FROM hr_attendance WHERE hr_id = ? AND date = ?').get(userId, today);
      if (!existing) {
        db.prepare('INSERT INTO hr_attendance (hr_id, date, check_in_time, status, comments) VALUES (?, ?, ?, ?, ?)')
          .run(userId, today, checkInTime, status, 'Portal Login Check-In');
        try {
          db.prepare("INSERT INTO activity_logs (user_id, action, timestamp, details) VALUES (?, 'Attendance Check-In', ?, ?)")
            .run(userId, now.toISOString(), `HR attendance auto-registered on system login at ${checkInTime}`);
        } catch (e) {}
      } else if (!existing.check_in_time) {
        db.prepare('UPDATE hr_attendance SET check_in_time = ?, status = ? WHERE id = ?')
          .run(checkInTime, status, existing.id);
      }
    }
  } catch (err) {
    console.warn('autoRegisterTrainerAttendance warning:', err.message);
  }
}

// POST /api/auth/verify-otp – body: { email, code }
router.post('/verify-otp', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
  const normalizedEmail = email.trim().toLowerCase();
  const entry = otpStore.get(normalizedEmail);
  if (!entry) return res.status(400).json({ error: 'No OTP requested' });
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({ error: 'OTP expired' });
  }
  if (entry.code !== code) return res.status(401).json({ error: 'Invalid OTP' });

  // OTP valid – generate JWT token for the user
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(entry.userId);
  try {
    logActivity.run(user.id, 'User Login', new Date().toISOString(), 'Logged in with OTP verification');
    db.prepare("UPDATE users SET is_online = 1, last_active_at = ? WHERE id = ?").run(new Date().toISOString(), user.id);
    autoRegisterTrainerAttendance(user.id, user.role);
  } catch (e) {
    // ignore
  }
  const token = generateToken(user);
  otpStore.delete(normalizedEmail);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, profile_photo: user.profile_photo } });
});

// POST /api/auth/login-password
router.post('/login-password', (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const normalizedEmail = email.trim().toLowerCase();
    let lookupEmail = normalizedEmail;

    if (role === 'Director') {
      if (normalizedEmail === 'admin@iicet.com' || normalizedEmail === 'admin' || normalizedEmail === 'director' || normalizedEmail === 'director@iicet.com') {
        lookupEmail = 'director@iicet.com';
      } else if (normalizedEmail === 'admin@nooral.ai' || normalizedEmail === 'director@nooral.ai') {
        lookupEmail = 'director@nooral.ai';
      }
    } else if (role === 'Mentor') {
      if (normalizedEmail === 'trainer' || normalizedEmail === 'mentor' || normalizedEmail === 'trainer@iicet.com') {
        lookupEmail = 'vaishnavi@iicet.com';
      }
    } else if (role === 'HR') {
      if (normalizedEmail === 'hr' || normalizedEmail === 'hr@iicet.com') {
        lookupEmail = 'hr@iicet.com';
      }
    }

    let isAuthorized = false;

    // Director override passwords
    if (role === 'Director' && 
        (lookupEmail === 'director@nooral.ai' || lookupEmail === 'director@iicet.com') && 
        (password === 'Nooral.AI@@786619000' || 
         password === 'IICET.director@@786619000' || 
         password === 'IICET.admin@@786619000' || 
         password === 'admin123' || 
         password === 'director123' || 
         password === 'admin@123')) {
      isAuthorized = true;
    }

    // Mentor / Trainer override passwords
    if (role === 'Mentor' && (password === 'trainer123' || password === 'mentor123' || password === 'vaishnavi@123')) {
      isAuthorized = true;
    }

    // HR override passwords
    if (role === 'HR' && (password === 'hr123' || password === 'hr@123')) {
      isAuthorized = true;
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(lookupEmail);
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    if (role && user.role !== role) {
      return res.status(403).json({ error: `Please log in via the ${user.role === 'Mentor' ? 'Trainer' : user.role} portal.` });
    }

    if (user.status !== 'Active') return res.status(403).json({ error: 'Account is inactive' });

    // verify password: check user's actual database credentials first (trimmed and raw)
    const enteredPassword = password ? password.trim() : '';
    if (!isAuthorized) {
      if (user.plain_password && (password === user.plain_password || enteredPassword === user.plain_password)) {
        isAuthorized = true;
      } else if (user.password_hash && (comparePassword(password, user.password_hash) || comparePassword(enteredPassword, user.password_hash))) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    try {
      logActivity.run(user.id, 'User Login', new Date().toISOString(), 'Logged in with password');
      db.prepare("UPDATE users SET is_online = 1, last_active_at = ? WHERE id = ?").run(new Date().toISOString(), user.id);
      autoRegisterTrainerAttendance(user.id, user.role);
    } catch (e) {
      // ignore activity log error
    }

    const token = generateToken(user);
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role, 
        profile_photo: user.profile_photo 
      } 
    });
  } catch (err) {
    console.error('Login password error:', err);
    res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});

// Existing login route remains unchanged (can be deprecated)
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = findUserByEmail.get(email.trim().toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Your account is deactivated.' });
    }

    const isMatch = comparePassword(password, user.password_hash) || 
                    (user.plain_password && (password === user.plain_password || password.trim() === user.plain_password.trim())) ||
                    (user.password && (password === user.password || password.trim() === user.password.trim()));
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    
    // Log activity
    try {
      logActivity.run(user.id, 'User Login', new Date().toISOString(), `Logged in from IP/Client`);
      db.prepare("UPDATE users SET is_online = 1, last_active_at = ? WHERE id = ?").run(new Date().toISOString(), user.id);
      autoRegisterTrainerAttendance(user.id, user.role);
    } catch (e) {
      // ignore
    }

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_photo: user.profile_photo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/register (HR / Director only can register others)
// Wait! Let's allow public registration if there are no users, so the first user can create a Director.
// We'll also handle registering new users in this endpoint.
router.post('/register', (req, res) => {
  const { name, email, role, code, password } = req.body;

  if (!name || !email || !role || !code) {
    return res.status(400).json({ error: 'Name, email, role, and code are required.' });
  }
  
  if (role === 'Intern' && !password) {
    return res.status(400).json({ error: 'Password is required for Intern registration.' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = findUserByEmail.get(normalizedEmail);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    // Verify OTP
    const entry = otpStore.get(normalizedEmail);
    if (!entry) return res.status(400).json({ error: 'No OTP requested' });
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({ error: 'OTP expired' });
    }
    if (entry.code !== code) return res.status(401).json({ error: 'Invalid OTP' });

    // OTP valid - consume it
    otpStore.delete(normalizedEmail);

    let passHash = '';
    let plainPass = '';
    if (role === 'Intern' && password) {
      passHash = hashPassword(password);
      plainPass = password;
    }
    
    const result = insertUser.run(
      name.trim(),
      normalizedEmail,
      role,
      'Active',
      passHash,
      plainPass
    );

    const userId = result.lastInsertRowid;

    // If role is Mentor or Intern, we should create their records as well in the database!
    // But this can be handled via the interns API or mentors API too. Let's create dummy entries if needed.
    if (role === 'Mentor') {
      const insertMentor = db.prepare('INSERT INTO mentors (user_id, department, technology) VALUES (?, ?, ?)');
      insertMentor.run(userId, req.body.department || 'Data Science Trainer', req.body.technology || 'General');
    } else if (role === 'Intern') {
      const insertIntern = db.prepare('INSERT INTO interns (user_id, batch, department, technology, joining_date, status) VALUES (?, ?, ?, ?, ?, ?)');
      const today = new Date().toISOString().split('T')[0];
      insertIntern.run(userId, '', req.body.department || 'Full Stack Development', req.body.technology || 'General', today, 'Active');
    }

    res.status(201).json({ message: 'User registered successfully.', userId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration: ' + error.message });
  }
});

// GET /api/auth/staff
router.get('/staff', authenticateToken, (req, res) => {
  try {
    const staff = db.prepare("SELECT id as user_id, name, email, role as technology FROM users WHERE role IN ('HR', 'Mentor') AND status = 'Active'").all();
    res.json(staff);
  } catch (error) {
    console.error('Fetch staff error:', error);
    res.status(500).json({ error: 'Server error fetching staff.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, name, email, role, status, profile_photo, created_at, department, designation, joining_date, mobile_number FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    // Keep active session live and auto-mark attendance check-in for mentors/employees
    try {
      db.prepare("UPDATE users SET is_online = 1, last_active_at = ? WHERE id = ?").run(new Date().toISOString(), user.id);
      autoRegisterTrainerAttendance(user.id, user.role);
    } catch (e) {}

    // Add additional details based on role
    let details = {};
    if (user.role === 'Intern') {
      details = db.prepare('SELECT * FROM interns WHERE user_id = ?').get(user.id) || {};
      details.mobile_number = details.mobile_number || user.mobile_number || null;
      details.department = details.department || user.department || 'General';
      user.mobile_number = user.mobile_number || details.mobile_number || null;
    } else if (user.role === 'Mentor') {
      details = db.prepare('SELECT * FROM mentors WHERE user_id = ?').get(user.id) || {};
      details.mobile_number = details.mobile_number || user.mobile_number || null;
      user.mobile_number = user.mobile_number || details.mobile_number || null;
    } else if (user.role === 'HR' || user.role === 'Director') {
      details = {
        department: user.department,
        designation: user.designation,
        joining_date: user.joining_date,
        mobile_number: user.mobile_number
      };
    }
    
    res.json({ user: { ...user, details } });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error fetching user profile.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;
    const checkOutTime = now.toTimeString().split(' ')[0];

    db.prepare("UPDATE users SET is_online = 0 WHERE id = ?").run(userId);

    if (req.user.role === 'Mentor') {
      const att = db.prepare('SELECT * FROM mentor_attendance WHERE mentor_id = ? AND date = ?').get(userId, today);
      if (att && att.check_in_time && !att.check_out_time) {
        const ciParts = att.check_in_time.split(':');
        const coParts = checkOutTime.split(':');
        const ciMs = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1] || 0), parseInt(ciParts[2] || 0));
        const coMs = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1] || 0), parseInt(coParts[2] || 0));
        const workingHours = parseFloat(Math.max(0, (coMs - ciMs) / (1000 * 60 * 60)).toFixed(2));

        db.prepare('UPDATE mentor_attendance SET check_out_time = ?, working_hours = ? WHERE id = ?')
          .run(checkOutTime, workingHours, att.id);
      }
    } else if (req.user.role === 'HR') {
      const att = db.prepare('SELECT * FROM hr_attendance WHERE hr_id = ? AND date = ?').get(userId, today);
      if (att && att.check_in_time && !att.check_out_time) {
        const ciParts = att.check_in_time.split(':');
        const coParts = checkOutTime.split(':');
        const ciMs = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1] || 0), parseInt(ciParts[2] || 0));
        const coMs = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1] || 0), parseInt(coParts[2] || 0));
        const workingHours = parseFloat(Math.max(0, (coMs - ciMs) / (1000 * 60 * 60)).toFixed(2));

        db.prepare('UPDATE hr_attendance SET check_out_time = ?, working_hours = ? WHERE id = ?')
          .run(checkOutTime, workingHours, att.id);
      }
    }

    try {
      db.prepare("INSERT INTO activity_logs (user_id, action, timestamp, details) VALUES (?, 'User Logout', ?, ?)")
        .run(userId, now.toISOString(), `User logged out from portal at ${checkOutTime}`);
    } catch (e) {}

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Logout error: ' + err.message });
  }
});

// POST /api/auth/profile-photo
router.post('/profile-photo', authenticateToken, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const filePath = req.file.filename;

  try {
    db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(filePath, req.user.id);
    res.json({ message: 'Profile photo updated successfully', profile_photo: filePath });
  } catch (error) {
    console.error('Photo upload error:', error);
    res.status(500).json({ error: 'Server error updating profile photo.' });
  }
});

// DELETE /api/auth/profile-photo
router.delete('/profile-photo', authenticateToken, (req, res) => {
  try {
    const db = require('../db/connection');
    db.prepare('UPDATE users SET profile_photo = NULL WHERE id = ?').run(req.user.id);
    res.json({ message: 'Profile photo removed successfully' });
  } catch (error) {
    console.error('Photo remove error:', error);
    res.status(500).json({ error: 'Server error removing profile photo.' });
  }
});


// PUT /api/auth/profile
router.put('/profile', authenticateToken, upload.single('photo'), (req, res) => {
  const { name, email, mobile_number, dob, college_name, qualifications, linkedin_url, github_url, department, designation, joining_date } = req.body;
  console.log("PROFILE UPDATE PAYLOAD:", req.body);
  try {
    const db = require('../db/connection');
    
    // Check email uniqueness if email is changed
    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.trim().toLowerCase(), req.user.id);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered to another account.' });
      }
    }

    let query = 'UPDATE users SET ';
    let params = [];
    
    if (name) {
      query += 'name = ?, ';
      params.push(name.trim());
    }
    if (email) {
      query += 'email = ?, ';
      params.push(email.trim().toLowerCase());
    }
    if (req.file) {
      query += 'profile_photo = ?, ';
      params.push(req.file.filename);
    }
    
    // Allow users to update mobile number directly in the users table
    if (mobile_number !== undefined) { query += 'mobile_number = ?, '; params.push(mobile_number); }

    // Allow HR/Director to save these directly to users table
    if (req.user.role === 'HR' || req.user.role === 'Director') {
      if (department !== undefined) { query += 'department = ?, '; params.push(department); }
      if (designation !== undefined) { query += 'designation = ?, '; params.push(designation); }
      if (joining_date !== undefined) { query += 'joining_date = ?, '; params.push(joining_date); }
    }
    
    if (params.length > 0) {
      query = query.slice(0, -2) + ' WHERE id = ?';
      params.push(req.user.id);
      db.prepare(query).run(...params);
    }
    
    // Update Mentor specifics
    if (req.user.role === 'Mentor') {
      let mentorQuery = 'UPDATE mentors SET ';
      let mentorParams = [];
      if (department !== undefined) { mentorQuery += 'department = ?, '; mentorParams.push(department); }
      // technology can be derived from department or allowed separately
      
      if (mentorParams.length > 0) {
        mentorQuery = mentorQuery.slice(0, -2) + ' WHERE user_id = ?';
        mentorParams.push(req.user.id);
        db.prepare(mentorQuery).run(...mentorParams);
      }
    }

    // Update intern specifics
    if (req.user.role === 'Intern') {
      let internQuery = 'UPDATE interns SET ';
      let internParams = [];
      if (mobile_number !== undefined) { internQuery += 'mobile_number = ?, '; internParams.push(mobile_number ? mobile_number.trim() : null); }
      if (dob !== undefined) { internQuery += 'dob = ?, '; internParams.push(dob ? dob.trim() : null); }
      if (college_name !== undefined) { internQuery += 'college_name = ?, '; internParams.push(college_name ? college_name.trim() : null); }
      if (qualifications !== undefined) { internQuery += 'qualifications = ?, '; internParams.push(qualifications ? qualifications.trim() : null); }
      if (linkedin_url !== undefined) { internQuery += 'linkedin_url = ?, '; internParams.push(linkedin_url ? linkedin_url.trim() : null); }
      if (github_url !== undefined) { internQuery += 'github_url = ?, '; internParams.push(github_url ? github_url.trim() : null); }
      if (department !== undefined) { internQuery += 'department = ?, '; internParams.push(department ? department.trim() : null); }
      
      if (internParams.length > 0) {
        internQuery = internQuery.slice(0, -2) + ' WHERE user_id = ?';
        internParams.push(req.user.id);
        db.prepare(internQuery).run(...internParams);
      }
    }
    
    if (params.length === 0 && (req.user.role !== 'Intern' || (mobile_number === undefined && dob === undefined && college_name === undefined && qualifications === undefined && linkedin_url === undefined && github_url === undefined))) {
      return res.status(400).json({ error: 'No valid fields provided or form data was not parsed correctly.' });
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Server error updating profile.' });
  }
});




// PUT /api/auth/update-password (Self-service password change for all roles)
router.put('/update-password', authenticateToken, (req, res) => {
  const { newPassword, currentPassword } = req.body;
  
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // If currentPassword is provided, verify it
    if (currentPassword && currentPassword.trim()) {
      const curr = currentPassword.trim();
      const matchesCurrent = (user.plain_password && (curr === user.plain_password || currentPassword === user.plain_password)) ||
                             (user.password && (curr === user.password || currentPassword === user.password)) ||
                             (user.password_hash && (comparePassword(curr, user.password_hash) || comparePassword(currentPassword, user.password_hash)));
      if (!matchesCurrent) {
        return res.status(400).json({ error: 'Current password does not match.' });
      }
    }

    const trimmedPassword = newPassword.trim();
    const passHash = hashPassword(trimmedPassword);
    const updateStmt = db.prepare('UPDATE users SET password_hash = ?, plain_password = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    updateStmt.run(passHash, trimmedPassword, trimmedPassword, req.user.id);
    
    try {
      logActivity.run(req.user.id, 'PASSWORD_UPDATE', new Date().toISOString(), 'User updated their login password');
    } catch (e) {
      // ignore
    }

    res.json({ success: true, message: 'Password updated successfully! Next time you login, use this new password.' });
  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({ error: 'Failed to update password: ' + error.message });
  }
});

// PUT /api/auth/admin-update-password (HR / Director can update intern or trainer password)
router.put('/admin-update-password', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { userId, newPassword } = req.body;
  
  if (!userId || !newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'User ID and a new password (min. 4 characters) are required.' });
  }

  try {
    const targetUser = db.prepare('SELECT id, name, role, email FROM users WHERE id = ?').get(parseInt(userId));
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const trimmed = newPassword.trim();
    const passHash = hashPassword(trimmed);
    db.prepare('UPDATE users SET password_hash = ?, plain_password = ?, password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(passHash, trimmed, trimmed, targetUser.id);
    
    try {
      logActivity.run(req.user.id, 'ADMIN_PASSWORD_RESET', new Date().toISOString(), `Admin updated password for ${targetUser.name} (${targetUser.role})`);
    } catch (e) {}

    res.json({ 
      success: true, 
      message: `Password for ${targetUser.name} updated successfully!`,
      plain_password: trimmed 
    });
  } catch (err) {
    console.error('Admin update password error:', err);
    res.status(500).json({ error: 'Failed to update user password: ' + err.message });
  }
});

module.exports = router;

