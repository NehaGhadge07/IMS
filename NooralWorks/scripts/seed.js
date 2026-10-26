const db = require('../backend/app/db/connection');
const { hashPassword } = require('../backend/app/core/auth');

function seedFreshDatabase() {
  try {
    console.log('--- Wiping all previous records and resetting to fresh database ---');

    // Disable foreign keys for clean truncation
    db.exec('PRAGMA foreign_keys = OFF;');

    // Drop legacy/temporary tables if they exist
    try { db.exec('DROP TABLE IF EXISTS documents_new;'); } catch (e) {}
    try { db.exec('DROP TABLE IF EXISTS director_helpdesk;'); } catch (e) {}
    try { db.exec('DROP TABLE IF EXISTS staff_attendance;'); } catch (e) {}

    // Clean all data records
    const tables = [
      'activity_logs',
      'notifications',
      'documents',
      'payments',
      'fees',
      'task_updates',
      'tasks',
      'training_sessions',
      'trainings',
      'attendance',
      'mentor_attendance',
      'hr_attendance',
      'daily_work_logs',
      'mock_interviews',
      'helpdesk_queries',
      'leave_requests',
      'enquiries',
      'interns',
      'mentors',
      'users',
      'company_profile'
    ];

    tables.forEach(t => {
      try {
        db.exec(`DELETE FROM ${t};`);
        db.exec(`DELETE FROM sqlite_sequence WHERE name='${t}';`);
      } catch (err) {
        // table might not exist in sqlite yet, safe to ignore
      }
    });

    db.exec('PRAGMA foreign_keys = ON;');

    // 1. Establish Official Company Profile
    db.prepare(`
      INSERT INTO company_profile (id, name, address, email, phone, website, gstin, cin, pan, director_name, logo_url, about)
      VALUES (
        1,
        'IICET Services Private Limited',
        '1st Floor, HB Tower, near Bata Showroom, Powai Naka, Satara, Maharashtra 415001, India',
        'enquiry@iicet.com',
        '+91 84858 19119, +91 77578 98255',
        'https://iicet.com',
        '27AAAAA1111A1Z1',
        'U85306PN2024PTC227572',
        'AACCI8530P',
        'Director',
        '/iicet_logo.png',
        'IICET Services Private Limited is a premier institution in Satara dedicated to training, education, and empowering interns through structured industrial experience and projects.'
      );
    `).run();

    // 2. Insert pristine initial users
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, role, status, password_hash, plain_password, department, designation, joining_date, mobile_number)
      VALUES (?, ?, ?, 'Active', ?, ?, ?, ?, date('now'), ?)
    `);

    // Director
    const directorRes = insertUser.run(
      'Director',
      'director@iicet.com',
      'Director',
      hashPassword('director@123'),
      'director@123',
      'Executive Leadership',
      'Managing Director',
      '+91 98765 43210'
    );
    const directorId = Number(directorRes.lastInsertRowid);

    // HR
    const hrRes = insertUser.run(
      'HR Manager',
      'hr@iicet.com',
      'HR',
      hashPassword('hr@123'),
      'hr@123',
      'Human Resources',
      'HR Executive',
      '+91 84858 19119'
    );
    const hrId = Number(hrRes.lastInsertRowid);

    // Trainer (Mentor)
    const trainerRes = insertUser.run(
      'Technical Trainer',
      'trainer@iicet.com',
      'Mentor',
      hashPassword('trainer@123'),
      'trainer@123',
      'Training & Development',
      'Senior Technical Trainer',
      '+91 77578 98255'
    );
    const trainerId = Number(trainerRes.lastInsertRowid);

    // Intern
    const internRes = insertUser.run(
      'Intern Student',
      'intern@iicet.com',
      'Intern',
      hashPassword('intern@123'),
      'intern@123',
      'Software Development',
      'Software Intern',
      '+91 91234 56789'
    );
    const internUserId = Number(internRes.lastInsertRowid);

    // 3. Insert Mentor extension profile
    db.prepare(`
      INSERT INTO mentors (user_id, department, technology, performance_rating, performance_notes, hr_id)
      VALUES (?, 'Training & Development', 'Full Stack Development', 5.0, 'Initial technical evaluation logged.', ?)
    `).run(trainerId, hrId);

    // 4. Insert Intern extension profile
    db.prepare(`
      INSERT INTO interns (user_id, batch, training_time, mentor_id, hr_id, department, technology, status, joining_date, duration_months, mobile_number, college_name, qualifications)
      VALUES (?, 'Batch 2026-A', '09:00 AM - 01:00 PM', ?, ?, 'Software Development', 'Full Stack Development', 'Active', date('now'), 6, '+91 91234 56789', 'Lead Technical Institute', 'B.Tech / MCA')
    `).run(internUserId, trainerId, hrId);

    console.log('✓ Successfully initialized fresh clean database.');
    console.log('--- Initial Accounts: ---');
    console.log('Director : director@iicet.com | director@123');
    console.log('HR       : hr@iicet.com       | hr@123');
    console.log('Trainer  : trainer@iicet.com  | trainer@123');
    console.log('Intern   : intern@iicet.com   | intern@123');
    console.log('All other tables: 0 records.');

  } catch (error) {
    console.error('Error seeding fresh database:', error);
  }
}

module.exports = seedFreshDatabase;

if (require.main === module) {
  seedFreshDatabase();
}
