const express = require('express');
const router = express.Router();
const { 
  createAnnouncement, 
  getAnnouncements, 
  deleteAnnouncement,
  restoreAnnouncement,
  permanentDeleteAnnouncement
} = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');
const { adminOnly, adminOrStaff } = require('../middleware/roleMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// All routes require authentication
router.use(protect);

router.route('/')
  .get(getAnnouncements)
  .post(adminOrStaff, [
    body('title', 'Title is required').notEmpty().trim().escape(),
    body('message', 'Message is required').notEmpty().trim().escape(),
    body('targetRoles', 'Target Roles are required').notEmpty(),
    validate
  ], createAnnouncement);

router.route('/:id')
  .delete(adminOrStaff, deleteAnnouncement);

router.patch('/:id/restore', adminOrStaff, restoreAnnouncement);
router.delete('/:id/permanent', adminOnly, permanentDeleteAnnouncement);

module.exports = router;
