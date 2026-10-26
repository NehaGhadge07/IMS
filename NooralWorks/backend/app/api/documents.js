const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../db/connection');
const { authenticateToken, requireRole } = require('../core/auth');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer disk storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Helper to get intern id from user id
function getInternId(userId) {
  const row = db.prepare('SELECT id FROM interns WHERE user_id = ?').get(userId);
  return row ? row.id : null;
}

// GET /api/documents - List documents
router.get('/', authenticateToken, (req, res) => {
  try {
    let query = `
      SELECT d.*, i.technology, ui.name as intern_name, ui.email as intern_email, 
             mu.name as mentor_name, mu.id as mentor_user_id,
             uv.name as verified_by_name,
             uu.name as uploader_name, COALESCE(d.uploader_role, 'Intern') as uploader_role
      FROM documents d
      JOIN interns i ON d.intern_id = i.id
      JOIN users ui ON i.user_id = ui.id
      LEFT JOIN users mu ON (i.mentor_id = mu.id OR i.mentor_id IN (SELECT user_id FROM mentors WHERE id = i.mentor_id))
      LEFT JOIN users uv ON d.verified_by = uv.id
      LEFT JOIN users uu ON d.uploaded_by = uu.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'Intern') {
      const internId = getInternId(req.user.id);
      if (!internId) return res.status(404).json({ error: 'Intern profile not found.' });
      query += ` AND d.intern_id = ?`;
      params.push(internId);
    } else {
      if (req.query.intern_id) {
        query += ` AND d.intern_id = ?`;
        params.push(parseInt(req.query.intern_id));
      }
      if (req.query.mentor_id || req.query.trainer_id) {
        const mId = parseInt(req.query.mentor_id || req.query.trainer_id);
        query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
        params.push(mId, mId);
      }
      if (req.user.role === 'Mentor') {
        // Mentors only see their interns' docs
        query += ` AND (i.mentor_id = ? OR i.mentor_id IN (SELECT id FROM mentors WHERE user_id = ?))`;
        params.push(req.user.id, req.user.id);
      }
    }

    query += ` ORDER BY d.uploaded_at DESC`;
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (error) {
    console.error('Fetch docs error:', error);
    res.status(500).json({ error: 'Server error fetching documents list.' });
  }
});

// POST /api/documents/upload - Upload a file (Intern only)
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  if (req.user.role !== 'Intern') {
    return res.status(403).json({ error: 'Only interns can upload documents.' });
  }

  const internId = getInternId(req.user.id);
  if (!internId) {
    return res.status(404).json({ error: 'Intern profile not found.' });
  }

  const { doc_type, comments } = req.body;
  const VALID_DOC_TYPES = ['Resume', 'ID Proof', 'Offer Letter', 'Completion Certificate', 'College Marksheet', 'Aadhar Card', 'Last Sem Result', 'Bonafide Certificate', 'ID Photo'];
  if (!doc_type || !VALID_DOC_TYPES.includes(doc_type)) {
    return res.status(400).json({ error: `Valid doc_type is required (${VALID_DOC_TYPES.join(', ')}).` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file.' });
  }

  const relativePath = req.file.filename;

  try {
    const result = db.prepare(`
      INSERT INTO documents (intern_id, doc_type, file_path, status, comments, uploaded_by, uploader_role)
      VALUES (?, ?, ?, 'Uploaded', ?, ?, 'Intern')
    `).run(internId, doc_type, relativePath, comments || 'Uploaded by Intern', req.user.id);

    // Sync resume_url in interns table if document is a Resume
    if (doc_type === 'Resume') {
      try {
        db.prepare("UPDATE interns SET resume_url = ? WHERE id = ?").run('/uploads/' + relativePath, internId);
      } catch (e) {
        console.error('Error syncing resume_url:', e);
      }
    }

    // Notify HR
    const hrs = db.prepare("SELECT id FROM users WHERE role = 'HR' OR role = 'Director'").all();
    hrs.forEach(hr => {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message)
        VALUES (?, 'New Document Uploaded', 'Intern ${req.user.name} uploaded a new ${doc_type} for verification.')
      `).run(hr.id);
    });

    res.status(201).json({ 
      message: 'Document uploaded successfully.', 
      documentId: result.lastInsertRowid,
      filePath: relativePath
    });
  } catch (error) {
    console.error('Save doc db error:', error);
    res.status(500).json({ error: 'Server error saving document record.' });
  }
});

// POST /api/documents/upload-for-intern - HR uploads a doc on behalf of an intern (Director is view-only, Trainer cannot upload)
router.post('/upload-for-intern', authenticateToken, upload.single('file'), (req, res) => {
  if (req.user.role === 'Director') {
    return res.status(403).json({ error: 'Director has view-only access to documents. Documents can only be uploaded by HR and Interns.' });
  }
  if (req.user.role !== 'HR') {
    return res.status(403).json({ error: 'Only HR can upload documents for interns.' });
  }

  const { intern_id, doc_type, comments } = req.body;

  if (!intern_id) {
    return res.status(400).json({ error: 'intern_id is required.' });
  }

  const VALID_DOC_TYPES = ['Resume', 'ID Proof', 'Offer Letter', 'Completion Certificate', 'College Marksheet', 'Aadhar Card', 'Last Sem Result', 'Bonafide Certificate', 'ID Photo'];
  if (!doc_type || !VALID_DOC_TYPES.includes(doc_type)) {
    return res.status(400).json({ error: `Valid doc_type is required (${VALID_DOC_TYPES.join(', ')}).` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Please upload a file.' });
  }

  try {
    // Verify intern exists
    const intern = db.prepare(`
      SELECT i.id, i.user_id, u.name AS intern_name
      FROM interns i JOIN users u ON i.user_id = u.id
      WHERE i.id = ?
    `).get(parseInt(intern_id));

    if (!intern) {
      return res.status(404).json({ error: 'Intern not found.' });
    }

    const relativePath = req.file.filename;

    const result = db.prepare(`
      INSERT INTO documents (intern_id, doc_type, file_path, status, comments, uploaded_by, uploader_role)
      VALUES (?, ?, ?, 'Uploaded', ?, ?, 'HR')
    `).run(parseInt(intern_id), doc_type, relativePath, comments || 'Uploaded by HR', req.user.id);

    // Sync resume_url in interns table if document is a Resume
    if (doc_type === 'Resume') {
      try {
        db.prepare("UPDATE interns SET resume_url = ? WHERE id = ?").run('/uploads/' + relativePath, parseInt(intern_id));
      } catch (e) {
        console.error('Error syncing resume_url:', e);
      }
    }

    // Notify the intern
    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Document Uploaded', 'HR has uploaded your ${doc_type}. Please check your documents.')
    `).run(intern.user_id);

    res.status(201).json({
      message: `Document uploaded for ${intern.intern_name} successfully.`,
      documentId: result.lastInsertRowid,
      filePath: relativePath
    });
  } catch (error) {
    console.error('HR upload-for-intern error:', error);
    res.status(500).json({ error: 'Server error saving document record.' });
  }
});

// POST /api/documents/:id/verify - Verify document (HR / Director only)
router.post('/:id/verify', authenticateToken, requireRole(['HR', 'Director']), (req, res) => {
  const { id } = req.params;
  const { status, comments } = req.body; // status: Approved or Rejected

  if (!status || !['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be Approved or Rejected.' });
  }

  try {
    const doc = db.prepare(`
      SELECT d.*, i.user_id 
      FROM documents d
      JOIN interns i ON d.intern_id = i.id
      WHERE d.id = ?
    `).get(parseInt(id));

    if (!doc) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    db.prepare(`
      UPDATE documents
      SET status = ?, verified_by = ?, verified_at = CURRENT_TIMESTAMP, comments = COALESCE(?, comments)
      WHERE id = ?
    `).run(status, req.user.id, comments || null, parseInt(id));

    // If Resume is approved, ensure interns.resume_url is updated
    if (doc.doc_type === 'Resume' && status === 'Approved') {
      try {
        db.prepare("UPDATE interns SET resume_url = ? WHERE id = ?").run('/uploads/' + doc.file_path, doc.intern_id);
      } catch (e) {
        console.error('Error updating resume_url on verify:', e);
      }
    }

    // Notify intern
    db.prepare(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, 'Document Verified', 'Your document (${doc.doc_type}) has been ${status.toLowerCase()} by HR. Feedback: ${comments || 'None'}.')
    `).run(doc.user_id);

    res.json({ message: `Document verification saved. Status: ${status}` });
  } catch (error) {
    console.error('Verify doc error:', error);
    res.status(500).json({ error: 'Server error saving document verification.' });
  }
});

module.exports = router;
