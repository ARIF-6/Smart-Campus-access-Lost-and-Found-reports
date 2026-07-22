const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const { getStudentDashboardAttendanceStatus } = require('../utils/attendanceHelper');

// @desc    Get dashboard (Student only)
// @route   GET /api/student/dashboard
// @access  Private/Student
exports.getStudentDashboard = async (req, res) => {
  res.status(200).json({
    message: "Student Access Granted: Welcome to your dashboard",
    user: { id: req.user.id, role: req.user.role }
  });
};

// @desc    Get current student's real-time attendance status for today
// @route   GET /api/student/attendance-status
// @access  Private/Student
exports.getStudentAttendanceStatus = asyncHandler(async (req, res) => {
  const status = await getStudentDashboardAttendanceStatus(req.user.id);
  return sendSuccess(res, 'Attendance status fetched successfully', status);
});

// @desc    Get list of lost items for students
// @route   GET /api/student/lost-items
// @access  Private/Student
exports.getLostItems = async (req, res) => {
  res.status(200).json({
    message: "Student Access Granted: Retrieved lost items gallery",
    user: { id: req.user.id, role: req.user.role }
  });
};
