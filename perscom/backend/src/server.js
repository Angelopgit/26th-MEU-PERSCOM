require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initializeDatabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const discordAuthRoutes = require('./routes/discord-auth');
const personnelRoutes = require('./routes/personnel');
const operationsRoutes = require('./routes/operations');
const evaluationsRoutes = require('./routes/evaluations');
const announcementsRoutes = require('./routes/announcements');
const dashboardRoutes = require('./routes/dashboard');
const orbatRoutes = require('./routes/orbat');
const activityRoutes = require('./routes/activity');
const settingsRoutes = require('./routes/settings');
const documentsRoutes = require('./routes/documents');
const gearLoadoutsRoutes = require('./routes/gear-loadouts');
const usersRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const spotlightRoutes = require('./routes/spotlight');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// CORS: In dev, allow Vite dev server. In prod, allow the frontend origin (26thmeu.org).
// credentials: true is required so the browser sends the httpOnly auth cookie cross-origin.
app.use(cors({
  origin: process.env.CORS_ORIGIN || (isProd ? 'https://26thmeu.org' : 'http://localhost:5173'),
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser()); // Parse httpOnly cookies on every request

// Serve uploaded files (operation images, logos)
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

initializeDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/auth', discordAuthRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orbat', orbatRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/gear-loadouts', gearLoadoutsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/spotlight', spotlightRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', system: 'PERSCOM v1.0', unit: '26th MEU (SOC)' });
});

// In production: serve the built React frontend (frontend/dist)
if (isProd) {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[PERSCOM] Backend running on port ${PORT}`);
  console.log(`[PERSCOM] Unit: 26th MEU (SOC)`);
  console.log(`[PERSCOM] Mode: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);

  // Start Discord bot (non-blocking, errors logged but don't crash server)
  const { startBot } = require('./discord/bot');
  startBot().catch(err => console.error('[PERSCOM] Discord bot failed to start:', err.message));
});
