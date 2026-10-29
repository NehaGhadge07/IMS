require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./app/db/connection');
const seedDatabase = require('../scripts/seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists and serve it statically
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Route Imports
const authRoutes = require('./app/api/auth');
const internRoutes = require('./app/api/interns');
const attendanceRoutes = require('./app/api/attendance');
const trainingRoutes = require('./app/api/trainings');
const taskRoutes = require('./app/api/tasks');
const dailyLogsRoutes = require('./app/api/daily-logs');
const feeRoutes = require('./app/api/fees');
const documentRoutes = require('./app/api/documents');
const notificationRoutes = require('./app/api/notifications');
const dashboardRoutes = require('./app/api/dashboard');
const reportsRoutes = require('./app/api/reports');
const companyRoutes = require('./app/api/company');
const enquiriesRoutes = require('./app/api/enquiries');
const leaveRequestRoutes = require('./app/api/leave-requests');
const helpdeskRoutes = require('./app/api/helpdesk');
const dbViewRoutes = require('./app/api/db-view');

// API Mountings
require('./app/core/cron'); // Initialize background jobs
app.use('/api/auth', authRoutes);
app.use('/api/interns', internRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/daily-logs', dailyLogsRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/enquiries', enquiriesRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/ai', require('./app/api/ai'));
app.use('/api/db-view', dbViewRoutes);
app.get('/db-viewer', (req, res) => res.redirect('/api/db-view/ui'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Auto-seed database if empty
try {
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (!userCountRow || userCountRow.count === 0) {
    console.log('No users found in database. Auto-seeding initial data...');
    seedDatabase();
  }
} catch (err) {
  console.error('Failed to run database check/auto-seed:', err);
}


// ----------------------------------------------------
// CRON JOBS
// ----------------------------------------------------
// Setup basic interval instead of importing node-cron to avoid missing dependencies
// 6:00 PM auto check-out script
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 18 && now.getMinutes() === 0) {
    console.log('Running 6:00 PM Auto Checkout...');
    const today = now.toISOString().split('T')[0];
    const checkOutTime = '18:00:00';
    try {
      const db = require('./app/db/connection');
      const pending = db.prepare('SELECT * FROM attendance WHERE date = ? AND check_out_time IS NULL').all(today);
      for (const att of pending) {
        if (!att.check_in_time) continue;
        const ciParts = att.check_in_time.split(':');
        const coParts = checkOutTime.split(':');
        const ciDate = new Date(2000, 0, 1, parseInt(ciParts[0]), parseInt(ciParts[1]), parseInt(ciParts[2]));
        const coDate = new Date(2000, 0, 1, parseInt(coParts[0]), parseInt(coParts[1]), parseInt(coParts[2]));
        
        let diffMs = coDate - ciDate;
        if (diffMs < 0) diffMs = 0;
        const workingHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        
        let status = att.status;
        if (workingHours < 1.5) status = 'Half Day';
        
        db.prepare('UPDATE attendance SET check_out_time = ?, working_hours = ?, status = ? WHERE id = ?').run(checkOutTime, workingHours, status, att.id);
      }
    } catch (e) {
      console.error('Auto checkout error', e);
    }
  }
  
  // Also send fee reminder emails if it is 9 AM
  if (now.getHours() === 9 && now.getMinutes() === 0) {
    try {
      const db = require('./app/db/connection');
      // get fees due in 2 days
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 2);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      const dueFees = db.prepare('SELECT f.*, u.email, u.name FROM fees f JOIN interns i ON f.intern_id = i.id JOIN users u ON i.user_id = u.id WHERE f.due_date = ? AND f.status != "Fully Paid"').all(targetDateStr);
      
      // send email via SMTP
      const { sendEmail } = require('./app/core/email');
      
      dueFees.forEach(fee => {
        sendEmail({
          to: fee.email,
          subject: 'IICET IMS - Fee Installment Reminder Notice',
          text: `Dear ${fee.name}, your fee installment of Rs. ${fee.remaining_amount} is due on ${fee.due_date}. Please clear your dues with HR.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #fed7aa; border-radius: 8px;">
              <h3 style="color: #ea580c; margin-top: 0;">Fee Installment Due Notice</h3>
              <p>Dear <strong>${fee.name}</strong>,</p>
              <p>Your fee installment of <strong>₹${fee.remaining_amount}</strong> is due on <strong>${fee.due_date}</strong>.</p>
              <p style="font-size: 12px; color: #64748b;">IICET Services Private Limited</p>
            </div>
          `
        }).catch(err => console.error(err));
      });
    } catch (e) {
      console.error('Fee reminder error', e);
    }
  }

  // Check tasks due tomorrow (1 day before due date)
  if (now.getMinutes() === 0) {
    try {
      if (taskRoutes && typeof taskRoutes.checkTaskDueNotifications === 'function') {
        taskRoutes.checkTaskDueNotifications();
      }
    } catch (e) {
      console.error('Task due notification check error:', e);
    }
  }
}, 60000); // check every minute

// Start Server
app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
  // Perform complete real-time sync with MySQL `iicet_ims` on boot
  const { syncAllTablesNow } = require('./app/db/mysql-sync');
  syncAllTablesNow().catch(err => {
    console.warn('[MySQL Sync Warning] Failed to initialize startup sync:', err.message);
  });
});
