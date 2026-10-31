const Database = require('better-sqlite3');
const db = new Database('./database/interns.db');

console.log('=== ALL USERS IN DATABASE ===');
const users = db.prepare('SELECT id, name, email, role, status, plain_password FROM users').all();
users.forEach(u => console.log(JSON.stringify(u)));

console.log('\n=== ALL INTERNS IN DATABASE ===');
const interns = db.prepare('SELECT i.id, i.user_id, u.name, u.email, u.status, i.technology, i.training_time FROM interns i LEFT JOIN users u ON i.user_id = u.id').all();
interns.forEach(i => console.log(JSON.stringify(i)));

console.log('\n=== INTERN USERS WITHOUT INTERNS TABLE RECORD ===');
const orphaned = db.prepare("SELECT u.id, u.name, u.email, u.role FROM users u LEFT JOIN interns i ON i.user_id = u.id WHERE u.role = 'Intern' AND i.id IS NULL").all();
orphaned.forEach(u => console.log(JSON.stringify(u)));

console.log('\n=== TOTAL COUNTS ===');
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
const internCount = db.prepare('SELECT COUNT(*) as count FROM interns').get();
console.log('Total users:', userCount.count);
console.log('Total interns rows:', internCount.count);

db.close();
