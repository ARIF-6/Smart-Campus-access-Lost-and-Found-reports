const express = require('express');
const router = express.Router();
const { getAuditLogs } = require('../controllers/auditController');
const { protect } = require('../middleware/authMiddleware');

// All authenticated users can access their own audit logs
// Admin can see all logs
router.get('/', protect, getAuditLogs);

module.exports = router;

