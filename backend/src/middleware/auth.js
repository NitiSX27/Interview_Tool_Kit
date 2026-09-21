const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

/**
 * Middleware — verifies JWT from cookie or Authorization header.
 * Attaches req.user = { id, email } on success.
 */
async function requireAuth(req, res, next) {
  try {
    // Try cookie first, then Authorization header
    let token = req.cookies?.token;
    if (!token) {
      const header = req.headers.authorization || '';
      if (header.startsWith('Bearer ')) token = header.slice(7);
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const payload = jwt.verify(token, SECRET);
    const user = await User.findById(payload.id).select('_id email').lean();
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = { id: user._id.toString(), email: user.email };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function signToken(userId) {
  return jwt.sign({ id: userId }, SECRET, { expiresIn: '7d' });
}

module.exports = { requireAuth, signToken };
