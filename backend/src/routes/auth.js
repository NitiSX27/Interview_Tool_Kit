const express = require('express');
const { z } = require('zod');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

const router = express.Router();

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.createWithPassword(email, password);
    const token = signToken(user._id);

    res.cookie('token', token, COOKIE_OPTS);
    res.status(201).json({ user: { id: user._id, email: user.email } });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user._id);
    res.cookie('token', token, COOKIE_OPTS);
    res.json({ user: { id: user._id, email: user.email } });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input', details: err.errors });
    }
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token', COOKIE_OPTS);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const { requireAuth } = require('../middleware/auth');
    requireAuth(req, res, async () => {
      res.json({ user: req.user });
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
