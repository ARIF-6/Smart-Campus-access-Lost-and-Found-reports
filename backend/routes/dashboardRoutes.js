const express = require('express');
const router = express.Router();
const {
  getStats,
  getLostVsFound,
  getCategories,
  getActivityLine,
  getRecentActivity,
  getSystemStatus
} = require('../controllers/dashboardController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

router.get('/system-status', getSystemStatus);

// Apply auth middleware for protected routes
router.use(protect);
router.use(allowRoles('admin', 'staff'));

router.get('/stats', getStats);
router.get('/lost-vs-found', getLostVsFound);
router.get('/categories', getCategories);
router.get('/activity', getActivityLine);
router.get('/recent-activity', getRecentActivity);


module.exports = router;
