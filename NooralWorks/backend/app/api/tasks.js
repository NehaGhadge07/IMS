const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');
const { sendTaskAssignedEmail } = require('../core/email');

// Helper to get intern id from user id
function getInternId(userId) {
  const row = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// Helper to check tasks due tomorrow (1 day before due date) and dispatch notifications
function checkTaskDueNotifications() {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Find active tasks (Pending or In Progress) whose due_date is tomorrow (1 day before due date)
    const upcomingTasks = db.prepare(`
      SELECT t.*, 
             COALESCE(t.assigned_mentor_id, i.user_id) as target_user_id,
             COALESCE(um.name, ui.name) as assignee_name,
             COALESCE(um.role, 'Intern') as assignee_role,
             ua.name as assigner_name
      FROM tasks t
      LEFT JOIN interns i ON t.assigned_to = i.id
      LEFT JOIN users ui ON i.user_id = ui.id
      LEFT JOIN users um ON t.assigned_mentor_id = um.id
      LEFT JOIN users ua ON t.assigned_by = ua.id
      WHERE t.due_date = ? AND t.status IN ('Pending', 'In Progress')
    `).all(tomorrowStr);

    for (const task of upcomingTasks) {
      // 1. Notify Assignee (HR, Trainer, or Intern)
      if (task.target_user_id) {
        const existingAssigneeNotif = db.prepare(`
          SELECT id FROM notifications 
          WHERE user_id = ? 
            AND title = 'Task Due Tomorrow'
            AND message LIKE ?
        `).get(task.target_user_id, `%task "${task.title}"%`);

        if (!existingAssigneeNotif) {
          db.prepare(`
            INSERT INTO notifications (user_id, title, message)
            VALUES (?, 'Task Due Tomorrow', ?)
          `).run(
            task.target_user_id,
            `Reminder: Your task "${task.title}" is due tomorrow (${task.due_date}). Please complete and submit your work on time.`
          );
          console.log(`[NOTIFICATION] Sent 1-day due reminder for task "${task.title}" to assignee user ${task.target_user_id}`);
        }
      }

      // 2. Also notify Assigner (e.g. Director)
      if (task.assigned_by && task.assigned_by !== task.target_user_id) {
        const existingAssignerNotif = db.prepare(`
          SELECT id FROM notifications 
          WHERE user_id = ? 
            AND title = 'Task Due Tomorrow (Assigned)'
            AND message LIKE ?
        `).get(task.assigned_by, `%task "${task.title}"%`);

        if (!existingAssignerNotif) {
          db.prepare(`
            INSERT INTO notifications (user_id, title, message)
            VALUES (?, 'Task Due Tomorrow (Assigned)', ?)
          `).run(
            task.assigned_by,
            `Notice: Task "${task.title}" assigned to ${task.assignee_name || 'team member'} (${task.assignee_role}) is due tomorrow (${task.due_date}).`
          );
          console.log(`[NOTIFICATION] Sent 1-day due alert for task "${task.title}" to assigner user ${task.assigned_by}`);
        }
      }
    }
  } catch (err) {
    console.error('Error running checkTaskDueNotifications:', err);
  }
}

// GET /api/tasks - List tasks
router.get('/', authenticateToken, (req, res) => {
  try {
    // Check 1-day due notifications automatically
    checkTaskDueNotifications();

    let query = `
      SELECT t.*, i.batch, i.technology, ui.name as intern_name,
             um.name as mentor_name, um.email as mentor_email, um.role as mentor_role,
             mt.technology as mentor_tech, ua.name as assigner_name
      FROM tasks t
      LEFT JOIN interns i ON t.assigned_to = i.id
      LEFT JOIN users ui ON i.user_id = ui.id
      LEFT JOIN users um ON t.assigned_mentor_id = um.id
      LEFT JOIN mentors mt ON t.assigned_mentor_id = mt.user_id
      LEFT JOIN users ua ON t.assigned_by = ua.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'Intern') {
      const internId = getInternId(req.user.id);
      if (!internId) return res.status(404).json({ error: 'Intern profile not found.' });
      query += ` AND t.assigned_to = ?`;
      params.push(internId);
    } else {
      if (req.query.intern_id) {
        query += ` AND t.assigned_to = ?`;
        params.push(parseInt(req.query.intern_id));
      }
      if (req.query.mentor_id) {
        query += ` AND t.assigned_mentor_id = ?`;
        params.push(parseInt(req.query.mentor_id));
      }
      if (req.user.role === 'Mentor') {
        query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?) OR t.assigned_by = ? OR t.assigned_mentor_id = ?)`;
        params.push(req.user.id, req.user.id, req.user.id, req.user.id);
      }
    }

    if (req.query.status) {
      query += ` AND t.status = ?`;
      params.push(req.query.status);
    }

    query += ` ORDER BY t.due_date ASC`;
    const tasks = db.prepare(query).all(...params);

    // Attach last task update/submission
    const tasksWithUpdates = tasks.map(task => {
      const updates = db.prepare(`
        SELECT tu.*, u.name as reviewer_name 
        FROM task_updates tu
        LEFT JOIN users u ON tu.reviewed_by = u.id
        WHERE tu.task_id = ?
        ORDER BY tu.submission_date DESC
      `).all(task.id);
      return { ...task, updates };
    });

    res.json(tasksWithUpdates);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    res.status(500).json({ error: 'Server error fetching tasks.' });
  }
});

// POST /api/tasks - Create/Assign task (HR / Mentor / Director only)
router.post('/', authenticateToken, requireRole(['HR', 'Mentor', 'Director']), (req, res) => {
  const { title, description, assigned_to, assigned_mentor_id, due_date, priority } = req.body;

  // Director can assign tasks ONLY to HR and Trainers (Mentors), NOT for interns.
  if (req.user.role === 'Director') {
    if (assigned_to) {
      return res.status(400).json({ error: 'Director can only assign tasks to HR and Trainers, not to interns.' });
    }
    if (!assigned_mentor_id) {
      return res.status(400).json({ error: 'Please select an HR or Trainer assignee.' });
    }
  }

  // Mentor/Trainer can only assign tasks to their assigned interns
  if (req.user.role === 'Mentor') {
    if (!assigned_to) {
      return res.status(400).json({ error: 'Please select an intern to assign the task.' });
    }
    const internCheck = db.prepare('SELECT id, mentor_id FROM interns WHERE id = ?').get(parseInt(assigned_to));
    if (!internCheck) {
      return res.status(404).json({ error: 'Intern not found.' });
    }
    const isAssigned = (internCheck.mentor_id === req.user.id) || !!db.prepare('SELECT id FROM mentors WHERE id = ? AND user_id = ?').get(internCheck.mentor_id, req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ error: 'You can only assign tasks to your own assigned interns.' });
    }
  }

  if (!title || (!assigned_to && !assigned_mentor_id) || !due_date) {
    return res.status(400).json({ error: 'Title, due_date, and either assigned_to or assigned_mentor_id are required.' });
  }

  try {
    let notifyUserId = null;
    
    if (assigned_to) {
      const intern = db.prepare('SELECT i.id, i.user_id, u.name FROM interns i JOIN users u ON i.user_id = u.id WHERE i.id = ?').get(parseInt(assigned_to));
      if (!intern) {
        return res.status(404).json({ error: 'Intern profile not found.' });
      }
      notifyUserId = intern.user_id;
    } else {
      const staffMember = db.prepare("SELECT id, name, role FROM users WHERE id = ? AND role IN ('Mentor', 'HR')").get(parseInt(assigned_mentor_id));
      if (!staffMember) {
        return res.status(404).json({ error: 'Assignee not found or invalid role. Must be HR or Trainer.' });
      }
      notifyUserId = staffMember.id;
    }

    const result = db.prepare(`
      INSERT INTO tasks (title, description, assigned_to, assigned_mentor_id, assigned_by, priority, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
    `).run(
      title,
      description || null,
      assigned_to ? parseInt(assigned_to) : null,
      assigned_mentor_id ? parseInt(assigned_mentor_id) : null,
      req.user.id,
      priority || 'Medium',
      due_date
    );

    // Notify assignee of newly assigned task
    const assignerRoleName = req.user.role === 'Mentor' ? 'Trainer' : req.user.role;
    const notifTitle = `New Task Assigned: ${title}`;
    const notifMessage = `${req.user.name} (${assignerRoleName}) has assigned you a new task: "${title}". Due date: ${due_date}. Priority: ${priority || 'Medium'}.`;

    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `).run(notifyUserId, notifTitle, notifMessage);

    // Send Real-time Email Notification to Assignee
    try {
      const recipientUser = db.prepare('SELECT name, email FROM users WHERE id = ?').get(notifyUserId);
      if (recipientUser && recipientUser.email) {
        sendTaskAssignedEmail({
          to: recipientUser.email,
          name: recipientUser.name,
          taskTitle: title,
          description: description,
          priority: priority || 'Medium',
          dueDate: due_date,
          assignedByName: `${req.user.name} (${assignerRoleName})`
        }).catch(e => console.error('Task assign email error:', e));
      }
    } catch (e) {
      console.error('Task assign email prep error:', e);
    }

    // Check if task is due tomorrow immediately
    checkTaskDueNotifications();

    res.status(201).json({ message: 'Task assigned successfully.', taskId: result.lastInsertRowid });
  } catch (error) {
    console.error('Assign task error:', error);
    res.status(500).json({ error: 'Server error assigning task.' });
  }
});

// PUT /api/tasks/:id/status - Update task status (Pending, In Progress, Completed)
router.put('/:id/status', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Pending', 'In Progress', 'Completed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const internId = getInternId(req.user.id);
    const task = db.prepare(`
      SELECT t.*, i.mentor_id as intern_mentor_id, ui.name as intern_name
      FROM tasks t
      LEFT JOIN interns i ON t.assigned_to = i.id
      LEFT JOIN users ui ON i.user_id = ui.id
      WHERE t.id = ?
    `).get(parseInt(id));

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user.role === 'Intern') {
      if (task.assigned_to !== internId) {
        return res.status(403).json({ error: 'You are not assigned to this task.' });
      }
    } else {
      // Mentor, HR, or Director
      const isMentorForIntern = req.user.role === 'Mentor' && (task.intern_mentor_id === req.user.id || task.assigned_by === req.user.id);
      if (task.assigned_mentor_id !== req.user.id && req.user.role !== 'Director' && req.user.role !== 'HR' && !isMentorForIntern) {
        return res.status(403).json({ error: 'You are not authorized to update this task.' });
      }
    }

    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, task.id);

    // If intern marked task as Completed, immediately notify Trainer / Assigner
    if (req.user.role === 'Intern' && status === 'Completed') {
      const notifyUserIds = new Set();
      if (task.assigned_by) notifyUserIds.add(task.assigned_by);
      if (task.intern_mentor_id) {
        const mentorUser = db.prepare('SELECT user_id FROM mentors WHERE id = ?').get(task.intern_mentor_id);
        if (mentorUser) notifyUserIds.add(mentorUser.user_id);
        else notifyUserIds.add(task.intern_mentor_id);
      }

      const notifTitle = `Task Completed: ${task.title}`;
      const notifMsg = `Intern ${req.user.name} has completed the task: "${task.title}".`;

      for (const targetUid of notifyUserIds) {
        db.prepare(`
          INSERT INTO notifications (user_id, title, message)
          VALUES (?, ?, ?)
        `).run(targetUid, notifTitle, notifMsg);
      }
    }

    res.json({ message: `Task status updated to ${status}.` });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error updating task status.' });
  }
});

// POST /api/tasks/:id/submit - Submit task (Intern/Mentor/HR assignees)
router.post('/:id/submit', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { update_description, submission_link, mark_completed } = req.body;

  if (!update_description) {
    return res.status(400).json({ error: 'Submission/update description is required.' });
  }

  try {
    const internId = getInternId(req.user.id);
    const task = db.prepare(`
      SELECT t.*, i.mentor_id as intern_mentor_id
      FROM tasks t
      LEFT JOIN interns i ON t.assigned_to = i.id
      WHERE t.id = ?
    `).get(parseInt(id));

    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (req.user.role === 'Intern') {
      if (task.assigned_to !== internId) {
        return res.status(403).json({ error: 'You are not assigned to this task.' });
      }
    } else {
      // Mentor or HR
      if (task.assigned_mentor_id !== req.user.id) {
        return res.status(403).json({ error: 'You are not assigned to this task.' });
      }
    }

    db.exec('BEGIN TRANSACTION');

    const nextStatus = mark_completed ? 'Completed' : 'Review';

    // 1. Create a task update entry
    db.prepare(`
      INSERT INTO task_updates (task_id, update_description, submission_link, status)
      VALUES (?, ?, ?, ?)
    `).run(task.id, update_description, submission_link || null, mark_completed ? 'Approved' : 'Pending');

    // 2. Set task status
    db.prepare("UPDATE tasks SET status = ? WHERE id = ?").run(nextStatus, task.id);

    // 3. Notify assigner and assigned trainer/mentor
    const notifyUserIds = new Set();
    if (task.assigned_by) notifyUserIds.add(task.assigned_by);
    if (task.intern_mentor_id) {
      const mentorUser = db.prepare('SELECT user_id FROM mentors WHERE id = ?').get(task.intern_mentor_id);
      if (mentorUser) notifyUserIds.add(mentorUser.user_id);
      else notifyUserIds.add(task.intern_mentor_id);
    }

    const titlePrefix = mark_completed ? 'Task Completed by Intern' : 'Task Submitted for Review';
    const notifMsg = mark_completed 
      ? `Intern ${req.user.name} has completed task "${task.title}". Link: ${submission_link || 'None'}.`
      : `Intern ${req.user.name} submitted task "${task.title}" for review. Link: ${submission_link || 'None'}.`;

    for (const targetUid of notifyUserIds) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, ?, ?)
      `).run(targetUid, titlePrefix, notifMsg);
    }

    db.exec('COMMIT');
    res.json({ message: mark_completed ? 'Task marked as completed successfully.' : 'Task submitted for review successfully.' });
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Submit task error:', error);
    res.status(500).json({ error: 'Server error submitting task.' });
  }
});

// POST /api/tasks/:id/review - Approve/Reject task submission (HR / Mentor / Director only)
router.post('/:id/review', authenticateToken, requireRole(['HR', 'Mentor', 'Director']), (req, res) => {
  const { id } = req.params;
  const { decision, feedback } = req.body; // decision: Approved or Rejected

  if (!decision || !['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be Approved or Rejected.' });
  }

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(parseInt(id));
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    // Find the latest pending task update
    const lastUpdate = db.prepare(`
      SELECT * FROM task_updates 
      WHERE task_id = ? AND status = 'Pending' 
      ORDER BY submission_date DESC
    `).get(task.id);

    db.exec('BEGIN TRANSACTION');

    const statusVal = decision === 'Approved' ? 'Approved' : 'Rejected';
    
    // Update the task update review state if exists
    if (lastUpdate) {
      db.prepare(`
        UPDATE task_updates
        SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(statusVal, feedback || null, req.user.id, lastUpdate.id);
    }

    // Update main task status
    const taskNewStatus = decision === 'Approved' ? 'Completed' : 'In Progress';
    db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(taskNewStatus, task.id);

    // Notify assignee (Intern or Mentor/HR)
    let targetNotifyUserId = null;
    if (task.assigned_to) {
      const intern = db.prepare('SELECT user_id FROM interns WHERE id = ?').get(task.assigned_to);
      if (intern) targetNotifyUserId = intern.user_id;
    } else if (task.assigned_mentor_id) {
      targetNotifyUserId = task.assigned_mentor_id;
    }

    if (targetNotifyUserId) {
      const reviewerRoleName = req.user.role === 'Mentor' ? 'Trainer' : req.user.role;
      db.prepare(`
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, 'Task Reviewed', '${req.user.name} (${reviewerRoleName}) reviewed your task "${task.title}". Result: ${decision}. Feedback: ${feedback || 'None'}.')
      `).run(targetNotifyUserId);
    }

    db.exec('COMMIT');
    res.json({ message: `Task review completed. Decision: ${decision}` });
  } catch (error) {
    db.exec('ROLLBACK');
    console.error('Review task error:', error);
    res.status(500).json({ error: 'Server error reviewing task.' });
  }
});

router.checkTaskDueNotifications = checkTaskDueNotifications;
module.exports = router;
module.exports.checkTaskDueNotifications = checkTaskDueNotifications;
