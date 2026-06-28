const express = require('express');
const router = express.Router();
const { 
  exportLostItems, 
  exportClaims, 
  exportUsersCount,
  getAllSystemReports
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

// All report routes require admin/staff privileges
router.use(protect, allowRoles('admin', 'staff'));

router.get('/lost-items', exportLostItems);
router.get('/claims', exportClaims);
router.get('/users', exportUsersCount);
router.get('/system', getAllSystemReports);

module.exports = router;
