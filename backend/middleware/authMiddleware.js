const jwt = require('jsonwebtoken');
const User = require('../models/User');

const isMobileClient = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  return userAgent.toLowerCase().includes('dart') ||
    userAgent.toLowerCase().includes('flutter') ||
    req.headers['x-client-platform'] === 'mobile';
};

const protect = async (req, res, next) => {
  let token;

  // 1. Check Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Fallback: check cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided'
    });
  }

  try {
    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database (exclude password)
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    // Check if the account is still active
    if (user.isDeleted || user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, account is disabled'
      });
    }

    // Enforce device binding for students on mobile clients
    if (user.role === 'student' && user.isActivated && user.deviceId && isMobileClient(req)) {
      const incomingDeviceId = req.headers['x-device-id'];
      if (incomingDeviceId && incomingDeviceId !== user.deviceId) {
        return res.status(403).json({
          success: false,
          message: 'Your account is already registered on another device. Please contact the administrator if you have changed your phone.'
        });
      }
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed or expired'
    });
  }
};

module.exports = { protect };
