require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const kitRoutes = require('./routes/kits');

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/kits', kitRoutes);

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ── Boot ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/interview_prep';

// Start the HTTP server immediately — DB connects in background
const server = app.listen(PORT, () => console.log(`[SERVER] Listening on port ${PORT}`));

function connectDB(attempt = 1) {
  const MAX = 10;
  console.log(`[DB] Connecting to MongoDB (attempt ${attempt}/${MAX})…`);
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,  // 10s per attempt
      socketTimeoutMS: 45000,
    })
    .then(() => console.log('[DB] Connected to MongoDB ✓'))
    .catch((err) => {
      console.error(`[DB] Connection failed: ${err.message}`);
      if (attempt < MAX) {
        const delay = Math.min(attempt * 3000, 30000); // 3s, 6s … 30s
        console.log(`[DB] Retrying in ${delay / 1000}s…`);
        setTimeout(() => connectDB(attempt + 1), delay);
      } else {
        console.error('[DB] Max retries reached. Fix MongoDB and restart the server.');
      }
    });
}

connectDB();

module.exports = app;
