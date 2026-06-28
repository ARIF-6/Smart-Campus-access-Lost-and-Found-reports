const express = require('express');
const router = express.Router();
const {
  getAllMatches,
  getMatchesForLostItem,
  getMatchesForFoundItem,
  triggerRecalculate,
  updateMatchStatus,
  deleteMatch
} = require('../controllers/matchController');

const { protect } = require('../middleware/authMiddleware');
const { adminOnly, allowRoles } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', allowRoles('admin', 'staff', 'security'), getAllMatches);
router.post('/recalculate', allowRoles('admin', 'staff', 'security'), triggerRecalculate);
router.get('/lost/:lostItemId', getMatchesForLostItem);
router.get('/found/:foundItemId', getMatchesForFoundItem);
router.patch('/:id/status', allowRoles('admin', 'staff', 'security'), updateMatchStatus);
router.delete('/:id', allowRoles('admin', 'staff', 'security'), deleteMatch);

module.exports = router;
