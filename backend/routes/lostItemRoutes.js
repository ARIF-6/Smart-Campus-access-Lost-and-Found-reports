const express = require('express');
const router = express.Router();

const {
  reportLostItem,
  getAllLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem
} = require('../controllers/lostItemController');

const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles, adminOnly } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.route('/')
  .post(
    protect, 
    authorizeRoles('student', 'admin'), 
    upload.single('image'),
    [
      body('title', 'Title is required').notEmpty().trim().escape(),
      body('category', 'Category is required').notEmpty().trim().escape(),
      body('locationLost', 'Location is required').notEmpty().trim().escape(),
      body('dateLost', 'Date lost is required').notEmpty().isISO8601(),
      validate
    ],
    reportLostItem
  )
  .get(protect, getAllLostItems);

router.route('/:id')
  .get(protect, getLostItemById)
  .put(
    protect, 
    authorizeRoles('student', 'admin'), 
    [
      body('title', 'Title is required').optional().notEmpty().trim().escape(),
      body('category', 'Category is required').optional().notEmpty().trim().escape(),
      body('locationLost', 'Location is required').optional().notEmpty().trim().escape(),
      validate
    ],
    updateLostItem
  )
  .delete(protect, adminOnly, deleteLostItem);

module.exports = router;
