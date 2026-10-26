const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'nooralworks_super_secret_key_12345';

// Hashing & Verification
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Token operations
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Auth middleware
const userLastActiveMap = new Map();
function updateLastActive(userId) {
  const now = Date.now();
  const last = userLastActiveMap.get(userId);
  if (!last || now - last > 20000) {
    userLastActiveMap.set(userId, now);
    try {
      const db = require('../db/connection');
      db.prepare("UPDATE users SET is_online = 1, last_active_at = ? WHERE id = ?").run(new Date().toISOString(), userId);
    } catch (e) {}
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    if (decoded && decoded.id) {
      updateLastActive(decoded.id);
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Role authorization middleware
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      console.log('[Auth Debug] requireRole: No req.user found');
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    
    console.log(`[Auth Debug] requireRole: user.email = ${req.user.email}, user.role = ${req.user.role}, allowedRoles = ${JSON.stringify(allowedRoles)}`);

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[Auth Debug] requireRole: Access DENIED for user ${req.user.email} (${req.user.role})`);
      return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
    }
    
    next();
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
  requireRole
};
