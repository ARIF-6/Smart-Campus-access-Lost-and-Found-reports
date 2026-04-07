const express = require('express');
const router = express.Router();

const {
  reportFoundItem,
  getAllFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem,
  markItemReturned,
  linkLostItem
} = require('../controllers/foundItemController');

const { protect } = require('../middleware/authMiddleware');
const { authorizeRoles, adminOnly } = require('../middleware/roleMiddleware');

const upload = require('../middleware/uploadMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.route('/')
  .post(
    protect, 
    authorizeRoles('admin', 'security', 'cleaner'), 
    upload.single('image'),
    [
      body('title', 'Title is required').notEmpty().trim().escape(),
      body('category', 'Category is required').notEmpty().trim().escape(),
      body('locationFound', 'Location found is required').notEmpty().trim().escape(),
      validate
    ],
    reportFoundItem
  )
  .get(protect, getAllFoundItems);

router.route('/:id')
  .get(protect, getFoundItemById)
  .put(
    protect, 
    authorizeRoles('admin', 'security'), 
    [
      body('title', 'Title is required').optional().notEmpty().trim().escape(),
      body('category', 'Category is required').optional().notEmpty().trim().escape(),
      body('locationFound', 'Location is required').optional().notEmpty().trim().escape(),
      validate
    ],
    updateFoundItem
  )
  .delete(protect, adminOnly, deleteFoundItem);

router.route('/:id/returned')
  .patch(protect, adminOnly, markItemReturned);

router.route('/:id/link-lost')
  .patch(protect, authorizeRoles('admin', 'security'), linkLostItem);

module.exports = router;
