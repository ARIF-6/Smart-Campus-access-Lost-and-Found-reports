const express = require('express');
const router = express.Router();
const {
  getStats,
  getLostVsFound,
  getCategories,
  getActivityLine,
  getRecentActivity
} = require('../controllers/dashboardController');

const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(adminOnly);

router.get('/stats', getStats);
router.get('/lost-vs-found', getLostVsFound);
router.get('/categories', getCategories);
router.get('/activity', getActivityLine);
router.get('/recent-activity', getRecentActivity);

module.exports = router;
