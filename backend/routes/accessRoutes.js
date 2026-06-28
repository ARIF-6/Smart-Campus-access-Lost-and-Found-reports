const express = require('express');
const router = express.Router();
const { scanQRCode, getLogs, getLiveStatus } = require('../controllers/accessController');

// Middleware
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const { checkShiftWindow } = require('../middleware/shiftTimeMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.use(protect);

// @route   POST /api/access/scan
// @access  Security, Admin
router.post('/scan', allowRoles('security', 'admin', 'staff'), checkShiftWindow, [
  body().custom((value) => {
    if (value?.qrData || value?.qrCode || value?.studentId || value?.userId) return true;
    throw new Error('QR code, QR data, Student ID, or User ID is required');
  }),
  body('status', 'Status must be IN or OUT').optional({ nullable: true }).isIn(['IN', 'OUT']),
  validate
], scanQRCode);

// @route   GET /api/access/logs
// @access  Admin, Staff, Security
router.get('/logs', allowRoles('admin', 'staff', 'security'), getLogs);

// @route   GET /api/access/live-status
// @access  Security, Admin, Staff
router.get('/live-status', allowRoles('admin', 'staff', 'security'), getLiveStatus);

module.exports = router;
