const mysql = require('mysql2/promise');

async function createFreshSchema() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      multipleStatements: true
    });

    console.log('Connected to MySQL server.');

    await connection.query('CREATE DATABASE IF NOT EXISTS iicet_ims;');
    await connection.query('USE iicet_ims;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    const schemaSql = `
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS fees;
      DROP TABLE IF EXISTS task_updates;
      DROP TABLE IF EXISTS tasks;
      DROP TABLE IF EXISTS training_sessions;
      DROP TABLE IF EXISTS trainings;
      DROP TABLE IF EXISTS attendance;
      DROP TABLE IF EXISTS mentor_attendance;
      DROP TABLE IF EXISTS hr_attendance;
      DROP TABLE IF EXISTS staff_attendance;
      DROP TABLE IF EXISTS daily_work_logs;
      DROP TABLE IF EXISTS documents;
      DROP TABLE IF EXISTS documents_new;
      DROP TABLE IF EXISTS mock_interviews;
      DROP TABLE IF EXISTS helpdesk_queries;
      DROP TABLE IF EXISTS director_helpdesk;
      DROP TABLE IF EXISTS leave_requests;
      DROP TABLE IF EXISTS enquiries;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS activity_logs;
      DROP TABLE IF EXISTS interns;
      DROP TABLE IF EXISTS mentors;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS company_profile;

      -- 1. Users Table (Core Identity & Access)
      CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        role ENUM('Director', 'HR', 'Mentor', 'Intern') NOT NULL,
        status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
        password_hash VARCHAR(255) NOT NULL,
        plain_password VARCHAR(255),
        profile_photo VARCHAR(500),
        department VARCHAR(255),
        designation VARCHAR(255),
        joining_date DATE,
        mobile_number VARCHAR(50),
        is_online TINYINT(1) DEFAULT 0,
        last_active_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_users_role (role),
        INDEX idx_users_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 2. Mentors Profile Table (1:1 with users)
      CREATE TABLE mentors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        department VARCHAR(255),
        technology VARCHAR(255) NOT NULL,
        performance_rating FLOAT DEFAULT 5.0,
        performance_notes TEXT,
        hr_id INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_mentor_tech (technology)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 3. Interns Profile Table (1:1 with users)
      CREATE TABLE interns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        batch VARCHAR(100) NOT NULL,
        training_time VARCHAR(100) DEFAULT '09:00 AM - 01:00 PM',
        mentor_id INT,
        hr_id INT,
        department VARCHAR(255) NOT NULL,
        technology VARCHAR(255) NOT NULL,
        status ENUM('Active', 'Completed', 'Terminated') NOT NULL DEFAULT 'Active',
        joining_date DATE NOT NULL,
        completion_date DATE,
        duration_months INT DEFAULT 6,
        mobile_number VARCHAR(50),
        dob DATE,
        college_name VARCHAR(255),
        qualifications VARCHAR(255),
        linkedin_url VARCHAR(500),
        github_url VARCHAR(500),
        resume_url VARCHAR(500),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_interns_batch (batch),
        INDEX idx_interns_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 4. Intern Attendance Table
      CREATE TABLE attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        intern_id INT NOT NULL,
        date DATE NOT NULL,
        check_in_time VARCHAR(50),
        check_out_time VARCHAR(50),
        working_hours FLOAT DEFAULT 0,
        status ENUM('Present', 'Absent', 'Leave', 'Late', 'Half Day') NOT NULL DEFAULT 'Present',
        approved_by INT,
        comments TEXT,
        FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY uk_intern_attendance_date (intern_id, date),
        INDEX idx_att_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 5. Mentor Attendance Table (Trainer Daily Clock-In)
      CREATE TABLE mentor_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mentor_id INT NOT NULL,
        date DATE NOT NULL,
        check_in_time VARCHAR(50),
        check_out_time VARCHAR(50),
        working_hours FLOAT DEFAULT 0,
        status ENUM('Present', 'Absent', 'Leave', 'Late', 'Half Day') NOT NULL DEFAULT 'Present',
        approved_by INT,
        comments TEXT,
        FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY uk_mentor_att_date (mentor_id, date),
        INDEX idx_mentor_att_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 6. HR Attendance Table (HR Daily Clock-In)
      CREATE TABLE hr_attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hr_id INT NOT NULL,
        date DATE NOT NULL,
        check_in_time VARCHAR(50),
        check_out_time VARCHAR(50),
        working_hours FLOAT DEFAULT 0,
        status ENUM('Present', 'Absent', 'Leave', 'Late', 'Half Day') NOT NULL DEFAULT 'Present',
        approved_by INT,
        comments TEXT,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
        UNIQUE KEY uk_hr_att_date (hr_id, date),
        INDEX idx_hr_att_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 7. Daily Work Logs (Trainer & HR Submissions to Director)
      CREATE TABLE daily_work_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        date DATE NOT NULL,
        role VARCHAR(50) NOT NULL,
        title VARCHAR(255),
        work_summary TEXT NOT NULL,
        key_accomplishments TEXT,
        challenges_blockers TEXT,
        hours_spent FLOAT DEFAULT 8.0,
        batch VARCHAR(100),
        session_timing VARCHAR(100),
        director_feedback TEXT,
        director_acknowledged TINYINT(1) DEFAULT 0,
        acknowledged_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY uk_user_worklog_date (user_id, date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 8. Trainings Table
      CREATE TABLE trainings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        department VARCHAR(255) NOT NULL,
        technology VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE,
        mentor_id INT,
        FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 9. Training Sessions Table
      CREATE TABLE training_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        training_id INT NOT NULL,
        trainer_id INT,
        topic VARCHAR(255) NOT NULL,
        batch VARCHAR(100) DEFAULT 'All Assigned',
        date DATE NOT NULL,
        time VARCHAR(50) NOT NULL,
        duration INT NOT NULL,
        meeting_link VARCHAR(500),
        materials_link VARCHAR(500),
        description TEXT,
        status VARCHAR(50) DEFAULT 'Scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
        FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 10. Tasks Table
      CREATE TABLE tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to INT,
        assigned_mentor_id INT,
        assigned_by INT,
        priority ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
        due_date DATE NOT NULL,
        status ENUM('Pending', 'In Progress', 'Review', 'Completed') NOT NULL DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES interns(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_mentor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_task_due (due_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 11. Task Updates & Submissions Table
      CREATE TABLE task_updates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        update_description TEXT NOT NULL,
        submission_link VARCHAR(500),
        submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        feedback TEXT,
        reviewed_by INT,
        reviewed_at DATETIME,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 12. Fees Master Table
      CREATE TABLE fees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        intern_id INT NOT NULL UNIQUE,
        total_amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        remaining_amount DECIMAL(10,2) NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('Fully Paid', 'Partially Paid', 'Unpaid') NOT NULL DEFAULT 'Unpaid',
        FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 13. Payments Ledger Table
      CREATE TABLE payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        fee_id INT NOT NULL,
        amount_paid DECIMAL(10,2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_mode ENUM('Cash', 'Bank Transfer', 'UPI', 'Card') NOT NULL,
        receipt_number VARCHAR(100) NOT NULL UNIQUE,
        comments TEXT,
        FOREIGN KEY (fee_id) REFERENCES fees(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 14. Documents Table
      CREATE TABLE documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        intern_id INT NOT NULL,
        doc_type ENUM('Resume', 'ID Proof', 'Offer Letter', 'Completion Certificate') NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        status ENUM('Uploaded', 'Approved', 'Rejected') NOT NULL DEFAULT 'Uploaded',
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_at DATETIME,
        verified_by INT,
        uploaded_by INT,
        uploader_role VARCHAR(50),
        comments TEXT,
        FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 15. Notifications Table
      CREATE TABLE notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_notif_unread (user_id, is_read)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 16. Activity Logs Table
      CREATE TABLE activity_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        action VARCHAR(255) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        details TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_activity_user (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 17. Leave Requests Table
      CREATE TABLE leave_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        leave_type ENUM('Casual', 'Sick', 'Emergency', 'Work From Home', 'Other') NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days INT NOT NULL,
        reason TEXT NOT NULL,
        status ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
        review_notes TEXT,
        reviewed_by INT,
        reviewed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 18. Company Profile Table (Singleton)
      CREATE TABLE company_profile (
        id INT DEFAULT 1 PRIMARY KEY,
        name VARCHAR(255) NOT NULL DEFAULT 'IICET Services Private Limited',
        address VARCHAR(500) DEFAULT 'Satara, Maharashtra, India',
        email VARCHAR(255) DEFAULT 'info@iicet.org',
        phone VARCHAR(255) DEFAULT '+91 98765 43210',
        website VARCHAR(255) DEFAULT 'www.iicet.org',
        gstin VARCHAR(100) DEFAULT '27IICET1111A1Z1',
        cin VARCHAR(100) DEFAULT 'U85306PN2024PTC227572',
        pan VARCHAR(50) DEFAULT 'AACCI8530P',
        director_name VARCHAR(255) DEFAULT 'Director',
        logo_url VARCHAR(500) DEFAULT '/iicet_logo.png',
        about TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 19. Enquiries Table (CRM Leads)
      CREATE TABLE enquiries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        interest ENUM('Software Development', 'Data Science') NOT NULL,
        status ENUM('New', 'Callback', 'Enrolled', 'Rejected') NOT NULL DEFAULT 'New',
        notes TEXT,
        last_follow_up_date DATE,
        next_follow_up_date DATE,
        hr_id INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hr_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 20. Helpdesk Queries Table
      CREATE TABLE helpdesk_queries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        target_user_id INT,
        target_role VARCHAR(50),
        category VARCHAR(100) DEFAULT 'General',
        priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
        subject VARCHAR(255),
        query_text TEXT NOT NULL,
        answer_text TEXT,
        status ENUM('Open', 'In Progress', 'Resolved', 'Closed', 'Answered') NOT NULL DEFAULT 'Open',
        solved_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        answered_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (solved_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 21. Mock Interviews Table
      CREATE TABLE mock_interviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        intern_id INT NOT NULL,
        mentor_id INT,
        type ENUM('Mock Interview', 'Mock Test') DEFAULT 'Mock Interview',
        interviewer_name VARCHAR(255) NOT NULL,
        scheduled_at DATE NOT NULL,
        focus_areas TEXT,
        score FLOAT CHECK(score >= 0 AND score <= 10),
        feedback TEXT,
        status ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (intern_id) REFERENCES interns(id) ON DELETE CASCADE,
        FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    console.log('Applying clean normalized schema to MySQL `iicet_ims`...');
    await connection.query(schemaSql);

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.log('✓ MySQL `iicet_ims` fresh schema created successfully with zero extra columns.');
    await connection.end();

  } catch (error) {
    console.error('MySQL fresh schema error:', error);
  }
}

module.exports = createFreshSchema;

if (require.main === module) {
  createFreshSchema();
}
