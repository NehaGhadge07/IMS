const express = require("express");
const router = express.Router();
const db = require("../db/connection");
const { authenticateToken } = require("../core/auth");

// Helper function to send notification safely
function sendNotification(userId, title, message) {
  try {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, is_read)
      VALUES (?, ?, ?, 0)
    `).run(userId, title, message);
  } catch (err) {
    console.warn("[Helpdesk] Notification error:", err.message);
  }
}

// Helper to log activity
function logHelpdeskActivity(userId, action, details) {
  try {
    db.prepare(`
      INSERT INTO activity_logs (user_id, action, timestamp, details)
      VALUES (?, ?, ?, ?)
    `).run(userId, action, new Date().toISOString(), details);
  } catch (err) {
    console.warn("[Helpdesk] Activity log error:", err.message);
  }
}

// GET /api/helpdesk/staff - List of respected persons (Trainers, HR, Director, Interns) for assignment
router.get("/staff", authenticateToken, (req, res) => {
  try {
    let internMentorId = null;
    if (req.user.role === 'Intern') {
      const internRow = db.prepare('SELECT mentor_id FROM interns WHERE user_id = ?').get(req.user.id);
      if (internRow) internMentorId = internRow.mentor_id;
    }

    const users = db.prepare(`
      SELECT u.id, u.name, u.role, u.email, u.profile_photo,
             i.technology as intern_tech, i.batch as intern_batch
      FROM users u
      LEFT JOIN interns i ON i.user_id = u.id
      WHERE u.status = 'Active'
      ORDER BY 
        CASE u.role 
          WHEN 'Director' THEN 1 
          WHEN 'HR' THEN 2 
          WHEN 'Mentor' THEN 3 
          ELSE 4 
        END, u.name ASC
    `).all();

    // If requester is an Intern, filter Mentors so only their assigned mentor is available
    let filteredUsers = users;
    if (req.user.role === 'Intern') {
      filteredUsers = users.filter(u => {
        if (u.role === 'Mentor') {
          return internMentorId && u.id === internMentorId;
        }
        return true;
      });
    }

    res.json(filteredUsers);
  } catch (e) {
    console.error("Fetch staff error:", e);
    res.status(500).json({ error: "Server error fetching staff members" });
  }
});

// GET /api/helpdesk - Fetch queries with filtering and role awareness
router.get("/", authenticateToken, (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    const { status, category, scope, search } = req.query;

    let query = `
      SELECT 
        hq.id, hq.user_id, hq.target_user_id, hq.target_role, hq.category, hq.priority,
        hq.subject, hq.query_text, hq.answer_text, hq.status, hq.solved_by,
        hq.created_at, hq.answered_at,
        u.name as requester_name, u.role as requester_role, u.email as requester_email, u.profile_photo as requester_photo,
        tu.name as target_name, tu.role as target_role_name, tu.email as target_email,
        su.name as solved_by_name, su.role as solved_by_role
      FROM helpdesk_queries hq
      JOIN users u ON hq.user_id = u.id
      LEFT JOIN users tu ON hq.target_user_id = tu.id
      LEFT JOIN users su ON hq.solved_by = su.id
      WHERE 1=1
    `;
    const params = [];

    // Role-based scoping / filter tabs
    if (userRole === "Intern") {
      // Interns strictly see ONLY their own queries, never queries of others
      query += " AND hq.user_id = ?";
      params.push(userId);
    } else if (scope === "mine") {
      // Queries raised by current user
      query += " AND hq.user_id = ?";
      params.push(userId);
    } else if (scope === "assigned") {
      if (userRole === "Mentor") {
        // Mentor sees queries assigned to them, or queries from their assigned interns
        query += " AND (hq.target_user_id = ? OR (hq.user_id IN (SELECT user_id FROM interns WHERE mentor_id = ?) AND (hq.target_role = 'Mentor' OR hq.target_role IS NULL OR hq.target_user_id IS NULL OR hq.target_user_id = ?)))";
        params.push(userId, userId, userId);
      } else {
        query += " AND (hq.target_user_id = ? OR (hq.target_user_id IS NULL AND hq.target_role = ?))";
        params.push(userId, userRole);
      }
    } else if (scope === "all") {
      if (userRole === "Mentor") {
        // Mentor sees only queries assigned to them, created by them, or created by their assigned interns
        query += " AND (hq.target_user_id = ? OR hq.user_id = ? OR hq.user_id IN (SELECT user_id FROM interns WHERE mentor_id = ?))";
        params.push(userId, userId, userId);
      }
      // Director and HR can see all queries across organization
    } else {
      // Default view based on role
      if (userRole === "Mentor") {
        // Mentors see queries assigned to them, created by them, or created by their assigned interns (e.g. Sushant Ghadge)
        query += " AND (hq.target_user_id = ? OR hq.user_id = ? OR hq.user_id IN (SELECT user_id FROM interns WHERE mentor_id = ?))";
        params.push(userId, userId, userId);
      }
      // Director and HR see all queries by default
    }

    // Additional filters
    if (status && status !== "all") {
      if (status === "Resolved") {
        query += " AND (hq.status = 'Resolved' OR hq.status = 'Answered')";
      } else {
        query += " AND hq.status = ?";
        params.push(status);
      }
    }

    if (category && category !== "all") {
      query += " AND hq.category = ?";
      params.push(category);
    }

    if (search) {
      query += " AND (hq.query_text LIKE ? OR hq.subject LIKE ? OR u.name LIKE ?)";
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += " ORDER BY CASE hq.status WHEN 'Open' THEN 1 WHEN 'In Progress' THEN 2 ELSE 3 END, hq.created_at DESC";

    const rows = db.prepare(query).all(...params);

    // Provide backwards-compatibility aliases
    const result = rows.map(r => ({
      ...r,
      intern_name: r.requester_name,
      trainer_name: r.target_name || (r.target_role ? `${r.target_role} Dept.` : 'Help Desk Team')
    }));

    res.json(result);
  } catch (e) {
    console.error("Fetch helpdesk queries error:", e);
    res.status(500).json({ error: "Server error fetching helpdesk queries" });
  }
});

// POST /api/helpdesk - Create a new query (Open to ALL: Interns, Trainers, HR, Director)
router.post("/", authenticateToken, (req, res) => {
  const { target_user_id, trainer_id, target_role, category, priority, subject, query_text } = req.body;
  
  if (!query_text || !query_text.trim()) {
    return res.status(400).json({ error: "Query description is required." });
  }

  // Support target_user_id or legacy trainer_id
  let assignedUserId = target_user_id ? parseInt(target_user_id) : (trainer_id ? parseInt(trainer_id) : null);
  let resolvedRole = target_role || null;

  try {
    let internMentorId = null;
    if (req.user.role === 'Intern') {
      const internRow = db.prepare('SELECT mentor_id FROM interns WHERE user_id = ?').get(req.user.id);
      if (internRow && internRow.mentor_id) {
        internMentorId = internRow.mentor_id;
        // If query is for Trainer / Mentor, route directly to their assigned mentor
        if (resolvedRole === 'Mentor' || (!assignedUserId && !resolvedRole)) {
          assignedUserId = internMentorId;
          resolvedRole = 'Mentor';
        }
      }
    }

    // If assignedUserId provided, verify and retrieve their role
    let targetUser = null;
    if (assignedUserId) {
      targetUser = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(assignedUserId);
      // If intern selected a mentor that isn't their assigned mentor, enforce their assigned mentor
      if (req.user.role === 'Intern' && targetUser && targetUser.role === 'Mentor' && internMentorId && assignedUserId !== internMentorId) {
        assignedUserId = internMentorId;
        targetUser = db.prepare("SELECT id, name, role FROM users WHERE id = ?").get(assignedUserId);
      }
      if (targetUser && !resolvedRole) {
        resolvedRole = targetUser.role;
      }
    }

    const cleanSubject = subject && subject.trim() ? subject.trim() : (query_text.trim().substring(0, 50) + "...");
    const cleanCategory = category || "General";
    const cleanPriority = priority || "Medium";

    const result = db.prepare(`
      INSERT INTO helpdesk_queries (
        user_id, target_user_id, target_role, category, priority, subject, query_text, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')
    `).run(
      req.user.id,
      assignedUserId,
      resolvedRole,
      cleanCategory,
      cleanPriority,
      cleanSubject,
      query_text.trim()
    );

    const newQueryId = result.lastInsertRowid;

    // Send notifications to the respected person(s)
    if (targetUser) {
      // Notify the specific assigned person
      sendNotification(
        targetUser.id,
        "New Help Desk Query Assigned",
        `${req.user.name} (${req.user.role}) submitted a query for you: "${cleanSubject}" [Priority: ${cleanPriority}]`
      );
    } else if (resolvedRole) {
      // Notify all active users with this role (e.g. HR or Director)
      const roleUsers = db.prepare("SELECT id FROM users WHERE role = ? AND status = 'Active'").all(resolvedRole);
      for (const u of roleUsers) {
        if (u.id !== req.user.id) {
          sendNotification(
            u.id,
            `New Help Desk Query for ${resolvedRole}`,
            `${req.user.name} (${req.user.role}) submitted a ${cleanCategory} query: "${cleanSubject}"`
          );
        }
      }
    }

    // If the requester is an intern and has an assigned mentor who wasn't the direct target, also notify their mentor
    if (internMentorId && (!targetUser || targetUser.id !== internMentorId)) {
      sendNotification(
        internMentorId,
        "Query Raised by Your Intern",
        `Your assigned intern ${req.user.name} submitted a query: "${cleanSubject}" [Priority: ${cleanPriority}]`
      );
    }

    logHelpdeskActivity(req.user.id, "Helpdesk Query Created", `Created query #${newQueryId}: ${cleanSubject}`);

    res.status(201).json({
      message: "Query submitted successfully.",
      id: newQueryId
    });
  } catch (e) {
    console.error("Create helpdesk query error:", e);
    res.status(500).json({ error: "Server error creating query." });
  }
});

// PUT /api/helpdesk/:id - Respected person solves/updates the query and notifies the requester
router.put("/:id", authenticateToken, (req, res) => {
  const queryId = parseInt(req.params.id);
  const { answer_text, status, priority, target_user_id } = req.body;

  try {
    const queryItem = db.prepare(`
      SELECT hq.*, u.name as requester_name, u.role as requester_role
      FROM helpdesk_queries hq
      JOIN users u ON hq.user_id = u.id
      WHERE hq.id = ?
    `).get(queryId);

    if (!queryItem) {
      return res.status(404).json({ error: "Help desk query not found." });
    }

    // Determine authorization to solve / update
    const isRequester = req.user.id === queryItem.user_id;
    const isTargetUser = queryItem.target_user_id ? (req.user.id === queryItem.target_user_id) : false;
    const isDirector = req.user.role === 'Director';
    const isTargetRole = queryItem.target_role ? (
      (queryItem.target_role === 'HR' && req.user.role === 'HR') ||
      (['Mentor', 'Trainer'].includes(queryItem.target_role) && req.user.role === 'Mentor') ||
      (queryItem.target_role === 'Director' && req.user.role === 'Director')
    ) : false;

    // Check if user is attempting to provide or update the resolution/answer:
    const isProvidingAnswer = (answer_text !== undefined && answer_text.trim().length > 0) || (status === 'Resolved' || status === 'Answered');

    if (isProvidingAnswer) {
      // The requester cannot answer their own query
      if (isRequester && !isTargetUser && !isDirector) {
        return res.status(403).json({ error: "Requesters cannot solve their own query. Only the respected person or department can solve it." });
      }

      // If assigned specifically to a person:
      if (queryItem.target_user_id) {
        if (!isTargetUser && !isDirector) {
          return res.status(403).json({ error: "Only the specifically assigned respected person can solve this query." });
        }
      } else if (queryItem.target_role) {
        // If assigned to a department / role:
        if (!isTargetRole && !isDirector) {
          return res.status(403).json({ error: `Only the ${queryItem.target_role} department can solve this query.` });
        }
      } else {
        // Fallback by category
        const cat = (queryItem.category || "").toLowerCase();
        if ((cat.includes("tech") || cat.includes("train")) && req.user.role !== 'Mentor' && !isDirector) {
          return res.status(403).json({ error: "Only the Technical/Training department can solve this query." });
        }
        if ((cat.includes("hr") || cat.includes("fee") || cat.includes("leave")) && req.user.role !== 'HR' && !isDirector) {
          return res.status(403).json({ error: "Only the HR department can solve this query." });
        }
      }
    } else {
      // Non-answer updates (e.g. requester closing their own resolved query, or changing priority)
      if (status === 'Closed' && isRequester) {
        // Requester closing their resolved issue is allowed
      } else if (!isTargetUser && !isTargetRole && !isDirector) {
        return res.status(403).json({ error: "You are not authorized to update this query." });
      }
    }

    // Determine new status
    let newStatus = status;
    if (!newStatus) {
      if (answer_text && answer_text.trim()) {
        newStatus = "Resolved";
      } else {
        newStatus = queryItem.status;
      }
    }

    const newAnswer = (answer_text !== undefined) ? answer_text.trim() : queryItem.answer_text;
    const newPriority = priority || queryItem.priority;
    const newTargetUserId = target_user_id !== undefined ? (target_user_id ? parseInt(target_user_id) : null) : queryItem.target_user_id;
    const solvedBy = (newAnswer || newStatus === 'Resolved') ? req.user.id : queryItem.solved_by;
    const answeredAt = (newAnswer || newStatus === 'Resolved') ? new Date().toISOString() : queryItem.answered_at;

    db.prepare(`
      UPDATE helpdesk_queries
      SET answer_text = ?,
          status = ?,
          priority = ?,
          target_user_id = ?,
          solved_by = ?,
          answered_at = CASE WHEN ? IS NOT NULL THEN CURRENT_TIMESTAMP ELSE answered_at END
      WHERE id = ?
    `).run(
      newAnswer,
      newStatus,
      newPriority,
      newTargetUserId,
      solvedBy,
      newAnswer ? 1 : null,
      queryId
    );

    // Notify the respected requester that their query has been updated / solved!
    if (queryItem.user_id !== req.user.id) {
      const solutionPreview = newAnswer ? ` Solution: "${newAnswer.substring(0, 80)}${newAnswer.length > 80 ? '...' : ''}"` : '';
      const notifTitle = newStatus === 'Resolved' || newStatus === 'Answered' 
        ? "Your Help Desk Query Has Been Resolved" 
        : `Help Desk Query Updated (${newStatus})`;

      sendNotification(
        queryItem.user_id,
        notifTitle,
        `${req.user.name} (${req.user.role}) has updated your query "${queryItem.subject || queryItem.query_text.substring(0, 35)}". Status: ${newStatus}.${solutionPreview}`
      );
    }

    logHelpdeskActivity(
      req.user.id,
      "Helpdesk Query Updated",
      `Query #${queryId} updated to ${newStatus} by ${req.user.name}`
    );

    res.json({
      message: newStatus === 'Resolved' || newStatus === 'Answered' 
        ? "Query resolved and requester notified successfully." 
        : "Query updated successfully.",
      status: newStatus
    });
  } catch (e) {
    console.error("Update helpdesk query error:", e);
    res.status(500).json({ error: "Server error updating query." });
  }
});

// Backward compatibility routes for Director Helpdesk
router.get("/director", authenticateToken, (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        hq.id, hq.query_text, hq.answer_text, hq.status, hq.created_at, hq.answered_at,
        u.name as user_name, u.role as user_role, u.id as user_id,
        hq.subject, hq.priority, hq.category
      FROM helpdesk_queries hq
      JOIN users u ON hq.user_id = u.id
      WHERE hq.target_role = 'Director' OR u.role IN ('HR', 'Mentor')
      ORDER BY hq.created_at DESC
    `).all();
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/director", authenticateToken, (req, res) => {
  const { query_text, subject, category, priority } = req.body;
  if (!query_text) return res.status(400).json({ error: "query_text required." });
  try {
    const directorUser = db.prepare("SELECT id FROM users WHERE role = 'Director' LIMIT 1").get();
    const result = db.prepare(`
      INSERT INTO helpdesk_queries (user_id, target_user_id, target_role, category, priority, subject, query_text, status)
      VALUES (?, ?, 'Director', ?, ?, ?, ?, 'Open')
    `).run(
      req.user.id,
      directorUser ? directorUser.id : null,
      category || 'Management / Director',
      priority || 'Medium',
      subject || 'Query to Director',
      query_text
    );

    if (directorUser) {
      sendNotification(
        directorUser.id,
        "New Help Desk Query to Director",
        `${req.user.name} (${req.user.role}) sent a query: "${(subject || query_text).substring(0, 60)}"`
      );
    }
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/director/:id", authenticateToken, (req, res) => {
  const { answer_text, status } = req.body;
  if (!answer_text) return res.status(400).json({ error: "answer_text required." });
  try {
    const q = db.prepare("SELECT * FROM helpdesk_queries WHERE id = ?").get(parseInt(req.params.id));
    if (!q) return res.status(404).json({ error: "Not found." });
    db.prepare(`
      UPDATE helpdesk_queries 
      SET answer_text = ?, status = ?, solved_by = ?, answered_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(answer_text, status || "Resolved", req.user.id, parseInt(req.params.id));

    sendNotification(
      q.user_id,
      "Your Query to Director Has Been Resolved",
      `${req.user.name} answered your query: "${answer_text.substring(0, 80)}"`
    );
    res.json({ message: "Answered and resolved." });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
