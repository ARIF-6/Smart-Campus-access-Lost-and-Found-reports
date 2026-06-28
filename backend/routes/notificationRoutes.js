const express = require('express');
const router = express.Router();
const { 
  getNotifications, 
  markAsRead, 
  markAllRead,
  getUnreadCount
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.get('/user', getNotifications); // Alias for frontend compatibility
router.get('/unread-count', getUnreadCount);
router.put('/read-all', markAllRead);
router.put('/:id/read', markAsRead);

module.exports = router;
