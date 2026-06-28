const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

const { getTrashedUsers } = require('../controllers/userManagementController');
const { getTrashedLostItems } = require('../controllers/lostItemController');
const { getTrashedFoundItems } = require('../controllers/foundItemController');
const { getTrashedClaims } = require('../controllers/claimController');
const { getTrashedAnnouncements } = require('../controllers/announcementController');

// All trash routes are Admin Only
router.use(protect, adminOnly);

router.get('/users', getTrashedUsers);
router.get('/lost-items', getTrashedLostItems);
router.get('/found-items', getTrashedFoundItems);
router.get('/claims', getTrashedClaims);
router.get('/announcements', getTrashedAnnouncements);

module.exports = router;
