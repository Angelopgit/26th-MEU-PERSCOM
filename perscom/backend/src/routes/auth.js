const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';

// httpOnly cookie options — token cannot be read by JS or seen in DevTools Application tab
// In production, sameSite: 'none' + secure: true allows cross-origin requests with credentials
// (frontend on 26thmeu.org, backend on a separate Node.js host)
const cookieOpts = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'strict',
  maxAge: maxAgeMs,
  path: '/',
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    display_name: user.display_name,
    personnel_id: user.personnel_id || null,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

  // Token goes into httpOnly cookie only — never in the response body
  res.cookie('perscom_token', token, cookieOpts(24 * 60 * 60 * 1000));
  res.json({ user: payload });
});

// Guest access — limited read-only session
router.post('/guest', (req, res) => {
  const guestPayload = { id: 0, username: 'guest', role: 'guest', display_name: 'Guest' };
  const token = jwt.sign(guestPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.cookie('perscom_token', token, cookieOpts(8 * 60 * 60 * 1000));
  res.json({ user: guestPayload });
});

// Logout — clears the httpOnly cookie server-side
router.post('/logout', (req, res) => {
  res.clearCookie('perscom_token', { path: '/' });
  res.json({ success: true });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
