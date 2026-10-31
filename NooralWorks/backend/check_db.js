// Database diagnostic script - uses node:sqlite (built-in)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database', 'interns.db');
console.log('Opening DB:', dbPath);
const db = new DatabaseSync(dbPath);

console.log('\n========== ALL USERS ==========');
const users = db.prepare('SELECT id, name, email, role, status, plain_password FROM users').all();
if (users.length === 0) {
  console.log('NO USERS FOUND IN DATABASE!');
} else {
  users.forEach(u => console.log(JSON.stringify(u)));
}

console.log('\n========== ALL INTERNS (with user info) ==========');
const interns = db.prepare(`
  SELECT i.id as intern_id, i.user_id, u.name, u.email, u.role, u.status, u.plain_password,
         i.technology, i.training_time, i.joining_date
  FROM interns i 
  LEFT JOIN users u ON i.user_id = u.id
`).all();
if (interns.length === 0) {
  console.log('NO INTERNS FOUND!');
} else {
  interns.forEach(i => console.log(JSON.stringify(i)));
}

console.log('\n========== INTERN USERS MISSING FROM INTERNS TABLE ==========');
const orphaned = db.prepare(`
  SELECT u.id, u.name, u.email, u.role, u.status 
  FROM users u 
  LEFT JOIN interns i ON i.user_id = u.id 
  WHERE u.role = 'Intern' AND i.id IS NULL
`).all();
if (orphaned.length === 0) {
  console.log('None - all Intern users have a matching interns record.');
} else {
  console.log('WARNING: These users have role=Intern but NO entry in interns table:');
  orphaned.forEach(u => console.log(JSON.stringify(u)));
}

console.log('\n========== SEARCHING FOR nehaghadge004 ==========');
const target = db.prepare("SELECT id, name, email, role, status, plain_password FROM users WHERE email LIKE '%nehaghadge004%'").all();
if (target.length === 0) {
  console.log('USER nehaghadge004@gmail.com NOT FOUND IN DATABASE!');
  console.log('HR must have not added this intern yet, or the email is different.');
} else {
  target.forEach(u => console.log(JSON.stringify(u)));
}

console.log('\n========== COUNTS ==========');
const uc = db.prepare('SELECT COUNT(*) as count FROM users').get();
const ic = db.prepare('SELECT COUNT(*) as count FROM interns').get();
console.log('Total users:', uc.count);
console.log('Total interns rows:', ic.count);

db.close();
