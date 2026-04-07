const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getUserProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.post(
  '/register',
  [
    body('name', 'Name is required').notEmpty().trim().escape(),
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    validate
  ],
  registerUser
);

router.post(
  '/login',
  [
    body('email', 'Please include a valid email').isEmail().normalizeEmail(),
    body('password', 'Password is required').notEmpty(),
    validate
  ],
  loginUser
);
router.get('/profile', protect, getUserProfile);

module.exports = router;
