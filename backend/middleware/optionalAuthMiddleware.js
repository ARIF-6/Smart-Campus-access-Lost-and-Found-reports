const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Optionally attaches req.user when a valid token is present.
 * Does not reject unauthenticated requests — used on public read routes
 * that need role-aware filtering when a staff member is logged in.
 */
const optionalProtect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (user && !user.isDeleted && user.isActive !== false) {
      req.user = user;
    }
  } catch (_) {
    // Ignore invalid tokens on optional routes
  }

  return next();
};

module.exports = { optionalProtect };
