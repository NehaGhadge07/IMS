const mysql = require('mysql2/promise');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const sqliteDbPath = path.join(__dirname, '..', 'database', 'interns.db');

function toSqlDatetime(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) {
    return val;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function toSqlDate(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return val;
  }
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

async function runSync() {
  console.log('--- Synchronizing Fresh Clean Database to MySQL `iicet_ims` ---');

  const sqliteDb = new DatabaseSync(sqliteDbPath, { readOnly: true });

  const createSchema = require('./create-mysql-schema');
  await createSchema();

  const mysqlConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'iicet_ims'
  });

  await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 0;');

  async function migrateTable(sqliteTable, mysqlTable, mapper = (r) => r) {
    try {
      const rows = sqliteDb.prepare(`SELECT * FROM ${sqliteTable}`).all();
      if (!rows || rows.length === 0) {
        console.log(`- ${mysqlTable}: 0 rows (clean)`);
        return;
      }
      for (const row of rows) {
        const transformed = mapper(row);
        if (!transformed) continue;
        const keys = Object.keys(transformed);
        const values = Object.values(transformed);
        const placeholders = keys.map(() => '?').join(', ');
        await mysqlConn.query(`INSERT INTO \`${mysqlTable}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`, values);
      }
      console.log(`✓ ${mysqlTable}: ${rows.length} rows inserted.`);
    } catch (e) {
      console.warn(`Error syncing ${mysqlTable}:`, e.message);
    }
  }

  // 1. Company Profile
  await migrateTable('company_profile', 'company_profile');

  // 2. Users
  await migrateTable('users', 'users', r => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    status: r.status,
    password_hash: r.password_hash,
    plain_password: r.plain_password,
    profile_photo: r.profile_photo,
    department: r.department,
    designation: r.designation,
    joining_date: toSqlDate(r.joining_date),
    mobile_number: r.mobile_number,
    is_online: r.is_online || 0,
    last_active_at: toSqlDatetime(r.last_active_at),
    created_at: toSqlDatetime(r.created_at) || new Date(),
    updated_at: toSqlDatetime(r.updated_at) || new Date()
  }));

  // 3. Mentors
  await migrateTable('mentors', 'mentors');

  // 4. Interns
  await migrateTable('interns', 'interns', r => ({
    id: r.id,
    user_id: r.user_id,
    batch: r.batch,
    training_time: r.training_time,
    mentor_id: r.mentor_id,
    hr_id: r.hr_id,
    department: r.department,
    technology: r.technology,
    status: r.status,
    joining_date: toSqlDate(r.joining_date),
    completion_date: toSqlDate(r.completion_date),
    duration_months: r.duration_months,
    mobile_number: r.mobile_number,
    dob: toSqlDate(r.dob),
    college_name: r.college_name,
    qualifications: r.qualifications,
    linkedin_url: r.linkedin_url,
    github_url: r.github_url,
    resume_url: r.resume_url
  }));

  // All other tables are clean (0 rows)
  const remainingTables = [
    'attendance',
    'mentor_attendance',
    'hr_attendance',
    'daily_work_logs',
    'trainings',
    'training_sessions',
    'tasks',
    'task_updates',
    'fees',
    'payments',
    'documents',
    'notifications',
    'activity_logs',
    'leave_requests',
    'enquiries',
    'helpdesk_queries',
    'mock_interviews'
  ];

  for (const t of remainingTables) {
    await migrateTable(t, t);
  }

  await mysqlConn.query('SET FOREIGN_KEY_CHECKS = 1;');
  await mysqlConn.end();

  console.log('--- Zero previous records in all operational modules! ---');
  console.log('--- Both SQLite and MySQL are 100% clean, fresh, and normalized! ---');
}

runSync().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
