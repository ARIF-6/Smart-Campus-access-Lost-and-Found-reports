const express = require('express');
const router = express.Router();

const {
  submitClaim,
  getAllClaims,
  getMyClaims,
  updateClaimStatus
} = require('../controllers/claimController');

const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const upload = require('../middleware/upload');

// Define specific path logic first
const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// Define specific path logic first
router.get('/my', protect, authorizeRoles('student'), getMyClaims);

router.post(
  '/', 
  protect, 
  authorizeRoles('student'), 
  upload.single('proof'), 
  [
    body('foundItemId', 'Found Item ID is required').notEmpty().isMongoId(),
    validate
  ],
  submitClaim
);

router.get('/', protect, authorizeRoles('admin'), getAllClaims);

router.put(
  '/:id', 
  protect, 
  authorizeRoles('admin'), 
  [
    body('status', 'Status is required and must be APPROVED or REJECTED')
      .notEmpty()
      .isIn(['APPROVED', 'REJECTED']),
    validate
  ],
  updateClaimStatus
);

module.exports = router;
