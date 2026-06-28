const express = require('express');
const router = express.Router();
const { registerUser, loginUser, logoutUser, getUserProfile, updateProfilePicture } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { adminOrStaff } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.post(
  '/register',
  [
    protect,
    adminOrStaff,
    body('fullName', 'Full Name is required').notEmpty().trim().escape(),
    body('email', 'Please include a valid email').isEmail(),
    body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
    validate
  ],
  registerUser
);

router.post(
  '/login',
  [
    body('email', 'Username, Student ID, or Email is required').notEmpty(),
    body('password', 'Password is required').notEmpty(),
    validate
  ],
  loginUser
);
router.get('/profile', protect, getUserProfile);
router.post('/logout', protect, logoutUser);
router.put('/profile-picture', protect, upload.profiles.single('profilePicture'), updateProfilePicture);

module.exports = router;
