const Announcement = require('../models/Announcement');
const { logAction } = require('../utils/auditLogger');
const { getIO } = require('../utils/socket');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private/Admin
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, targetRoles } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const announcement = await Announcement.create({
      title,
      message,
      targetRoles: targetRoles || ['all'],
      createdBy: req.user.id
    });

    // Create notifications for the target roles
    const { createNotification } = require('./notificationController');
    const roles = targetRoles && targetRoles.length > 0 ? targetRoles : ['all'];
    
    for (let role of roles) {
      // Map 'clean' to 'clean' or 'cleaner' to be compatible with both
      if (role === 'clean') {
        // Create notification for 'clean'
        await createNotification({
          title: `Announcement: ${title}`,
          message: message,
          type: 'GENERAL',
          recipientRole: 'clean',
          userId: null,
          module: 'General',
          relatedId: announcement._id
        });
        // Also create for 'cleaner' just in case
        await createNotification({
          title: `Announcement: ${title}`,
          message: message,
          type: 'GENERAL',
          recipientRole: 'cleaner',
          userId: null,
          module: 'General',
          relatedId: announcement._id
        });
      } else {
        await createNotification({
          title: `Announcement: ${title}`,
          message: message,
          type: 'GENERAL',
          recipientRole: role,
          userId: null,
          module: 'General',
          relatedId: announcement._id
        });
      }
    }

    // Log the action
    await logAction({
      userId: req.user.id,
      action: 'CREATE_ANNOUNCEMENT',
      targetId: announcement._id,
      targetType: 'Other',
      details: `Created announcement: ${announcement.title}`,
      req
    });

    // Emit socket event
    const io = getIO();
    if (io) {
      io.emit('new_announcement', {
        _id: announcement._id,
        title: announcement.title,
        message: announcement.message,
        targetRoles: announcement.targetRoles,
        createdAt: announcement.createdAt
      });
    }

    res.status(201).json(announcement);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get announcements for the current user
// @route   GET /api/announcements
// @access  Private
exports.getAnnouncements = async (req, res) => {
  try {
    const userRole = req.user.role;

    const queryConditions = {
      isActive: true,
      isDeleted: { $ne: true }
    };

    if (userRole !== 'admin' && userRole !== 'staff') {
      queryConditions.$or = [
        { targetRoles: 'all' },
        { targetRoles: userRole }
      ];
    }

    const baseQuery = Announcement.find(queryConditions);
    const total = await Announcement.countDocuments(queryConditions);

    const apiFeatures = new APIFeatures(
      baseQuery,
      req.query,
      ['title', 'message']
    )
      .search()
      .filter()
      .sort()
      .pagination();

    const announcements = await apiFeatures.query.populate('createdBy', 'fullName name email');
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    res.status(200).json({
      results: announcements,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete announcement (Soft Delete)
// @route   DELETE /api/announcements/:id
// @access  Private/Admin
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    // Permanently delete the announcement
    await Announcement.findByIdAndDelete(req.params.id);
    // Log audit for permanent delete
    await logAction({
      userId: req.user.id,
      action: 'PERMANENT_DELETE',
      targetId: announcement._id,
      targetType: 'Other',
      details: `Permanently deleted announcement: ${announcement.title}`,
      req
    });
    return res.status(200).json({ message: 'Announcement permanently deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Restore soft deleted announcement
// @route   PATCH /api/announcements/:id/restore
// @access  Private/Admin
exports.restoreAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    announcement.isDeleted = false;
    announcement.deletedAt = null;
    await announcement.save();

    // Log audit
    await logAction({
      userId: req.user.id,
      action: 'RESTORE',
      targetId: announcement._id,
      targetType: 'Other',
      details: `Restored announcement: ${announcement.title}`,
      req
    });

    res.status(200).json({ message: 'Announcement restored successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Permanently delete announcement
// @route   DELETE /api/announcements/:id/permanent
// @access  Private/Admin
exports.permanentDeleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    // Log audit
    await logAction({
      userId: req.user.id,
      action: 'PERMANENT_DELETE',
      targetId: announcement._id,
      targetType: 'Other',
      details: `Permanently deleted announcement: ${announcement.title}`,
      req
    });

    res.status(200).json({ message: 'Announcement permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get trashed announcements
// @route   GET /api/trash/announcements
// @access  Private/Admin
exports.getTrashedAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find({ isDeleted: true }).sort({ deletedAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
