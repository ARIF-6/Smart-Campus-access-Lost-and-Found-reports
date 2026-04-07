const express = require('express');
const router = express.Router();

const { reportFoundItem } = require('../controllers/cleanerController');
const { protect } = require('../middleware/authMiddleware');
const { cleanerOnly } = require('../middleware/roleMiddleware');

// Route protection: authMiddleware (protect) -> roleMiddleware (cleanerOnly)
router.post('/found-items', protect, cleanerOnly, reportFoundItem);

module.exports = router;
