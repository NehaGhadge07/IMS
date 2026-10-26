const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');

// GET /api/trainings - List training courses with sessions
router.get('/', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT t.*, u.name as mentor_name
      FROM trainings t
      LEFT JOIN users u ON t.mentor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by tech or department
    if (req.query.technology) {
      query += ` AND t.technology = ?`;
      params.push(req.query.technology);
    }
    if (req.query.department) {
      query += ` AND t.department = ?`;
      params.push(req.query.department);
    }

    const trainings = db.prepare(query).all(...params);

    // Fetch sessions for each training
    const trainingsWithSessions = trainings.map(t => {
      const sessions = db.prepare(`
        SELECT * FROM training_sessions 
        WHERE training_id = ? 
        ORDER BY date ASC, time ASC
      `).all(t.id);
      return { ...t, sessions };
    });

    res.json(trainingsWithSessions);
  } catch (error) {
    console.error('Fetch trainings error:', error);
    res.status(500).json({ error: 'Server error fetching trainings.' });
  }
});

// GET /api/trainings/sessions - List all upcoming sessions
router.get('/sessions', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT ts.*, t.title as training_title, t.technology, u.name as mentor_name
      FROM training_sessions ts
      JOIN trainings t ON ts.training_id = t.id
      LEFT JOIN users u ON t.mentor_id = u.id
      WHERE ts.date >= DATE('now')
    `;
    const params = [];

    if (req.user.role === 'Intern') {
      // Show only sessions matching the intern's department
      const intern = db.prepare('SELECT department FROM interns WHERE user_id = ?').get(req.user.id);
      if (intern) {
        query += ` AND t.department = ?`;
        params.push(intern.department);
      }
    }

    query += ` ORDER BY ts.date ASC, ts.time ASC`;
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch sessions error:', error);
    res.status(500).json({ error: 'Server error fetching sessions.' });
  }
});

// POST /api/trainings - Create training course (HR / Mentor only)
router.post('/', authenticateToken, requireRole(['HR', 'Mentor']), (req, res) => {
  const { title, description, department, technology, start_date, end_date, mentor_id } = req.body;

  if (!title || !department || !technology || !start_date) {
    return res.status(400).json({ error: 'Title, department, technology, and start_date are required.' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO trainings (title, description, department, technology, start_date, end_date, mentor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || null,
      department,
      technology,
      start_date,
      end_date || null,
      mentor_id ? parseInt(mentor_id) : req.user.id
    );

    res.status(201).json({ message: 'Training course created successfully.', trainingId: result.lastInsertRowid });
  } catch (error) {
    console.error('Create training error:', error);
    res.status(500).json({ error: 'Server error creating training course.' });
  }
});

// POST /api/trainings/schedule-session - Trainer sets training session for assigned interns
router.post('/schedule-session', authenticateToken, requireRole(['HR', 'Mentor', 'Director']), (req, res) => {
  const { topic, batch, date, time, duration, meeting_link, materials_link, description, training_id } = req.body;

  if (!topic || !date || !time) {
    return res.status(400).json({ error: 'Topic, date, and time are required.' });
  }

  try {
    let courseId = training_id ? parseInt(training_id) : null;

    // If no courseId specified, find or create one for this mentor
    if (!courseId) {
      const existingCourse = db.prepare('SELECT id FROM trainings WHERE mentor_id = ? ORDER BY id DESC LIMIT 1').get(req.user.id);
      if (existingCourse) {
        courseId = existingCourse.id;
      } else {
        const mentorInfo = db.prepare('SELECT department, designation FROM users WHERE id = ?').get(req.user.id);
        const dept = (mentorInfo && mentorInfo.department) ? mentorInfo.department : 'General';
        const tech = (mentorInfo && mentorInfo.designation) ? mentorInfo.designation : 'Full Stack';
        const newCourse = db.prepare(`
          INSERT INTO trainings (title, description, department, technology, start_date, mentor_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          `Mentorship & Technical Training`,
          `Live batch training sessions conducted by ${req.user.name || 'Trainer'}`,
          dept,
          tech,
          date,
          req.user.id
        );
        courseId = newCourse.lastInsertRowid;
      }
    }

    const dur = parseInt(duration) || 60;
    const targetBatch = batch && batch.trim() ? batch.trim() : 'All Assigned';
    const meetLink = meeting_link ? meeting_link.trim() : null;
    const matLink = materials_link ? materials_link.trim() : meetLink;
    const desc = description ? description.trim() : null;

    const result = db.prepare(`
      INSERT INTO training_sessions (training_id, trainer_id, topic, batch, date, time, duration, meeting_link, materials_link, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')
    `).run(
      courseId,
      req.user.id,
      topic.trim(),
      targetBatch,
      date,
      time,
      dur,
      meetLink,
      matLink,
      desc
    );

    const sessionId = result.lastInsertRowid;

    // Find all assigned interns of this trainer to notify them
    let internQuery = `
      SELECT u.id as user_id, u.name, i.batch 
      FROM interns i 
      JOIN users u ON i.user_id = u.id 
      WHERE (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))
    `;
    const queryParams = [req.user.id, req.user.id];
    if (targetBatch !== 'All Assigned') {
      internQuery += ` AND i.batch = ?`;
      queryParams.push(targetBatch);
    }

    const assignedInterns = db.prepare(internQuery).all(...queryParams);
    const trainerName = req.user.name || 'Trainer';

    // Dispatch notification to every assigned intern
    const notifStmt = db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'New Training Session Scheduled', ?)
    `);

    for (const intern of assignedInterns) {
      notifStmt.run(
        intern.user_id,
        `Trainer ${trainerName} has scheduled a training session on "${topic.trim()}" for ${date} at ${time}. (${targetBatch})`
      );
    }

    // Activity log
    try {
      db.prepare(`
        INSERT INTO activity_logs (user_id, action, timestamp, details)
        VALUES (?, 'Scheduled Training Session', ?, ?)
      `).run(req.user.id, new Date().toISOString(), `Scheduled session "${topic.trim()}" for ${targetBatch} on ${date} at ${time}`);
    } catch (e) {
      console.warn('Activity log error:', e.message);
    }

    const createdSession = db.prepare(`
      SELECT ts.*, t.title as course_title, u.name as mentor_name
      FROM training_sessions ts
      JOIN trainings t ON ts.training_id = t.id
      LEFT JOIN users u ON ts.trainer_id = u.id
      WHERE ts.id = ?
    `).get(sessionId);

    res.status(201).json({
      message: 'Training session scheduled successfully and notifications sent to assigned interns.',
      session: createdSession,
      notifiedCount: assignedInterns.length
    });
  } catch (error) {
    console.error('Schedule session error:', error);
    res.status(500).json({ error: 'Server error scheduling training session: ' + error.message });
  }
});

// GET /api/trainings/my-sessions - List sessions scheduled by the logged-in trainer
router.get('/my-sessions', authenticateToken, (req, res) => {
  try {
    const sessions = db.prepare(`
      SELECT ts.*, t.title as course_title,
             (SELECT COUNT(*) FROM interns i WHERE (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?)) AND (ts.batch = 'All Assigned' OR i.batch = ts.batch)) as attendee_count
      FROM training_sessions ts
      JOIN trainings t ON ts.training_id = t.id
      WHERE (ts.trainer_id = ? OR t.mentor_id = ?)
      ORDER BY ts.date ASC, ts.time ASC
    `).all(req.user.id, req.user.id, req.user.id, req.user.id);

    res.json(sessions);
  } catch (error) {
    console.error('Fetch my sessions error:', error);
    res.status(500).json({ error: 'Server error fetching your scheduled sessions.' });
  }
});

// DELETE /api/trainings/sessions/:id - Cancel/remove a scheduled session
router.delete('/sessions/:id', authenticateToken, requireRole(['HR', 'Mentor', 'Director']), (req, res) => {
  const { id } = req.params;
  try {
    const sess = db.prepare('SELECT ts.*, t.mentor_id FROM training_sessions ts JOIN trainings t ON ts.training_id = t.id WHERE ts.id = ?').get(parseInt(id));
    if (!sess) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    // Role check: mentors can only delete their own sessions
    if (req.user.role === 'Mentor' && sess.trainer_id !== req.user.id && sess.mentor_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only cancel your own scheduled sessions.' });
    }

    db.prepare('DELETE FROM training_sessions WHERE id = ?').run(parseInt(id));
    res.json({ message: 'Training session cancelled successfully.' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Server error cancelling session.' });
  }
});

// POST /api/trainings/:id/sessions - Add training session to course (HR / Mentor only)
router.post('/:id/sessions', authenticateToken, requireRole(['HR', 'Mentor']), (req, res) => {
  const { id } = req.params;
  const { topic, date, time, duration, materials_link } = req.body;

  if (!topic || !date || !time || !duration) {
    return res.status(400).json({ error: 'Topic, date, time, and duration (mins) are required.' });
  }

  try {
    const training = db.prepare('SELECT * FROM trainings WHERE id = ?').get(parseInt(id));
    if (!training) {
      return res.status(404).json({ error: 'Training course not found.' });
    }

    const targetBatch = req.body.batch || 'All Assigned';
    const meetLink = req.body.meeting_link || materials_link || null;
    const desc = req.body.description || null;

    const result = db.prepare(`
      INSERT INTO training_sessions (training_id, trainer_id, topic, batch, date, time, duration, meeting_link, materials_link, description, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')
    `).run(
      parseInt(id),
      req.user.id,
      topic.trim(),
      targetBatch,
      date,
      time,
      parseInt(duration),
      meetLink,
      materials_link || meetLink || null,
      desc
    );

    // Notify assigned interns of this trainer (or department interns)
    let assignedInterns = [];
    if (req.user.role === 'Mentor') {
      let internQuery = `
        SELECT u.id as user_id, u.name, i.batch 
        FROM interns i 
        JOIN users u ON i.user_id = u.id 
        WHERE (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))
      `;
      const queryParams = [req.user.id, req.user.id];
      if (targetBatch !== 'All Assigned') {
        internQuery += ` AND i.batch = ?`;
        queryParams.push(targetBatch);
      }
      assignedInterns = db.prepare(internQuery).all(...queryParams);
    } else {
      assignedInterns = db.prepare('SELECT user_id FROM interns WHERE department = ?').all(training.department);
    }

    const trainerName = req.user.name || 'Trainer';
    assignedInterns.forEach(intern => {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, 'New Training Session Scheduled', ?)
      `).run(intern.user_id, `Trainer ${trainerName} scheduled a session on "${topic}" for ${date} at ${time}. (${targetBatch})`);
    });

    res.status(201).json({ message: 'Session added successfully.', sessionId: result.lastInsertRowid });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Server error adding training session.' });
  }
});

module.exports = router;
