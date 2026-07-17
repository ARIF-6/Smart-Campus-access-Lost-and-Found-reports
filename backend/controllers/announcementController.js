const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { logAction } = require('../utils/auditLogger');
const { getIO } = require('../utils/socket');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Create a new announcement
// @route   POST /api/announcements
// @access  Private/Admin or Staff
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, targetRoles, recipientType, recipientUserId } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const { createNotification } = require('./notificationController');

    // ── Specific-student branch ──────────────────────────────────────────────
    if (recipientType === 'specific_student') {
      if (!recipientUserId) {
        return res.status(400).json({ message: 'recipientUserId is required for specific_student announcements' });
      }

      const recipient = await User.findOne({ _id: recipientUserId, role: 'student', isDeleted: { $ne: true } });
      if (!recipient) {
        return res.status(400).json({ message: 'The selected student could not be found or is no longer active.' });
      }

      const announcement = await Announcement.create({
        title,
        message,
        targetRoles: ['student'],
        recipientType: 'specific_student',
        recipientUserId: recipient._id,
        createdBy: req.user.id
      });

      // Notify only the specific student
      await createNotification({
        title: `Announcement: ${title}`,
        message,
        type: 'GENERAL',
        userId: recipient._id,
        recipientRole: null,
        module: 'General',
        relatedId: announcement._id
      });

      // Real-time: emit only to that user's socket room
      const io = getIO();
      if (io) {
        io.to(`user:${recipient._id}`).emit('new_announcement', {
          _id: announcement._id,
          title: announcement.title,
          message: announcement.message,
          targetRoles: announcement.targetRoles,
          recipientType: 'specific_student',
          createdAt: announcement.createdAt
        });
      }

      await logAction({
        userId: req.user.id,
        action: 'CREATE_ANNOUNCEMENT',
        targetId: announcement._id,
        targetType: 'Other',
        details: `Created personal announcement for student ${recipient.studentId || recipient._id}: ${title}`,
        req
      });

      return res.status(201).json(announcement);
    }

    // ── Broadcast / legacy branch ────────────────────────────────────────────
    const finalRecipientType = recipientType === 'all_students' ? 'all_students' : null;
    const announcement = await Announcement.create({
      title,
      message,
      targetRoles: targetRoles || ['all'],
      recipientType: finalRecipientType,
      recipientUserId: null,
      createdBy: req.user.id
    });

    const roles = targetRoles && targetRoles.length > 0 ? targetRoles : ['all'];
    for (let role of roles) {
      if (role === 'clean') {
        await createNotification({ title: `Announcement: ${title}`, message, type: 'GENERAL', recipientRole: 'clean',   userId: null, module: 'General', relatedId: announcement._id });
        await createNotification({ title: `Announcement: ${title}`, message, type: 'GENERAL', recipientRole: 'cleaner', userId: null, module: 'General', relatedId: announcement._id });
      } else {
        await createNotification({ title: `Announcement: ${title}`, message, type: 'GENERAL', recipientRole: role, userId: null, module: 'General', relatedId: announcement._id });
      }
    }

    await logAction({
      userId: req.user.id,
      action: 'CREATE_ANNOUNCEMENT',
      targetId: announcement._id,
      targetType: 'Other',
      details: `Created announcement: ${announcement.title}`,
      req
    });

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
      // Students see: role-broadcast announcements AND personal announcements addressed to them
      const orClauses = [
        { targetRoles: 'all' },
        { targetRoles: userRole }
      ];
      if (userRole === 'student') {
        orClauses.push({ recipientType: 'specific_student', recipientUserId: req.user.id });
      }
      queryConditions.$or = orClauses;
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

// @desc    Get all students (for specific-student picker)
// @route   GET /api/announcements/students
// @access  Private/Admin or Staff
exports.getStudentList = async (req, res) => {
  try {
    const search = (req.query.search || '').trim();
    const filter = {
      role: 'student',
      isDeleted: { $ne: true },
      isActive: { $ne: false }
    };
    if (search) {
      filter.$or = [
        { studentId: { $regex: search, $options: 'i' } },
        { fullName:  { $regex: search, $options: 'i' } }
      ];
    }
    const students = await User
      .find(filter)
      .select('_id fullName studentId photoUrl faculty department class')
      .populate('faculty',    'name')
      .populate('department', 'name')
      .populate('class',      'name')
      .sort({ fullName: 1 })
      .limit(100)
      .lean();
    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
