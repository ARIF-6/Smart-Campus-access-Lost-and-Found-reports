const Notification = require('../models/Notification');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = asyncHandler(async (req, res) => {
  const { role, id } = req.user;

  // Build query
  // Show notifications for the specific user OR for the user's role (where userId is null)
  const query = {
    $or: [
      { userId: id },
      { userId: null, recipientRole: role },
      { userId: null, recipientRole: 'all' }
    ]
  };

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return sendSuccess(res, 'Notifications fetched successfully', notifications);
});

// @desc    Get unread notifications count
// @route   GET /api/notifications/unread-count
// @access  Private
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const { role, id } = req.user;

  const count = await Notification.countDocuments({
    $or: [
      { userId: id },
      { userId: null, recipientRole: role },
      { userId: null, recipientRole: 'all' }
    ],
    isRead: false
  });

  return sendSuccess(res, 'Unread count fetched successfully', { count });
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    return res.status(404).json({ success: false, message: 'Notification not found' });
  }

  notification.isRead = true;
  await notification.save();

  return sendSuccess(res, 'Notification marked as read');
});

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllRead = asyncHandler(async (req, res) => {
  const { role, id } = req.user;

  await Notification.updateMany(
    {
      $or: [
        { userId: id },
        { userId: null, recipientRole: role }
      ],
      isRead: false
    },
    { isRead: true }
  );

  return sendSuccess(res, 'All notifications marked as read');
});

const { emitNotification } = require('../socket/events/notificationEvents');

// Helper function to create notifications (internal use)
exports.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    
    // Emit real-time socket event
    emitNotification(notification);
    
    return notification;
  } catch (error) {
    console.error('Notification creation error:', error);
    return null;
  }
};
