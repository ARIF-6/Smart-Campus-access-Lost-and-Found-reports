const express = require('express');
const router = express.Router();

const {
  reportLostItem,
  getAllLostItems,
  getMyLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem,
  restoreLostItem,
  permanentDeleteLostItem
} = require('../controllers/lostItemController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles, adminOnly } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.route('/')
  .post(
    protect, 
    allowRoles('student', 'admin', 'staff'), 
    upload.lostFound.single('image'),
    [
      body('title', 'Title is required').notEmpty().trim().escape(),
      body('description', 'Description is required').notEmpty().trim().escape(),
      body('category', 'Category is required').notEmpty().trim().escape(),
      body('locationLost').custom((value, { req }) => {
        const loc = req.body.locationLost || req.body.location;
        if (!loc || !loc.trim()) {
          throw new Error('Location is required');
        }
        return true;
      }),
      validate
    ],
    reportLostItem
  )
  .get(protect, getAllLostItems);

router.get('/my', protect, getMyLostItems);

router.route('/:id')
  .get(protect, getLostItemById)
  .put(
    protect, 
    allowRoles('student', 'admin', 'staff', 'security'),
    upload.lostFound.single('image'),
    [
      body('title', 'Title is required').optional().notEmpty().trim().escape(),
      body('category', 'Category is required').optional().notEmpty().trim().escape(),
      body('locationLost', 'Location is required').optional().notEmpty().trim().escape(),
      validate
    ],
    updateLostItem
  )
  .delete(protect, allowRoles('admin', 'staff', 'security'), deleteLostItem);

router.patch('/:id/restore', protect, adminOnly, restoreLostItem);
router.delete('/:id/permanent', protect, adminOnly, permanentDeleteLostItem);

module.exports = router;
