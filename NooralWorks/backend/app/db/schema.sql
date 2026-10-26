-- IICET IMS - Clean Relational Database Schema (3NF/BCNF)
-- Exactly normalized, zero extra columns, zero legacy tables

-- 1. Users (Core Identity & Access)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('Director', 'HR', 'Mentor', 'Intern')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Inactive')),
  password_hash TEXT NOT NULL,
  plain_password TEXT,
  profile_photo TEXT,
  department TEXT,
  designation TEXT,
  joining_date DATE,
  mobile_number TEXT,
  is_online INTEGER DEFAULT 0,
  last_active_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Mentors (1:1 Extension for Trainers)
CREATE TABLE IF NOT EXISTS mentors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  department TEXT,
  technology TEXT NOT NULL,
  performance_rating REAL DEFAULT 5.0,
  performance_notes TEXT,
  hr_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Interns (1:1 Extension for Students/Interns)
CREATE TABLE IF NOT EXISTS interns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  batch TEXT NOT NULL,
  training_time TEXT DEFAULT '09:00 AM - 01:00 PM',
  mentor_id INTEGER,
  hr_id INTEGER,
  department TEXT NOT NULL,
  technology TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Completed', 'Terminated')),
  joining_date DATE NOT NULL,
  completion_date DATE,
  duration_months INTEGER DEFAULT 6,
  mobile_number TEXT,
  dob DATE,
  college_name TEXT,
  qualifications TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  resume_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Attendance (Intern Daily Clock-In / Presence)
CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  date DATE NOT NULL,
  check_in_time TEXT,
  check_out_time TEXT,
  working_hours REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Present' CHECK(status IN ('Present', 'Absent', 'Leave', 'Late', 'Half Day')),
  approved_by INTEGER,
  comments TEXT,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(intern_id, date)
);

-- 5. Mentor Attendance (Trainer Daily Clock-In)
CREATE TABLE IF NOT EXISTS mentor_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mentor_id INTEGER NOT NULL,
  date DATE NOT NULL,
  check_in_time TEXT,
  check_out_time TEXT,
  working_hours REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Present' CHECK(status IN ('Present', 'Absent', 'Leave', 'Late', 'Half Day')),
  approved_by INTEGER,
  comments TEXT,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(mentor_id, date)
);

-- 6. HR Attendance (HR Staff Daily Clock-In)
CREATE TABLE IF NOT EXISTS hr_attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hr_id INTEGER NOT NULL,
  date DATE NOT NULL,
  check_in_time TEXT,
  check_out_time TEXT,
  working_hours REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Present' CHECK(status IN ('Present', 'Absent', 'Leave', 'Late', 'Half Day')),
  approved_by INTEGER,
  comments TEXT,
  FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(hr_id, date)
);

-- 7. Daily Work Logs (Trainer & HR Daily Submission to Director)
CREATE TABLE IF NOT EXISTS daily_work_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date DATE NOT NULL,
  role TEXT NOT NULL,
  title TEXT,
  work_summary TEXT NOT NULL,
  key_accomplishments TEXT,
  challenges_blockers TEXT,
  hours_spent REAL DEFAULT 8.0,
  batch TEXT,
  session_timing TEXT,
  director_feedback TEXT,
  director_acknowledged INTEGER DEFAULT 0,
  acknowledged_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, date)
);

-- 8. Trainings (Syllabus Tracks)
CREATE TABLE IF NOT EXISTS trainings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  department TEXT NOT NULL,
  technology TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  mentor_id INTEGER,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 9. Training Sessions (Class Schedule)
CREATE TABLE IF NOT EXISTS training_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  training_id INTEGER NOT NULL,
  trainer_id INTEGER,
  topic TEXT NOT NULL,
  batch TEXT DEFAULT 'All Assigned',
  date DATE NOT NULL,
  time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  meeting_link TEXT,
  materials_link TEXT,
  description TEXT,
  status TEXT DEFAULT 'Scheduled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
  FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Tasks (Assignments given to Interns or Mentors)
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to INTEGER,
  assigned_mentor_id INTEGER,
  assigned_by INTEGER NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High')),
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'In Progress', 'Review', 'Completed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_mentor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 11. Task Updates (Intern Submissions & Proof)
CREATE TABLE IF NOT EXISTS task_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  update_description TEXT NOT NULL,
  submission_link TEXT,
  submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected')),
  feedback TEXT,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 12. Fees (Financial Obligation Master)
CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL UNIQUE,
  total_amount REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Unpaid' CHECK(status IN ('Fully Paid', 'Partially Paid', 'Unpaid')),
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
);

-- 13. Payments (Installment Ledger)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fee_id INTEGER NOT NULL,
  amount_paid REAL NOT NULL,
  payment_date DATE NOT NULL,
  payment_mode TEXT NOT NULL CHECK(payment_mode IN ('Cash', 'Bank Transfer', 'UPI', 'Card')),
  receipt_number TEXT NOT NULL UNIQUE,
  comments TEXT,
  FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE
);

-- 14. Documents (KYC & Certificates Repository)
CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  doc_type TEXT NOT NULL CHECK(doc_type IN ('Resume', 'ID Proof', 'Offer Letter', 'Completion Certificate')),
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Uploaded' CHECK(status IN ('Uploaded', 'Approved', 'Rejected')),
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  verified_at DATETIME,
  verified_by INTEGER,
  uploaded_by INTEGER,
  uploader_role TEXT,
  comments TEXT,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 15. Notifications (Alert Broadcasting)
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 16. Activity Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  details TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 17. Leave Requests (Time-Off Tracking)
CREATE TABLE IF NOT EXISTS leave_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  leave_type TEXT NOT NULL CHECK(leave_type IN ('Casual', 'Sick', 'Emergency', 'Work From Home', 'Other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  review_notes TEXT,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 18. Company Profile (Organization Settings Singleton)
CREATE TABLE IF NOT EXISTS company_profile (
  id INTEGER PRIMARY KEY DEFAULT 1,
  name TEXT NOT NULL DEFAULT 'IICET Services Private Limited',
  address TEXT DEFAULT '1st Floor, HB Tower, near Bata Showroom, Powai Naka, Satara, Maharashtra 415001, India',
  email TEXT DEFAULT 'enquiry@iicet.com',
  phone TEXT DEFAULT '+91 84858 19119, +91 77578 98255',
  website TEXT DEFAULT 'https://iicet.com',
  gstin TEXT DEFAULT '27AAAAA1111A1Z1',
  cin TEXT DEFAULT 'U85306PN2024PTC227572',
  pan TEXT DEFAULT 'AACCI8530P',
  director_name TEXT DEFAULT 'Director',
  logo_url TEXT DEFAULT '/iicet_logo.png',
  about TEXT DEFAULT 'IICET Services Private Limited is a premier institution in Satara dedicated to training, education, and empowering interns through structured industrial experience and projects.'
);

-- 19. Enquiries (CRM Leads)
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  interest TEXT NOT NULL CHECK(interest IN ('Software Development', 'Data Science')),
  status TEXT NOT NULL DEFAULT 'New' CHECK(status IN ('New', 'Callback', 'Enrolled', 'Rejected')),
  notes TEXT,
  last_follow_up_date DATE,
  next_follow_up_date DATE,
  hr_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 20. Helpdesk Queries (Ticketing System)
CREATE TABLE IF NOT EXISTS helpdesk_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  target_user_id INTEGER,
  target_role TEXT,
  category TEXT DEFAULT 'General',
  priority TEXT DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')),
  subject TEXT,
  query_text TEXT NOT NULL,
  answer_text TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK(status IN ('Open', 'In Progress', 'Resolved', 'Closed', 'Answered')),
  solved_by INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  answered_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (solved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 21. Mock Interviews (Assessment & Feedback)
CREATE TABLE IF NOT EXISTS mock_interviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  intern_id INTEGER NOT NULL,
  mentor_id INTEGER,
  type TEXT DEFAULT 'Mock Interview' CHECK(type IN ('Mock Interview', 'Mock Test')),
  interviewer_name TEXT NOT NULL,
  scheduled_at DATE NOT NULL,
  focus_areas TEXT,
  score REAL CHECK(score >= 0 AND score <= 10),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'Completed' CHECK(status IN ('Scheduled', 'Completed', 'Cancelled')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL
);
