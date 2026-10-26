const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '..', '..', '..', 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'interns.db');
console.log('Database path:', dbPath);

const db = new DatabaseSync(dbPath);

// Initialize schema
try {
  const schemaPath = path.join(__dirname, 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
    console.log('Database schema checked/initialized successfully.');
  } else {
    console.warn('schema.sql not found at', schemaPath);
  }
} catch (error) {
  console.error('Error initializing database schema:', error);
}

// Ensure default company profile exists
try {
  const countRes = db.prepare("SELECT COUNT(*) as count FROM company_profile").get();
  if (!countRes || countRes.count === 0) {
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
      )
    `).run();
    console.log('Default company profile established.');
  }
} catch (e) {
  console.error('Error ensuring company profile:', e);
}

module.exports = db;
