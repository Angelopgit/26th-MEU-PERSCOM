const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

  res.json({
    token,
    user: payload,
  });
});

// Guest access — issues a limited read-only JWT
router.post('/guest', (req, res) => {
  const guestPayload = { id: 0, username: 'guest', role: 'guest', display_name: 'Guest' };
  const token = jwt.sign(guestPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: guestPayload });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
