const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');

// Helper to get intern id from user id
function getInternId(userId) {
  const row = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// GET /api/fees - List all fees ledgers (HR/Director only, Intern gets their own)
router.get('/', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT f.*, i.technology, i.joining_date, u.name as intern_name, u.email as intern_email,
             mu.name as mentor_name
      FROM fees f
      JOIN interns i ON f.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      LEFT JOIN users mu ON (i.mentor_id = mu.id OR i.mentor_id IN (SELECT user_id FROM mentors WHERE id = i.mentor_id))
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'Intern') {
      const internId = getInternId(req.user.id);
      if (!internId) return res.status(404).json({ error: 'Intern profile not found.' });
      query += ` AND f.intern_id = ?`;
      params.push(internId);
    } else {
      if (req.query.intern_id) {
        query += ` AND f.intern_id = ?`;
        params.push(parseInt(req.query.intern_id));
      }
      if (req.query.mentor_id || req.query.trainer_id) {
        const mId = parseInt(req.query.mentor_id || req.query.trainer_id);
        query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
        params.push(mId, mId);
      }
      if (req.query.status) {
        query += ` AND f.status = ?`;
        params.push(req.query.status);
      }
    }

    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch fees error:', error);
    res.status(500).json({ error: 'Server error fetching fees ledgers.' });
  }
});

// GET /api/fees/payments - List payments history
router.get('/payments', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT p.*, f.intern_id, u.name as intern_name, f.total_amount, i.technology, f.remaining_amount
      FROM payments p
      JOIN fees f ON p.fee_id = f.id
      JOIN interns i ON f.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'Intern') {
      const internId = getInternId(req.user.id);
      query += ` AND f.intern_id = ?`;
      params.push(internId);
    } else {
      if (req.query.intern_id) {
        query += ` AND f.intern_id = ?`;
        params.push(parseInt(req.query.intern_id));
      }
    }

    query += ` ORDER BY p.payment_date DESC, p.id DESC`;
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch payments error:', error);
    res.status(500).json({ error: 'Server error fetching payment history.' });
  }
});

// POST /api/fees/:intern_id/payments - Record a payment (HR / Director / Intern self)
router.post('/:intern_id/payments', authenticateToken, requireRole(['HR', 'Director', 'Intern']), (req, res) => {
  const internId = parseInt(req.params.intern_id);
  
  if (req.user.role === 'Intern') {
    const loggedInInternId = getInternId(req.user.id);
    if (loggedInInternId !== internId) {
      return res.status(403).json({ error: 'Access forbidden. You can only record payments for yourself.' });
    }
  }
  const { amount_paid, payment_mode, comments } = req.body;

  if (!amount_paid || !payment_mode) {
    return res.status(400).json({ error: 'amount_paid and payment_mode are required.' });
  }

  const amt = parseFloat(amount_paid);
  if (isNaN(amt) || amt <= 0) {
    return res.status(400).json({ error: 'Invalid payment amount.' });
  }

  try {
    const fee = db.prepare('SELECT * FROM fees WHERE intern_id = ?').get(internId);
    if (!fee) {
      return res.status(404).json({ error: 'Fee structure not found for this intern.' });
    }

    if (fee.remaining_amount <= 0) {
      return res.status(400).json({ error: 'Fee is already fully paid.' });
    }

    if (amt > fee.remaining_amount) {
      return res.status(400).json({ error: `Amount exceeds the outstanding balance of ${fee.remaining_amount}` });
    }

    db.exec('BEGIN TRANSACTION');

    // Fetch intern details (user_id and joining_date)
    const intern = db.prepare('SELECT user_id, joining_date FROM interns WHERE id = ?').get(internId);
    if (!intern) {
      db.exec('ROLLBACK');
      return res.status(404).json({ error: 'Intern profile not found.' });
    }

    // Count existing payments to determine installment label
    const paymentCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE fee_id = ?').get(fee.id).count;
    const currentInstNum = paymentCount + 1;

    // Calculate next installment due date
    // Policy: Within 3 months from joining date, max 3 installments
    const joiningDate = new Date(intern.joining_date);
    const threeMonthsLimit = new Date(joiningDate);
    threeMonthsLimit.setMonth(threeMonthsLimit.getMonth() + 3);

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30); // 30 days from now

    let finalNextDueDate = nextDueDate;
    if (nextDueDate > threeMonthsLimit) {
      finalNextDueDate = threeMonthsLimit;
    }
    const nextDueDateStr = finalNextDueDate.toISOString().split('T')[0];

    // Calculate new amounts
    const newPaidAmount = fee.paid_amount + amt;
    const newRemainingAmount = fee.total_amount - newPaidAmount;
    
    let status = 'Partially Paid';
    if (newRemainingAmount <= 0) {
      status = 'Fully Paid';
    }

    // Update Fee Ledger (including the new due date if partially paid)
    db.prepare(`
      UPDATE fees
      SET paid_amount = ?, remaining_amount = ?, status = ?, due_date = ?
      WHERE id = ?
    `).run(newPaidAmount, newRemainingAmount, status, newRemainingAmount > 0 ? nextDueDateStr : null, fee.id);

    // Generate custom receipt number: RC-TIMESTAMP-RANDOM
    const receiptNumber = `RC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date().toISOString().split('T')[0];
    const instComment = comments ? `${comments} (Inst ${currentInstNum})` : `Installment ${currentInstNum}`;

    // Create Payment Entry
    db.prepare(`
      INSERT INTO payments (fee_id, amount_paid, payment_date, payment_mode, receipt_number, comments)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(fee.id, amt, today, payment_mode, receiptNumber, instComment);

    // Notify intern with installment details and due date of next installment
    let notifyMessage = `A payment of ₹${amt} has been recorded for Installment ${currentInstNum} (Receipt: ${receiptNumber}). `;
    if (newRemainingAmount > 0) {
      notifyMessage += `Your next installment is due on ${finalNextDueDate.getDate().toString().padStart(2, '0')}-${(finalNextDueDate.getMonth() + 1).toString().padStart(2, '0')}-${finalNextDueDate.getFullYear()} (Outstanding balance: ₹${newRemainingAmount}).`;
    } else {
      notifyMessage += `Your fees have been fully paid and cleared. Thank you!`;
    }

    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Fee Payment Confirmed', ?)
    `).run(intern.user_id, notifyMessage);

    db.exec('COMMIT');

    res.json({ 
      message: 'Payment recorded successfully.', 
      receiptNumber, 
      remaining: newRemainingAmount,
      nextDueDate: newRemainingAmount > 0 ? nextDueDateStr : null 
    });
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Record payment error:', error);
    res.status(500).json({ error: 'Server error recording payment.' });
  }
});

// POST /api/fees/reminder/:id - Send fee reminder notification to an intern (HR / Director only)
router.post('/reminder/:id', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { id } = req.params;

  try {
    const fee = db.prepare(`
      SELECT f.*, i.user_id, u.name as intern_name
      FROM fees f
      JOIN interns i ON f.intern_id = i.id
      JOIN users u ON i.user_id = u.id
      WHERE f.id = ?
    `).get(parseInt(id));

    if (!fee) {
      return res.status(404).json({ error: 'Fee ledger record not found.' });
    }

    if (fee.remaining_amount <= 0) {
      return res.status(400).json({ error: 'This intern has already cleared all their fees.' });
    }

    const dueDateStr = fee.due_date ? fee.due_date : '3 months from joining';
    const message = `Dear ${fee.intern_name}, this is a reminder from the HR department of nooral.ai to clear your pending fee installment of ₹${fee.remaining_amount} which is due on ${dueDateStr}. Please process the payment at your earliest convenience to avoid any disruption to your training slot.`;

    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Fee Installment Reminder Alert', ?)
    `).run(fee.user_id, message);

    res.json({ message: `Fee reminder notification sent successfully to ${fee.intern_name}.` });
  } catch (error) {
    console.error('Send fee reminder error:', error);
    res.status(500).json({ error: 'Server error sending fee reminder.' });
  }
});

module.exports = router;
