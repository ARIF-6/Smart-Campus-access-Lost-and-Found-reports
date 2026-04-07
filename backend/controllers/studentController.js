// @desc    Get dashboard (Student only)
// @route   GET /api/student/dashboard
// @access  Private/Student
exports.getStudentDashboard = async (req, res) => {
  res.status(200).json({
    message: "Student Access Granted: Welcome to your dashboard",
    user: { id: req.user.id, role: req.user.role }
  });
};

// @desc    Get list of lost items for students
// @route   GET /api/student/lost-items
// @access  Private/Student
exports.getLostItems = async (req, res) => {
  res.status(200).json({
    message: "Student Access Granted: Retrieved lost items gallery",
    user: { id: req.user.id, role: req.user.role }
  });
};
