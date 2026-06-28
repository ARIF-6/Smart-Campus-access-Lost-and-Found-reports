const allowRoles = (...roles) => {
  return (req, res, next) => {
    // Check if the user is available from authMiddleware
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Not authorized, no user found' 
      });
    }

    // Check if the user's role is in the array of allowed roles
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const allowedRoles = roles.map(r => r.toLowerCase());

    const isAuthorized = allowedRoles.includes(userRole);

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false,
        message: `Forbidden: User role '${req.user.role}' is not authorized to access this route` 
      });
    }

    next();
  };
};

// Aliases for role-specific middleware
const adminOnly = allowRoles('admin');
const adminOrStaff = allowRoles('admin', 'staff');
const studentOnly = allowRoles('student');
const securityOnly = allowRoles('security');
const cleanerOnly = allowRoles('clean');

module.exports = {
  allowRoles,
  authorizeRoles: allowRoles, // export old name for backwards compatibility
  adminOnly,
  adminOrStaff,
  studentOnly,
  securityOnly,
  cleanerOnly
};
