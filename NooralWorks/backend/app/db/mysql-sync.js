const mysql = require('mysql2/promise');
const path = require('path');

let mysqlPool = null;

function getMysqlPool() {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || 'root',
      database: process.env.MYSQL_DATABASE || 'iicet_ims',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return mysqlPool;
}

const DATE_COLUMNS = new Set([
  'date', 'start_date', 'end_date', 'due_date', 'payment_date',
  'joining_date', 'completion_date', 'dob', 'scheduled_at',
  'last_follow_up_date', 'next_follow_up_date'
]);

const DATETIME_COLUMNS = new Set([
  'timestamp', 'created_at', 'updated_at', 'last_active_at',
  'reviewed_at', 'answered_at', 'acknowledged_at',
  'uploaded_at', 'verified_at', 'submission_date'
]);

function toSqlDate(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function toSqlDatetime(val) {
  if (!val) return null;
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function formatValueForMysql(colName, val) {
  if (val === null || val === undefined) return null;
  const lower = colName.toLowerCase();
  if (DATE_COLUMNS.has(lower)) {
    return toSqlDate(val);
  }
  if (DATETIME_COLUMNS.has(lower)) {
    return toSqlDatetime(val);
  }
  return val;
}

const ALL_SYNC_TABLES = [
  'company_profile',
  'users',
  'mentors',
  'interns',
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

// Debounce queue for background sync
const syncQueue = new Set();
let isSyncing = false;
let syncTimeout = null;

let sqliteDbInstance = null;

function setSqliteDb(db) {
  sqliteDbInstance = db;
}

/**
 * Synchronizes a specific table from SQLite to MySQL
 */
async function syncTableToMysql(tableName) {
  if (!sqliteDbInstance) return;
  const pool = getMysqlPool();
  let conn = null;

  try {
    conn = await pool.getConnection();
    const rows = sqliteDbInstance.prepare(`SELECT * FROM \`${tableName}\``).all();

    await conn.query('SET FOREIGN_KEY_CHECKS = 0;');

    if (!rows || rows.length === 0) {
      await conn.query(`DELETE FROM \`${tableName}\``);
    } else {
      const sample = rows[0];
      const keys = Object.keys(sample);
      const placeholders = keys.map(() => '?').join(', ');
      const replaceSql = `REPLACE INTO \`${tableName}\` (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = keys.map(k => formatValueForMysql(k, row[k]));
        await conn.query(replaceSql, values);
      }

      // Remove deleted records
      if (keys.includes('id')) {
        const ids = rows.map(r => r.id).filter(id => id !== undefined && id !== null);
        if (ids.length > 0) {
          await conn.query(`DELETE FROM \`${tableName}\` WHERE id NOT IN (${ids.join(',')})`);
        }
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1;');
  } catch (err) {
    console.warn(`[MySQL Sync Warning] Failed to sync ${tableName}:`, err.message);
  } finally {
    if (conn) {
      try { await conn.query('SET FOREIGN_KEY_CHECKS = 1;'); } catch (e) {}
      conn.release();
    }
  }
}

async function processQueue() {
  if (isSyncing || syncQueue.size === 0) return;
  isSyncing = true;

  try {
    const tablesToSync = Array.from(syncQueue);
    syncQueue.clear();

    for (const table of tablesToSync) {
      await syncTableToMysql(table);
    }
  } catch (err) {
    console.warn('[MySQL Sync processQueue Error]:', err.message);
  } finally {
    isSyncing = false;
    if (syncQueue.size > 0) {
      setTimeout(processQueue, 30);
    }
  }
}

/**
 * Queue a table for immediate real-time sync (debounced by 30ms)
 */
function queueTableSync(tableName) {
  if (!tableName) return;
  const cleanTable = tableName.replace(/[`"']/g, '').trim();
  if (ALL_SYNC_TABLES.includes(cleanTable)) {
    syncQueue.add(cleanTable);
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(processQueue, 30);
  }
}

/**
 * Sync all tables immediately (used at server startup)
 */
async function syncAllTablesNow() {
  if (!sqliteDbInstance) return;
  console.log('[MySQL Sync] Synchronizing all tables from SQLite to MySQL `iicet_ims`...');
  for (const table of ALL_SYNC_TABLES) {
    await syncTableToMysql(table);
  }
  console.log('[MySQL Sync] All tables in MySQL `iicet_ims` are 100% up to date!');
}

module.exports = {
  setSqliteDb,
  queueTableSync,
  syncTableToMysql,
  syncAllTablesNow,
  ALL_SYNC_TABLES
};
