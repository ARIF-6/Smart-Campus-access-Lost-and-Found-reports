const express = require('express');
const router = express.Router();
const { scanQRCode, getLogs } = require('../controllers/accessController');

// Middleware
const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles, adminOnly } = require('../middleware/roleMiddleware');

router.use(protect);

// @route   POST /api/access/scan
// @access  Security, Admin
router.post('/scan', authorizeRoles('security', 'admin'), scanQRCode);

// @route   GET /api/access/logs
// @access  Admin only
router.get('/logs', adminOnly, getLogs);

module.exports = router;
