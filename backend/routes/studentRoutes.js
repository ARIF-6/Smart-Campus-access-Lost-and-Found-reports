const express = require('express');
const router = express.Router();

const { getStudentDashboard, getLostItems } = require('../controllers/studentController');
const { protect } = require('../middleware/authMiddleware');
const { studentOnly } = require('../middleware/roleMiddleware');

// Route protection: authMiddleware (protect) -> roleMiddleware (studentOnly)
router.get('/dashboard', protect, studentOnly, getStudentDashboard);
router.get('/lost-items', protect, studentOnly, getLostItems);

module.exports = router;
