const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');
const { logActivity } = require('../utils/logActivity');
const { authenticate } = require('../middleware/auth');
const { syncRankToDiscord } = require('../discord/sync');

const router = express.Router();
const isProd = process.env.NODE_ENV === 'production';

// After OAuth callback, we redirect to the frontend.
// In prod: FRONTEND_URL should be https://26thmeu.org/perscom (no trailing slash)
// In dev:  the React app runs on Vite port 5173
const FRONTEND_ORIGIN = isProd
  ? (process.env.FRONTEND_URL || 'https://26thmeu.org/perscom')
  : (process.env.CORS_ORIGIN || 'http://localhost:5173');

const DISCORD_API = 'https://discord.com/api/v10';

// Discord IDs that are automatically assigned admin role (comma-separated env var)
const ADMIN_DISCORD_IDS = (process.env.DISCORD_ADMIN_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

// Use stored Discord refresh_token to silently renew credentials.
// grant_type=refresh_token has a much more generous rate limit than authorization_code.
async function refreshDiscordTokens(refreshToken) {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } = process.env;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const text = await res.text().catch(() => '(unreadable)');
      console.warn('[DISCORD] Token refresh failed:', text);
      return null;
    }
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    console.warn('[DISCORD] Token refresh error:', err.message);
    return null;
  }
}

// Exchange an authorization code for tokens with one automatic retry on rate-limit.
// Discord codes are single-use but the rate-limit is app-wide, so retrying the
// same request after a short delay is safe and correct.
async function exchangeCodeForTokens(params) {
  const body = new URLSearchParams(params);

  const attempt = () => fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  let res = await attempt();

  if (!res.ok) {
    let errText;
    try { errText = await res.text(); } catch { errText = '(unreadable)'; }

    let errData = {};
    try { errData = JSON.parse(errText); } catch {}

    const isRateLimit =
      errData.error === 'invalid_request' &&
      typeof errData.error_description === 'string' &&
      errData.error_description.toLowerCase().includes('rate limit');

    if (isRateLimit) {
      console.warn('[DISCORD] Token exchange rate-limited — retrying in 6s...');
      await new Promise(r => setTimeout(r, 6000));
      res = await attempt();
    }

    if (!res.ok) {
      console.error('[DISCORD] Token exchange failed:', errText);
      return null;
    }
  }

  return res.json();
}

const cookieOpts = (maxAgeMs) => ({
  httpOnly: true,
  secure: isProd,
  // Production: 'none' allows cross-origin credential requests (frontend on 26thmeu.org, backend on separate host)
  // Development: 'lax' required for cross-port redirects after OAuth callback
  sameSite: isProd ? 'none' : 'lax',
  maxAge: maxAgeMs,
  path: '/',
});

// Silent session refresh — re-issues a JWT without a new OAuth code exchange.
// If the current JWT is still valid, just extends it. If expired, uses the stored
// Discord refresh_token to verify the user is still active and issue a fresh JWT.
// This keeps returning users logged in without hammering Discord's auth-code rate limit.
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.perscom_token;
  if (!token) return res.status(401).json({ error: 'No session' });

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const now = Math.floor(Date.now() / 1000);

  // JWT still valid — just extend the expiry, no Discord API call needed
  if (decoded.exp > now) {
    const { iat, exp, ...payload } = decoded;
    const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('perscom_token', newToken, cookieOpts(7 * 24 * 60 * 60 * 1000));
    return res.json({ user: payload });
  }

  // JWT expired — use stored Discord refresh_token to silently re-validate
  const db = getDb();
  const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.id);
  if (!dbUser?.discord_refresh_token) {
    return res.status(401).json({ error: 'Session expired' });
  }

  const newTokens = await refreshDiscordTokens(dbUser.discord_refresh_token);
  if (!newTokens) {
    return res.status(401).json({ error: 'Session expired' });
  }

  db.prepare('UPDATE users SET discord_access_token = ?, discord_refresh_token = ? WHERE id = ?')
    .run(newTokens.access_token, newTokens.refresh_token || dbUser.discord_refresh_token, dbUser.id);

  const effectiveRole = ADMIN_DISCORD_IDS.includes(dbUser.discord_id) ? 'admin' : dbUser.role;
  const payload = {
    id: dbUser.id,
    username: dbUser.username || dbUser.discord_username,
    role: effectiveRole,
    display_name: dbUser.display_name,
    discord_id: dbUser.discord_id,
    discord_username: dbUser.discord_username,
    discord_avatar: dbUser.discord_avatar,
    personnel_id: dbUser.personnel_id,
  };

  const freshToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('perscom_token', freshToken, cookieOpts(7 * 24 * 60 * 60 * 1000));
  console.log(`[DISCORD] Silent refresh for user ${dbUser.discord_id}`);
  return res.json({ user: payload });
});

// Step 1: Redirect to Discord authorization
router.get('/discord', (req, res) => {
  const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = process.env;
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    return res.status(500).json({ error: 'Discord OAuth is not configured' });
  }

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds.members.read',
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// Step 2: Handle Discord callback
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.redirect(`${FRONTEND_ORIGIN}/login?error=no_code`);
  }

  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, DISCORD_GUILD_ID, DISCORD_ROLE_PERSONNEL } = process.env;

  try {
    // Exchange code for tokens (auto-retries once on rate-limit)
    const tokens = await exchangeCodeForTokens({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_REDIRECT_URI,
    });

    if (!tokens) {
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=token_failed`);
    }

    // Fetch user profile
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) {
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=user_fetch_failed`);
    }
    const discordUser = await userRes.json();

    // Fetch guild member info to check roles
    let hasPersonnelRole = true; // Default true if role check is not configured
    if (DISCORD_GUILD_ID) {
      const memberRes = await fetch(`${DISCORD_API}/users/@me/guilds/${DISCORD_GUILD_ID}/member`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!memberRes.ok) {
        return res.redirect(`${FRONTEND_ORIGIN}/login?error=not_in_server`);
      }

      const member = await memberRes.json();

      // Check for "26th Marine Personnel" role if configured
      if (DISCORD_ROLE_PERSONNEL) {
        hasPersonnelRole = member.roles.includes(DISCORD_ROLE_PERSONNEL);
      }
    }

    if (!hasPersonnelRole) {
      return res.redirect(`${FRONTEND_ORIGIN}/login?error=no_personnel_role`);
    }

    // Look up existing user by discord_id
    const db = getDb();
    const existingUser = db.prepare('SELECT * FROM users WHERE discord_id = ?').get(discordUser.id);

    if (existingUser) {
      // Returning user — update Discord info and issue session
      // Auto-upgrade whitelisted Discord IDs to admin
      const effectiveRole = ADMIN_DISCORD_IDS.includes(discordUser.id) ? 'admin' : existingUser.role;

      db.prepare(`
        UPDATE users SET discord_username = ?, discord_avatar = ?,
        discord_access_token = ?, discord_refresh_token = ?, role = ? WHERE id = ?
      `).run(
        discordUser.username,
        discordUser.avatar,
        tokens.access_token,
        tokens.refresh_token || null,
        effectiveRole,
        existingUser.id
      );

      const payload = {
        id: existingUser.id,
        username: existingUser.username || discordUser.username,
        role: effectiveRole,
        display_name: existingUser.display_name,
        discord_id: discordUser.id,
        discord_username: discordUser.username,
        discord_avatar: discordUser.avatar,
        personnel_id: existingUser.personnel_id,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
      res.cookie('perscom_token', token, cookieOpts(7 * 24 * 60 * 60 * 1000));
      return res.redirect(`${FRONTEND_ORIGIN}/`);
    }

    // New user — issue a short-lived registration token and redirect to register page
    const regPayload = {
      discord_id: discordUser.id,
      discord_username: discordUser.username,
      discord_avatar: discordUser.avatar,
      discord_access_token: tokens.access_token,
      discord_refresh_token: tokens.refresh_token || null,
      _registration: true,
    };

    const regToken = jwt.sign(regPayload, process.env.JWT_SECRET, { expiresIn: '10m' });
    res.cookie('perscom_reg', regToken, cookieOpts(10 * 60 * 1000));
    return res.redirect(`${FRONTEND_ORIGIN}/register`);

  } catch (err) {
    console.error('[DISCORD] OAuth callback error:', err);
    return res.redirect(`${FRONTEND_ORIGIN}/login?error=server_error`);
  }
});

// Step 3: First-time Marine registration
router.post('/discord/register', (req, res) => {
  const regToken = req.cookies?.perscom_reg;
  if (!regToken) {
    return res.status(401).json({ error: 'Registration session expired. Please sign in with Discord again.' });
  }

  let regData;
  try {
    regData = jwt.verify(regToken, process.env.JWT_SECRET);
    if (!regData._registration) throw new Error('Invalid token');
  } catch {
    return res.status(401).json({ error: 'Invalid registration session. Please sign in with Discord again.' });
  }

  const { name } = req.body;
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ error: 'Please enter your full name (Last, First).' });
  }

  const db = getDb();

  // Check if discord_id is already registered (race condition guard)
  const existing = db.prepare('SELECT id FROM users WHERE discord_id = ?').get(regData.discord_id);
  if (existing) {
    res.clearCookie('perscom_reg', { path: '/' });
    return res.status(409).json({ error: 'This Discord account is already registered.' });
  }

  const today = new Date().toISOString().split('T')[0];

  // Determine role — whitelisted Discord IDs get admin
  const assignedRole = ADMIN_DISCORD_IDS.includes(regData.discord_id) ? 'admin' : 'marine';

  // Create personnel record
  const personnelResult = db.prepare(
    'INSERT INTO personnel (name, status, rank, rank_since, date_of_entry, member_status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), 'Marine', 'Recruit', today, today, 'Active');

  const personnelId = personnelResult.lastInsertRowid;

  // Create user record
  const userResult = db.prepare(`
    INSERT INTO users (display_name, role, discord_id, discord_username, discord_avatar,
    discord_access_token, discord_refresh_token, personnel_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(),
    assignedRole,
    regData.discord_id,
    regData.discord_username,
    regData.discord_avatar,
    regData.discord_access_token,
    regData.discord_refresh_token,
    personnelId
  );

  const userId = userResult.lastInsertRowid;

  // Set the reverse link
  db.prepare('UPDATE personnel SET user_id = ? WHERE id = ?').run(userId, personnelId);

  logActivity('MARINE_REGISTERED', `${name.trim()} registered via Discord (${regData.discord_username})${assignedRole === 'admin' ? ' [ADMIN]' : ''}`, userId);

  // Sync initial rank to Discord
  syncRankToDiscord(regData.discord_id, null, 'Recruit').catch(() => {});

  // Clear registration cookie and issue real session
  res.clearCookie('perscom_reg', { path: '/' });

  const payload = {
    id: userId,
    username: regData.discord_username,
    role: assignedRole,
    display_name: name.trim(),
    discord_id: regData.discord_id,
    discord_username: regData.discord_username,
    discord_avatar: regData.discord_avatar,
    personnel_id: personnelId,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('perscom_token', token, cookieOpts(7 * 24 * 60 * 60 * 1000));
  res.json({ user: payload });
});

// Link a personnel record to an already-authenticated user who has none.
// Marine users are blocked from POST mutations by the standard auth middleware,
// so we do JWT verification manually here.
router.post('/discord/link-personnel', (req, res) => {
  const token = req.cookies?.perscom_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let currentUser;
  try {
    currentUser = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  if (currentUser.role === 'guest') {
    return res.status(403).json({ error: 'Guest accounts cannot be linked.' });
  }

  // Check DB directly (not just JWT) in case token is stale
  const db = getDb();
  const dbUser = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id);
  if (!dbUser) return res.status(404).json({ error: 'User not found.' });
  if (dbUser.personnel_id) return res.status(409).json({ error: 'Account is already linked to a marine record.' });

  const { name } = req.body;
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ error: 'Please enter your full name (Last, First).' });
  }

  const today = new Date().toISOString().split('T')[0];

  const personnelResult = db.prepare(
    'INSERT INTO personnel (name, status, rank, rank_since, date_of_entry, member_status) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), 'Marine', 'Recruit', today, today, 'Active');

  const personnelId = personnelResult.lastInsertRowid;

  db.prepare('UPDATE users SET personnel_id = ? WHERE id = ?').run(personnelId, currentUser.id);
  db.prepare('UPDATE personnel SET user_id = ? WHERE id = ?').run(currentUser.id, personnelId);

  logActivity(
    'MARINE_REGISTERED',
    `${name.trim()} created personnel record (${dbUser.discord_username || dbUser.username})`,
    currentUser.id
  );

  if (dbUser.discord_id) {
    syncRankToDiscord(dbUser.discord_id, null, 'Recruit').catch(() => {});
  }

  // Issue fresh JWT with personnel_id populated
  const payload = {
    id: currentUser.id,
    username: currentUser.username,
    role: currentUser.role,
    display_name: name.trim(),
    discord_id: currentUser.discord_id,
    discord_username: currentUser.discord_username,
    discord_avatar: currentUser.discord_avatar,
    personnel_id: personnelId,
  };

  const newToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.cookie('perscom_token', newToken, cookieOpts(7 * 24 * 60 * 60 * 1000));
  res.json({ user: payload });
});

// Get registration info from the temp cookie (for the Register page to display Discord avatar/name)
router.get('/discord/register-info', (req, res) => {
  const regToken = req.cookies?.perscom_reg;
  if (!regToken) {
    return res.status(401).json({ error: 'No registration session' });
  }

  try {
    const regData = jwt.verify(regToken, process.env.JWT_SECRET);
    if (!regData._registration) throw new Error('Invalid token');
    res.json({
      discord_username: regData.discord_username,
      discord_avatar: regData.discord_avatar,
      discord_id: regData.discord_id,
    });
  } catch {
    return res.status(401).json({ error: 'Registration session expired' });
  }
});

module.exports = router;
