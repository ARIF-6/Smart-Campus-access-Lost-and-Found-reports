// @desc    Verify if a student has access (Security only)
// @route   POST /api/security/scan
// @access  Private/Security
exports.verifyStudentAccess = async (req, res) => {
  res.status(200).json({
    message: "Security Access Granted: Student access verification processed",
    user: { id: req.user.id, role: req.user.role }
  });
};

// @desc    Get campus access logs
// @route   GET /api/security/access-log
// @access  Private/Security
exports.getAccessLog = async (req, res) => {
  res.status(200).json({
    message: "Security Access Granted: Retrieved access logs",
    user: { id: req.user.id, role: req.user.role }
  });
};
