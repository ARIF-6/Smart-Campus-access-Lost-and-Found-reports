const express = require('express');
const router = express.Router();

const {
  reportFoundItem,
  getAllFoundItems,
  getMyFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem,
  markItemReturned,
  linkLostItem,
  restoreFoundItem,
  permanentDeleteFoundItem
} = require('../controllers/foundItemController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles, adminOnly } = require('../middleware/roleMiddleware');

const upload = require('../middleware/uploadMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.route('/')
  .post(
    protect, 
    allowRoles('admin', 'security', 'clean', 'staff', 'student'), 
    upload.single('image'),
    [
      body('title', 'Title is required').notEmpty().trim().escape(),
      body('description', 'Description is required').notEmpty().trim().escape(),
      body('category', 'Category is required').notEmpty().trim().escape(),
      body('locationFound', 'Location found is required').notEmpty().trim().escape(),
      validate
    ],
    reportFoundItem
  )
  .get(protect, getAllFoundItems);

router.get('/my', protect, getMyFoundItems);

router.route('/:id')
  .get(protect, getFoundItemById)
  .put(
    protect, 
    allowRoles('admin', 'security', 'staff', 'clean'), 
    [
      body('title', 'Title is required').optional().notEmpty().trim().escape(),
      body('category', 'Category is required').optional().notEmpty().trim().escape(),
      body('locationFound', 'Location is required').optional().notEmpty().trim().escape(),
      validate
    ],
    updateFoundItem
  )
  .delete(protect, allowRoles('admin', 'staff', 'security', 'clean'), deleteFoundItem);

router.patch('/:id/restore', protect, adminOnly, restoreFoundItem);
router.delete('/:id/permanent', protect, adminOnly, permanentDeleteFoundItem);

router.route('/:id/returned')
  .patch(protect, allowRoles('admin', 'staff', 'security', 'clean'), markItemReturned);

router.route('/:id/link-lost')
  .patch(protect, allowRoles('admin', 'security', 'staff', 'clean'), linkLostItem);

module.exports = router;
