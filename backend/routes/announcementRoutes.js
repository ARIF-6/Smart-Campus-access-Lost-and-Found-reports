const express = require('express');
const router = express.Router();
const { 
  createAnnouncement, 
  getAnnouncements, 
  deleteAnnouncement,
  restoreAnnouncement,
  permanentDeleteAnnouncement,
  getStudentList
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
    validate
  ], createAnnouncement);

// Student list for specific-student picker (must be before /:id)
router.get('/students', adminOrStaff, getStudentList);

router.route('/:id')
  .delete(adminOrStaff, deleteAnnouncement);

router.patch('/:id/restore', adminOrStaff, restoreAnnouncement);
router.delete('/:id/permanent', adminOnly, permanentDeleteAnnouncement);

module.exports = router;
