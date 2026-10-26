const { authenticateToken } = require('../core/auth');

/**
 * Middleware to enforce role‑based access control.
 * Usage: router.get('/director', requireRole('Director'), handler);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // First ensure the JWT has been validated
    authenticateToken(req, res, () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const userRole = req.user.role;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }
      next();
    });
  };
}

module.exports = { requireRole };
