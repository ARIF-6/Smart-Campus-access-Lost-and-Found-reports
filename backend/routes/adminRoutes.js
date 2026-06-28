const express = require('express');
const router = express.Router();

const { 
  getDashboardStats, 
  getRecentUsers, 
  getRecentLostItems, 
  getRecentFoundItems 
} = require('../controllers/adminController');

const { protect } = require('../middleware/authMiddleware');
const { adminOrStaff } = require('../middleware/roleMiddleware');

/* Route protection: authMiddleware (protect) -> roleMiddleware (adminOrStaff) */
router.use(protect, adminOrStaff);

router.get('/stats', getDashboardStats);
router.get('/recent-users', getRecentUsers);
router.get('/recent-lost-items', getRecentLostItems);
router.get('/recent-found-items', getRecentFoundItems);

module.exports = router;
