const nodemailer = require('nodemailer');

/**
 * Creates and returns a Nodemailer transporter configured with Gmail SMTP.
 * Strips whitespace from App Passwords if pasted with spaces (e.g., 'xxxx xxxx xxxx xxxx').
 */
function getTransporter() {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '').trim() : '';

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,          // Port 587 (STARTTLS) — works on Render free tier (port 465 SSL is blocked)
    secure: false,      // false = STARTTLS (upgraded after connection)
    requireTLS: true,   // Force TLS upgrade — prevents plain-text fallback
    auth: {
      user: user,
      pass: pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });
}

/**
 * Base email dispatch function
 */
async function sendEmail({ to, subject, text, html, attachments }) {
  const transporter = getTransporter();
  const senderEmail = process.env.EMAIL_USER || 'no-reply@iicet.com';

  if (!transporter) {
    const warnMsg = `[SMTP WARNING] EMAIL_USER or EMAIL_PASS not configured in backend/.env. Simulated email to: ${to} (Subject: ${subject})`;
    console.warn(warnMsg);
    return { success: false, error: 'SMTP credentials not configured in backend/.env', simulated: true };
  }

  const mailOptions = {
    from: `"IICET Services Private Limited" <${senderEmail}>`,
    to: to,
    subject: subject,
    text: text || '',
    html: html || `<p>${text || ''}</p>`,
    attachments: attachments || []
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[SMTP SUCCESS] Email delivered to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, response: info.response };
  } catch (err) {
    console.error(`[SMTP ERROR] Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Verifies if current SMTP settings can connect to Gmail server
 */
async function verifySMTP() {
  const transporter = getTransporter();
  if (!transporter) {
    return { 
      configured: false, 
      message: 'EMAIL_USER or EMAIL_PASS is empty in backend/.env' 
    };
  }

  try {
    await transporter.verify();
    return { 
      configured: true, 
      verified: true, 
      message: 'SMTP credentials verified successfully! Connected to smtp.gmail.com.' 
    };
  } catch (err) {
    return { 
      configured: true, 
      verified: false, 
      message: `SMTP connection error: ${err.message}` 
    };
  }
}

/**
 * 1. Send OTP Verification Email
 */
async function sendOTPEmail(to, code, isRegister = false, role = '') {
  const subject = isRegister 
    ? 'IICET IMS - Welcome & Registration Verification Code'
    : 'IICET IMS - Your Login Verification Code';

  const text = isRegister
    ? `Welcome to IICET Services!\n\nYou are registering for the role: ${role || 'Intern'}.\n\nYour 6-digit verification code is: ${code}\n\nThis code expires in 3 minutes.`
    : `Your IICET IMS verification code is: ${code}\n\nThis code expires in 3 minutes.`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 24px 30px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">IICET SERVICES</h1>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px;">Intern Management System</p>
      </div>
      <div style="padding: 30px 32px; color: #334155;">
        <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">${isRegister ? 'Welcome to IICET IMS!' : 'One-Time Verification Code'}</h2>
        <p style="margin: 0 0 18px; font-size: 14px; line-height: 1.5; color: #475569;">
          ${isRegister ? `You are completing your registration for the role: <strong>${role || 'Intern'}</strong>.` : 'Use the following one-time password (OTP) to securely sign in to your dashboard:'}
        </p>
        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
          <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1e40af;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">
          ⏱️ This code is valid for <strong>3 minutes</strong>. Do not share this code with anyone.
        </p>
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          If you did not request this verification code, please ignore this email.
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

function getBasePortalUrl() {
  return process.env.APP_URL || 'https://ims-ngfj.onrender.com';
}

/**
 * 2. Send Intern Welcome & Login Credentials Email
 */
async function sendInternWelcomeEmail({ to, name, email, password, technology, training_time, joining_date }) {
  const subject = `Welcome to IICET Services - Intern Portal Access & Credentials`;
  const portalUrl = `${getBasePortalUrl()}/login`;

  const text = `Dear ${name},\n\nWelcome to IICET Services Private Limited! Your intern account has been activated.\n\nDomain: ${technology || 'Software Development'}\nTraining Schedule: ${training_time || '09:00 AM - 01:00 PM'}\nJoining Date: ${joining_date || 'Immediate'}\n\nLogin Credentials:\nPortal: ${portalUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease sign in, complete your profile, and upload required onboarding documents.`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 26px 32px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800;">IICET SERVICES PRIVATE LIMITED</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.95;">Internship Onboarding & Welcome Letter</p>
      </div>
      <div style="padding: 30px 32px; color: #334155;">
        <p style="font-size: 15px; margin: 0 0 16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px;">
          Congratulations and welcome to <strong>IICET Services Private Limited</strong>! Your official intern profile has been established in our Intern Management System. Below are your assigned details and portal login credentials:
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; width: 38%;"><strong>Track / Technology:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${technology || 'Software Development'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Training Slot:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${training_time || '09:00 AM - 01:00 PM'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;"><strong>Joining Date:</strong></td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${joining_date || '-'}</td>
            </tr>
          </table>
        </div>

        <h3 style="font-size: 15px; color: #0f172a; margin: 0 0 12px;">🔑 Your Portal Access Credentials</h3>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px;">
          <div style="margin-bottom: 8px; font-size: 14px;">
            <span style="color: #64748b;">Username (Email):</span> <strong style="color: #1e40af;">${email}</strong>
          </div>
          <div style="font-size: 14px;">
            <span style="color: #64748b;">Initial Password:</span> <strong style="color: #1e40af; font-family: monospace; font-size: 15px;">${password}</strong>
          </div>
        </div>

        <div style="text-align: center; margin: 26px 0;">
          <a href="${portalUrl}" style="background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
            Sign In to Intern Portal →
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 20px 0 0;">
          Please log in promptly to mark attendance, review assigned tasks, submit daily logs, and upload required documents.
        </p>

        <div style="border-top: 1px solid #e2e8f0; margin-top: 28px; padding-top: 16px; font-size: 11px; color: #94a3b8; text-align: center;">
          IICET Services Private Limited • 1st Floor, HB Tower, Powai Naka, Satara, Maharashtra 415001<br/>
          Need assistance? Contact our HR team at enquiry@iicet.com
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * 3. Send Staff/Trainer Welcome Email
 */
async function sendStaffWelcomeEmail({ to, name, email, password, role, department, technology }) {
  const subject = `Welcome to IICET IMS - Staff Account Activated (${role || 'Trainer'})`;
  const portalUrl = `${getBasePortalUrl()}/login`;

  const text = `Dear ${name},\n\nYour staff account for IICET IMS has been created as: ${role}.\n\nLogin URL: ${portalUrl}\nEmail: ${email}\nPassword: ${password}\n\nPlease sign in to manage intern rosters, attendance, and training sessions.`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 24px 30px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 800;">IICET SERVICES PRIVATE LIMITED</h1>
        <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.9;">Staff Account Activation</p>
      </div>
      <div style="padding: 26px 30px; color: #334155;">
        <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0 0 18px;">
          Your staff credentials for the IICET Intern Management System are ready. You are registered as <strong>${role}</strong> (${department || 'Training'} - ${technology || 'General'}).
        </p>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
          <div>Username (Email): <strong>${email}</strong></div>
          <div style="margin-top: 6px;">Password: <strong style="font-family: monospace; font-size: 14px;">${password}</strong></div>
        </div>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" style="background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: bold; font-size: 13px; display: inline-block;">
            Open Staff Dashboard
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * 4. Send Fee Payment Receipt Email
 */
async function sendFeeReceiptEmail({ to, name, amountPaid, receiptNumber, remainingAmount, nextDueDate, paymentMode }) {
  const subject = `Fee Payment Receipt - ${receiptNumber} | IICET Services`;

  const text = `Dear ${name},\n\nWe have successfully received your fee payment of Rs. ${amountPaid}.\nReceipt No: ${receiptNumber}\nPayment Mode: ${paymentMode || 'Online'}\nRemaining Balance: Rs. ${remainingAmount}\n${nextDueDate ? `Next Due Date: ${nextDueDate}\n` : ''}\nThank you,\nIICET Services Private Limited`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #0f172a; padding: 22px 30px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 800;">IICET SERVICES PRIVATE LIMITED</h1>
        <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">Official Fee Payment Receipt</p>
      </div>
      <div style="padding: 26px 30px; color: #334155;">
        <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 18px;">
          Thank you for your payment. Your installment has been recorded into your student ledger.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Receipt Number:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${receiptNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Amount Paid:</td>
              <td style="padding: 6px 0; color: #16a34a; font-weight: 800; font-size: 16px;">₹${amountPaid}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Payment Mode:</td>
              <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">${paymentMode || 'Online'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Outstanding Balance:</td>
              <td style="padding: 6px 0; color: ${remainingAmount > 0 ? '#ea580c' : '#16a34a'}; font-weight: 700;">
                ₹${remainingAmount} ${remainingAmount === 0 ? '(Fully Paid)' : ''}
              </td>
            </tr>
            ${nextDueDate ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b;">Next Due Date:</td>
              <td style="padding: 6px 0; color: #dc2626; font-weight: 600;">${nextDueDate}</td>
            </tr>` : ''}
          </table>
        </div>

        <p style="font-size: 12px; color: #64748b; margin: 0;">
          This is an automated institutional receipt generated by IICET Services Private Limited.
        </p>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * 5. Send Task Assigned Notification Email
 */
async function sendTaskAssignedEmail({ to, name, taskTitle, description, priority, dueDate, assignedByName }) {
  const subject = `New Task Assigned: "${taskTitle}" (${priority || 'Medium'} Priority) | IICET IMS`;
  const portalUrl = `${getBasePortalUrl()}/tasks`;

  const text = `Dear ${name},\n\nA new task has been assigned to you by ${assignedByName || 'Management'}.\n\nTask: ${taskTitle}\nPriority: ${priority || 'Medium'}\nDue Date: ${dueDate || 'Not set'}\nDescription: ${description || 'No description provided.'}\n\nPlease check your tasks dashboard: ${portalUrl}`;

  const priorityColor = priority === 'High' ? '#dc2626' : (priority === 'Medium' ? '#d97706' : '#2563eb');

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 22px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 800;">IICET IMS • Tasks Management</h1>
        <p style="margin: 3px 0 0; font-size: 12px; opacity: 0.9;">New Assignment Notification</p>
      </div>
      <div style="padding: 26px 30px; color: #334155;">
        <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${name}</strong>,</p>
        <p style="font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 18px;">
          You have been assigned a new task by <strong>${assignedByName || 'Management'}</strong>.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px; font-size: 16px; color: #0f172a;">${taskTitle}</h3>
          <p style="margin: 0 0 14px; font-size: 13px; color: #64748b; line-height: 1.5;">${description || 'No additional instructions.'}</p>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 30%;"><strong>Priority:</strong></td>
              <td style="padding: 4px 0; color: ${priorityColor}; font-weight: 700;">${priority || 'Medium'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;"><strong>Due Date:</strong></td>
              <td style="padding: 4px 0; color: #0f172a; font-weight: 600;">${dueDate || 'Open'}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
            View Task in Dashboard →
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * 6. Send Leave Application Notification to Reviewers (HR / Director)
 */
async function sendLeaveApplicationAlertEmail({ to, reviewerName, applicantName, applicantRole, leaveType, startDate, endDate, reason }) {
  const subject = `Leave Request Alert: ${applicantName} (${leaveType}) | IICET IMS`;
  const portalUrl = `${getBasePortalUrl()}/attendance?tab=leave`;

  const text = `Dear ${reviewerName || 'Reviewer'},\n\n${applicantName} (${applicantRole || 'Intern'}) has submitted a leave request.\n\nLeave Type: ${leaveType}\nDuration: ${startDate} to ${endDate}\nReason: ${reason || 'Not specified'}\n\nPlease review and take action at: ${portalUrl}`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 22px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 800;">IICET IMS • Leave Approvals</h1>
        <p style="margin: 3px 0 0; font-size: 12px; opacity: 0.9;">Time-Off Request Notification</p>
      </div>
      <div style="padding: 26px 30px; color: #334155;">
        <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${reviewerName || 'Reviewer'}</strong>,</p>
        <p style="font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 18px;">
          <strong>${applicantName}</strong> (${applicantRole || 'Staff/Intern'}) has submitted a new leave application awaiting your administrative approval:
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 5px 0; color: #64748b; width: 35%;">Leave Type:</td>
              <td style="padding: 5px 0; color: #0f172a; font-weight: 700;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Duration:</td>
              <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${startDate} to ${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Reason:</td>
              <td style="padding: 5px 0; color: #475569;">${reason || 'No specific reason provided.'}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
            Review & Approve in Portal →
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * 7. Send Leave Decision Notification to Applicant
 */
async function sendLeaveDecisionEmail({ to, applicantName, leaveType, startDate, endDate, decision, reviewedByName, notes }) {
  const isApproved = decision === 'Approved';
  const subject = `Leave Request ${decision}: ${leaveType} (${startDate} to ${endDate}) | IICET IMS`;

  const text = `Dear ${applicantName},\n\nYour leave application for ${leaveType} from ${startDate} to ${endDate} has been ${decision} by ${reviewedByName || 'HR'}.${notes ? `\nReview Note: ${notes}` : ''}\n\nThank you,\nIICET Services Private Limited`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: ${isApproved ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)' : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'}; padding: 22px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 800;">IICET IMS • Leave Decision</h1>
        <p style="margin: 3px 0 0; font-size: 12px; opacity: 0.9;">Application Status Update</p>
      </div>
      <div style="padding: 26px 30px; color: #334155;">
        <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${applicantName}</strong>,</p>
        <p style="font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 18px;">
          Your leave application has been reviewed and marked as: <strong style="color: ${isApproved ? '#059669' : '#dc2626'};">${decision}</strong>.
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 5px 0; color: #64748b; width: 35%;">Leave Type:</td>
              <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${leaveType}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Period:</td>
              <td style="padding: 5px 0; color: #0f172a; font-weight: 600;">${startDate} to ${endDate}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Reviewed By:</td>
              <td style="padding: 5px 0; color: #0f172a;">${reviewedByName || 'HR Department'}</td>
            </tr>
            ${notes ? `
            <tr>
              <td style="padding: 5px 0; color: #64748b;">Note:</td>
              <td style="padding: 5px 0; color: #475569; font-style: italic;">"${notes}"</td>
            </tr>` : ''}
          </table>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * 8. Send Help Desk Ticket Notification Email
 */
async function sendHelpdeskTicketEmail({ to, recipientName, ticketId, subjectText, priority, category, senderName, messageText }) {
  const subject = `Support Ticket #${ticketId}: ${subjectText} [${priority || 'Normal'}] | IICET Help Desk`;
  const portalUrl = `${getBasePortalUrl()}/helpdesk`;

  const text = `Dear ${recipientName},\n\nA support ticket has been submitted by ${senderName}.\n\nTicket #${ticketId}: ${subjectText}\nCategory: ${category || 'General'}\nPriority: ${priority || 'Normal'}\nMessage: ${messageText}\n\nView and respond at: ${portalUrl}`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 22px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 800;">IICET IMS • Help Desk Alert</h1>
        <p style="margin: 3px 0 0; font-size: 12px; opacity: 0.9;">Ticket #${ticketId}</p>
      </div>
      <div style="padding: 26px 30px; color: #334155;">
        <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${recipientName}</strong>,</p>
        <p style="font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 18px;">
          <strong>${senderName}</strong> has logged a support query requiring your attention:
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="margin: 0 0 10px; font-size: 15px; color: #0f172a;">${subjectText}</h3>
          <p style="margin: 0 0 12px; font-size: 13px; color: #475569; line-height: 1.5;">${messageText}</p>
          <div style="font-size: 12px; color: #64748b;">
            Category: <strong>${category || 'General'}</strong> • Priority: <strong>${priority || 'Normal'}</strong>
          </div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" style="background: #d97706; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
            Open Ticket in Help Desk →
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

/**
 * 9. Send Help Desk Reply Notification
 */
async function sendHelpdeskReplyEmail({ to, recipientName, ticketId, subjectText, replyByName, replyText, status }) {
  const subject = `Update on Ticket #${ticketId}: ${subjectText} (${status || 'Updated'}) | IICET Help Desk`;
  const portalUrl = `${getBasePortalUrl()}/helpdesk`;

  const text = `Dear ${recipientName},\n\n${replyByName || 'Staff'} has updated your support ticket #${ticketId} ("${subjectText}").\n\nStatus: ${status || 'In Progress'}\nResponse: ${replyText}\n\nView details at: ${portalUrl}`;

  const html = `
    <div style="font-family: Arial, 'Segoe UI', Tahoma, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 22px 28px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 800;">IICET IMS • Help Desk Response</h1>
        <p style="margin: 3px 0 0; font-size: 12px; opacity: 0.9;">Ticket #${ticketId}</p>
      </div>
      <div style="padding: 26px 30px; color: #334155;">
        <p style="font-size: 14px; margin: 0 0 16px;">Dear <strong>${recipientName}</strong>,</p>
        <p style="font-size: 13px; line-height: 1.5; color: #475569; margin: 0 0 18px;">
          <strong>${replyByName || 'Staff'}</strong> has posted a response to your query:
        </p>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Ticket: <strong>#${ticketId} - ${subjectText}</strong></div>
          <div style="padding: 12px; background: #ffffff; border-radius: 6px; border-left: 3px solid #0284c7; margin: 10px 0; font-size: 13px; color: #1e293b;">
            ${replyText}
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
            Current Status: <strong style="color: #0284c7;">${status || 'Updated'}</strong>
          </div>
        </div>

        <div style="text-align: center; margin: 20px 0;">
          <a href="${portalUrl}" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
            View Full Discussion →
          </a>
        </div>
      </div>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

module.exports = {
  getTransporter,
  sendEmail,
  verifySMTP,
  sendOTPEmail,
  sendInternWelcomeEmail,
  sendStaffWelcomeEmail,
  sendFeeReceiptEmail,
  sendTaskAssignedEmail,
  sendLeaveApplicationAlertEmail,
  sendLeaveDecisionEmail,
  sendHelpdeskTicketEmail,
  sendHelpdeskReplyEmail
};
