const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    // Check if the user is available from authMiddleware
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, no user found' });
    }

    // Check if the user's role is in the array of allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this route` 
      });
    }

    next();
  };
};

// Aliases for role-specific middleware
const adminOnly = authorizeRoles('admin');
const studentOnly = authorizeRoles('student');
const securityOnly = authorizeRoles('security');
const cleanerOnly = authorizeRoles('cleaner');

module.exports = {
  authorizeRoles,
  adminOnly,
  studentOnly,
  securityOnly,
  cleanerOnly
};
