const express = require('express');
const router = express.Router();
const {
  scanCampusQR,
  verifyStudentId,
  submitAttendance,
  getAttendanceRecords,
} = require('../controllers/campusAttendanceController');
const { protect } = require('../middleware/authMiddleware');
const { adminOrStaff } = require('../middleware/roleMiddleware');

// Public scan endpoints
router.post('/scan', scanCampusQR);
router.post('/verify-id', protect, verifyStudentId);
router.post('/submit', protect, submitAttendance);

// Admin: view attendance records
router.get('/records', protect, adminOrStaff, getAttendanceRecords);

module.exports = router;
