const express = require('express');
const router = express.Router();

const {
  submitClaim,
  getAllClaims,
  getMyClaims,
  getClaimById,
  updateClaimStatus,
  approveClaim,
  rejectClaim
} = require('../controllers/claimController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');
const upload = require('../utils/upload')('claims');

router.post('/', protect, upload.single('proofImage'), (req, res, next) => {
  // Normalize fields between mobile app (itemId, message) and web app (foundItemId, proof/proofDescription)
  if (req.body.itemId && !req.body.foundItemId) {
    req.body.foundItemId = req.body.itemId;
  }
  if (req.body.foundItemId && !req.body.itemId) {
    req.body.itemId = req.body.foundItemId;
  }
  
  if (req.body.message && !req.body.proofDescription) {
    req.body.proofDescription = req.body.message;
  }
  if (req.body.proof && !req.body.proofDescription) {
    req.body.proofDescription = req.body.proof;
  }
  if (req.body.proofDescription && !req.body.message) {
    req.body.message = req.body.proofDescription;
  }
  if (req.body.proof && !req.body.message) {
    req.body.message = req.body.proof;
  }
  
  next();
}, submitClaim);

router.get('/my', protect, getMyClaims);
router.get('/', protect, allowRoles('admin', 'staff', 'security', 'clean'), getAllClaims);
router.get('/:id', protect, getClaimById);

router.put('/:id', protect, allowRoles('admin', 'staff', 'security', 'clean'), [
  body('status', 'Status is required').notEmpty().isIn(['pending', 'approved', 'rejected']),
  validate
], updateClaimStatus);

router.patch('/:id/approve', protect, allowRoles('admin', 'staff', 'security', 'clean'), approveClaim);
router.patch('/:id/reject', protect, allowRoles('admin', 'staff', 'security', 'clean'), [
  body('rejectionReason', 'Rejection reason is required').notEmpty().trim().escape(),
  validate
], rejectClaim);

module.exports = router;

