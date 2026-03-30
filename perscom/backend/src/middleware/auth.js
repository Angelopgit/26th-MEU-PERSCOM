const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  // Prefer httpOnly cookie (invisible to JS/DevTools); fall back to Authorization header
  const token =
    req.cookies?.perscom_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    // Guest and Marine users are read-only — block all mutations
    if (['guest', 'marine'].includes(decoded.role) && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return res.status(403).json({ error: 'Read-only access' });
    }

    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Like authenticate but does NOT apply the read-only block for marines/guests.
// Used for routes where marines are allowed to mutate their own record.
function authenticateAny(req, res, next) {
  const token =
    req.cookies?.perscom_token ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null);

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  next();
}

function requireStaff(req, res, next) {
  if (!['admin', 'moderator'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Staff access required' });
  }
  next();
}

module.exports = { authenticate, authenticateAny, requireAdmin, requireStaff };
