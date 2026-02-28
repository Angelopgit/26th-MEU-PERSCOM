require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./config/database');

const authRoutes = require('./routes/auth');
const personnelRoutes = require('./routes/personnel');
const operationsRoutes = require('./routes/operations');
const evaluationsRoutes = require('./routes/evaluations');
const announcementsRoutes = require('./routes/announcements');
const dashboardRoutes = require('./routes/dashboard');
const orbatRoutes = require('./routes/orbat');
const activityRoutes = require('./routes/activity');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// In development, allow the Vite dev server. In production, same-origin (no CORS needed).
if (!isProd) {
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }));
}

app.use(express.json());

// Serve uploaded files (operation images, logos)
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')));

initializeDatabase();

app.use('/api/auth', authRoutes);
app.use('/api/personnel', personnelRoutes);
app.use('/api/operations', operationsRoutes);
app.use('/api/evaluations', evaluationsRoutes);
app.use('/api/announcements', announcementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orbat', orbatRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ONLINE', system: 'PERSCOM v1.0', unit: '26th MEU (SOC)' });
});

// In production: serve the built React frontend (frontend/dist)
if (isProd) {
  const distPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(distPath));
  // SPA fallback — all non-API routes serve index.html
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
});
