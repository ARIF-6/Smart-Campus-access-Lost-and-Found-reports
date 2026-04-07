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
const { adminOnly } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/', adminOnly, getAllMatches);
router.post('/recalculate', adminOnly, triggerRecalculate);
router.get('/lost/:lostItemId', getMatchesForLostItem);
router.get('/found/:foundItemId', getMatchesForFoundItem);
router.patch('/:id/status', adminOnly, updateMatchStatus);
router.delete('/:id', adminOnly, deleteMatch);

module.exports = router;
