const express = require('express');
const router = express.Router();
const {
  getAllDisputes,
  getDisputeById,
  resolveDispute,
  getItemOwnershipHistory
} = require('../controllers/ownershipDisputeController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

router.use(protect);
router.use(allowRoles('admin'));

router.get('/', getAllDisputes);
router.get('/history/:itemId', getItemOwnershipHistory);
router.get('/:id', getDisputeById);
router.post('/:id/resolve', resolveDispute);

module.exports = router;
