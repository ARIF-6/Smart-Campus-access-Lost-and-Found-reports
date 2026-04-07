const express = require('express');
const router = express.Router();

const { verifyStudentAccess, getAccessLog } = require('../controllers/securityController');
const { protect } = require('../middleware/authMiddleware');
const { securityOnly } = require('../middleware/roleMiddleware');

// Route protection: authMiddleware (protect) -> roleMiddleware (securityOnly)
router.post('/scan', protect, securityOnly, verifyStudentAccess);
router.get('/access-log', protect, securityOnly, getAccessLog);

module.exports = router;
