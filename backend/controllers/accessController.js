const AccessLog = require('../models/AccessLog');
const User = require('../models/User');
const Blacklist = require('../models/Blacklist');
const Shift = require('../models/Shift');
const { logAction } = require('../utils/auditLogger');
const { createNotification } = require('./notificationController');
const { getIO } = require('../socket');
const { emitDashboardRefresh, emitNotification } = require('../socket/events/notificationEvents');
const { checkAndGenerateDailyNoExitReports } = require('../utils/reportHelper');

// @desc    Scan QR Code for Campus Access
// @route   POST /api/access/scan
// @access  Private (Security, Admin)
exports.scanQRCode = async (req, res) => {
  try {
    await checkAndGenerateDailyNoExitReports();
    const { studentId, userId, method, status } = req.body;
    const qrCode = req.body.qrCode || req.body.qrData;
    const requestedStatus = status === 'IN' || status === 'OUT' ? status : null;

    if (!studentId && !userId && !qrCode) {
      return res.status(400).json({
        status: 'Error',
        color: 'red',
        message: 'Missing studentId, qrCode or userId in request body',
      });
    }

    // Look up user by qrCode OR studentId OR by _id
    let user = null;
    if (qrCode) {
      user = await User.findOne({ qrCode });
      if (!user) {
        user = await User.findOne({ studentId: qrCode });
      }
    }
    if (!user && studentId) {
      user = await User.findOne({ studentId });
    }
    if (!user && userId) {
      user = await User.findById(userId);
    }

    if (!user) {
      return res.status(404).json({
        status: 'Access Denied',
        color: 'red',
        message: 'Student not found. Invalid QR code.',
        student: null,
      });
    }

    // ── Blacklist check ──────────────────────────────────
    const blacklisted = await Blacklist.findOne({
      isActive: true,
      $or: [
        { studentId: user.studentId },
        { qrCode: user.qrCode },
      ]
    });
    if (blacklisted) {
      const io = getIO();
      if (io) {
        io.to('role:security').to('role:admin').emit('security:alert', {
          title: 'Blacklist Alert',
          message: `⚠️ ALERT: ${user.fullName} is BLACKLISTED. Reason: ${blacklisted.reason}`,
          severity: 'banned',
          user: { name: user.fullName, studentId: user.studentId }
        });

        // Also create a persistent notification
        await createNotification({
          recipientRole: 'security',
          title: 'Security Alert: Blacklist',
          message: `${user.fullName} attempted entry. Reason: ${blacklisted.reason}`,
          type: 'SECURITY_ALERT',
          module: 'Security'
        });
      }
      return res.status(403).json({
        status: 'BLACKLISTED',
        color: 'red',
        message: `⚠️ ALERT: ${user.fullName} is BLACKLISTED. Reason: ${blacklisted.reason}`,
        student: { name: user.fullName, studentId: user.studentId || '', photoUrl: user.photoUrl || '' },
        blacklist: { reason: blacklisted.reason, severity: 'banned' },
      });
    }
    // ─────────────────────────────────────────────────────

    const studentPayload = {
      name: user.fullName || user.name || 'Unknown',
      studentId: user.studentId || '',
      major: user.address || '',
      photoUrl: user.photoUrl || '',
    };

    // Find latest AccessLog for that user
    const lastLog = await AccessLog.findOne({ userId: user._id }).sort({ createdAt: -1 });
    const now = new Date();

    if (user.role !== 'student') {
      return res.status(400).json({
        status: 'Access Denied',
        color: 'red',
        message: 'Only student QR codes or Student IDs can be scanned here.',
        student: studentPayload,
      });
    }

    const notifyAccess = async (log, nextStatus) => {
      const title = nextStatus === 'IN' ? 'Campus Entry' : 'Campus Exit';
      const actionLabel = nextStatus === 'IN' ? 'entered' : 'exited';
      const message = `${studentPayload.name} has ${actionLabel} the campus.`;
      await createNotification({ recipientRole: 'admin', title, message, type: 'ACCESS_LOG', relatedId: log._id });
      await createNotification({ recipientRole: 'staff', title, message, type: 'ACCESS_LOG', relatedId: log._id });
    };

    const finishAccess = async (nextStatus) => {
      if (nextStatus === 'IN') {
        if (lastLog?.status === 'IN') {
          return res.status(200).json({
            status: 'Already Inside',
            color: 'green',
            message: `${studentPayload.name} already has an active campus entry.`,
            student: studentPayload,
          });
        }

        const newLog = await AccessLog.create({
          userId: user._id,
          entryTime: now,
          status: 'IN',
          campus: req.user?.campus || null,
          scannedBy: req.user?.id || null
        });
        await notifyAccess(newLog, 'IN');
        await logAction({
          userId: req.user.id,
          action: 'SCAN_QR',
          targetId: user._id,
          targetType: 'User',
          details: `Recorded entry for ${user.email} via ${method || 'QR'}`,
          req,
        });
        emitDashboardRefresh('security');
        emitDashboardRefresh('admin');
        return res.status(200).json({
          status: 'Access Granted',
          color: 'green',
          message: `Entry recorded for ${studentPayload.name}`,
          student: studentPayload,
        });
      }

      if (!lastLog || lastLog.status !== 'IN') {
        return res.status(400).json({
          status: 'No Active Entry',
          color: 'red',
          message: `${studentPayload.name} does not have an active entry to exit from.`,
          student: studentPayload,
        });
      }

      lastLog.exitTime = now;
      lastLog.status = 'OUT';
      await lastLog.save();
      await notifyAccess(lastLog, 'OUT');
      await logAction({
        userId: req.user.id,
        action: 'SCAN_QR',
        targetId: user._id,
        targetType: 'User',
        details: `Recorded exit for ${user.email} via ${method || 'QR'}`,
        req,
      });
      emitDashboardRefresh('security');
      emitDashboardRefresh('admin');
      return res.status(200).json({
        status: 'Exit Recorded',
        color: 'yellow',
        message: `Exit recorded for ${studentPayload.name}`,
        student: studentPayload,
      });
    };

    if (requestedStatus === 'IN' || requestedStatus === 'OUT') {
      return finishAccess(requestedStatus);
    }

    return finishAccess(lastLog?.status === 'IN' ? 'OUT' : 'IN');

    // No previous log → first entry
    if (!lastLog) {
      await AccessLog.create({ userId: user._id, entryTime: now, status: 'IN' });
      return res.status(200).json({
        status: 'Access Granted',
        color: 'green',
        message: `Entry recorded for ${studentPayload.name}`,
        student: studentPayload,
      });
    }

    // Last status was IN → record exit on same log
    if (lastLog.status === 'IN') {
      lastLog.exitTime = now;
      lastLog.status = 'OUT';
      await lastLog.save();

      // Notify Admins & Staff
      const exitMsg = `${studentPayload.name} has exited the campus.`;
      await createNotification({ recipientRole: 'admin', title: 'Campus Exit', message: exitMsg, type: 'ACCESS_LOG', relatedId: lastLog._id });
      await createNotification({ recipientRole: 'staff', title: 'Campus Exit', message: exitMsg, type: 'ACCESS_LOG', relatedId: lastLog._id });

      return res.status(200).json({
        status: 'Exit Recorded',
        color: 'yellow',
        message: `Exit recorded for ${studentPayload.name}`,
        student: studentPayload,
      });
    }

    // Last status was OUT → new entry
    const newLog = await AccessLog.create({ userId: user._id, entryTime: now, status: 'IN' });

    // Notify Admins & Staff
    const entryMsg = `${studentPayload.name} has entered the campus.`;
    await createNotification({ recipientRole: 'admin', title: 'Campus Entry', message: entryMsg, type: 'ACCESS_LOG', relatedId: newLog._id });
    await createNotification({ recipientRole: 'staff', title: 'Campus Entry', message: entryMsg, type: 'ACCESS_LOG', relatedId: newLog._id });

    await logAction({
      userId: req.user.id,
      action: 'SCAN_QR',
      targetId: user._id,
      targetType: 'User',
      details: `Scanned QR for user ${user.email} (Entry) via ${method || 'QR'}`,
      req,
    });

    // Refresh security dashboards
    emitDashboardRefresh('security');
    emitDashboardRefresh('admin');

    return res.status(200).json({
      status: 'Access Granted',
      color: 'green',
      message: `Entry recorded for ${studentPayload.name}`,
      student: studentPayload,
    });

  } catch (error) {
    console.error('Scan QR Error:', error);
    res.status(500).json({
      status: 'Error',
      color: 'red',
      message: 'Server error. Please try again.',
    });
  }
};

// @desc    Get all access logs
// @route   GET /api/access/logs
// @access  Private (Admin, Staff, Security)
exports.getLogs = async (req, res) => {
  try {
    await checkAndGenerateDailyNoExitReports();

    let query = {};

    // 1. Date filter — only apply when a specific date is provided.
    //    Build UTC midnight boundaries so the filter works regardless of server timezone.
    //    If no date is given (All Time mode), skip date filtering entirely.
    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00.000Z`);
      const end   = new Date(`${req.query.date}T23:59:59.999Z`);
      // Match on entryTime OR createdAt so we never miss a record
      query.$or = [
        { entryTime: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } }
      ];
    }

    // 2. Campus-scoping: staff see only logs from their campus.
    //    Superadmin and admin see ALL logs.
    if (req.user.role === 'staff' && req.user.campus) {
      query.campus = req.user.campus;
    }

    const logs = await AccessLog.find(query)
      .populate('userId', 'fullName name email role studentId photoUrl')
      .sort({ createdAt: -1 });

    // Map to a flat object the frontend expects
    const result = logs.map((log) => {
      const u = log.userId;
      return {
        _id: log._id,
        personId: u ? (u.studentId || u._id.toString()) : '',
        entryTime: log.entryTime,
        exitTime: log.exitTime,
        status: log.status,
        student: u
          ? {
              name: u.fullName || u.name || 'Unknown',
              photoUrl: u.photoUrl || null,
              studentId: u.studentId || '',
              email: u.email || '',
              role: u.role || 'student',
            }
          : null,
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('getLogs error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get live access status for today
// @route   GET /api/access/live-status
// @access  Private (Admin, Staff, Security)
exports.getLiveStatus = async (req, res) => {
  try {
    await checkAndGenerateDailyNoExitReports();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const todayLogs = await AccessLog.find({ createdAt: { $gte: startOfDay } });

    let entries = 0;
    let exits = 0;
    // Track last status per user to compute who's inside
    const lastStatus = {};

    for (const log of todayLogs) {
      if (log.userId) {
        const uid = log.userId.toString();
        if (log.entryTime) entries++;
        if (log.exitTime) exits++;
        lastStatus[uid] = log.status;
      }
    }

    const inside = Object.values(lastStatus).filter((s) => s === 'IN').length;

    res.status(200).json({ entries, exits, inside });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
