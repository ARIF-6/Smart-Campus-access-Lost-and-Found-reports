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
          message: `${user.fullName} (${user.studentId}) this student is in blacklist`,
          severity: 'banned',
          user: { name: user.fullName, studentId: user.studentId }
        });

        // Also create a persistent notification
        await createNotification({
          recipientRole: 'security',
          title: 'Security Alert: Blacklist',
          message: `${user.fullName} (${user.studentId}) this student is in blacklist`,
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

    const now = new Date();

    // Enforce one entry and one exit per day — work exclusively with today's log
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayLog = await AccessLog.findOne({
      userId: user._id,
      $or: [
        { entryTime: { $gte: startOfToday, $lte: endOfToday } },
        { createdAt: { $gte: startOfToday, $lte: endOfToday } }
      ]
    }).sort({ createdAt: -1 });

    // Student already completed their daily cycle (IN → OUT)
    if (todayLog && todayLog.status === 'OUT') {
      return res.status(400).json({
        status: 'Limit Reached',
        color: 'red',
        message: `sorry you have reached the limit of entry/exit of this day`,
        student: studentPayload,
      });
    }

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
      await createNotification({
        userId: user._id,
        title,
        message: `You have successfully ${actionLabel} the campus.`,
        type: 'ACCESS_LOG',
        relatedId: log._id
      });
    };

    // Student already entered today — record exit
    if (todayLog && todayLog.status === 'IN') {
      todayLog.exitTime = now;
      todayLog.status = 'OUT';
      todayLog.exitSource = 'Security Guard';
      await todayLog.save();
      await notifyAccess(todayLog, 'OUT');
      await logAction({
        userId: req.user.id,
        action: 'SCAN_QR',
        targetId: user._id,
        targetType: 'User',
        details: `Recorded exit for ${user.username || user.fullName} via ${method || 'QR'}`,
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
    }

    // No log today — record first entry
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
      details: `Recorded entry for ${user.username || user.fullName} via ${method || 'QR'}`,
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
    const andClauses = [];

    // 1. Date filter — only apply when a specific date is provided.
    //    Build UTC midnight boundaries so the filter works regardless of server timezone.
    //    If no date is given (All Time mode), skip date filtering entirely.
    if (req.query.date) {
      const start = new Date(`${req.query.date}T00:00:00.000Z`);
      const end   = new Date(`${req.query.date}T23:59:59.999Z`);
      // Match on entryTime OR createdAt so we never miss a record
      andClauses.push({
        $or: [
          { entryTime: { $gte: start, $lte: end } },
          { createdAt: { $gte: start, $lte: end } }
        ]
      });
    }

    // 2. Campus-scoping: staff see logs either:
    //    a) scanned by a security guard assigned to the same campus (Security Guard flow), or
    //    b) campus field matches their campus directly (Campus QR Code flow, scannedBy is null)
    if (req.user.role === 'staff') {
      if (req.user.campus) {
        const guards = await User.find({ role: 'security', campus: req.user.campus, isDeleted: false }).select('_id');
        const guardIds = guards.map(g => g._id);
        andClauses.push({
          $or: [
            { scannedBy: { $in: guardIds } },
            { campus: req.user.campus, scannedBy: null },
          ]
        });
      } else {
        query._id = { $in: [] }; // No campus assigned → see nothing
      }
    }

    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    const logs = await AccessLog.find(query)
      .populate('userId', 'fullName name email role studentId photoUrl')
      .populate('campus', 'name')
      .sort({ createdAt: -1 });

    // Map to a flat object the frontend expects
    const result = logs.map((log) => {
      const u = log.userId;
      return {
        _id: log._id,
        personId: u ? (u.studentId || u._id.toString()) : '',
        entryTime: log.entryTime,
        exitTime: log.exitTime,
        status: log.status === 'IN' ? 'Inside' : 'Outside',
        source: log.source || 'Security Guard',
        exitSource: log.exitSource || null,
        campus: log.campus ? log.campus.name : 'Main Gate',
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

    const query = { createdAt: { $gte: startOfDay } };
    if (req.user.role === 'staff') {
      if (req.user.campus) {
        const guards = await User.find({ role: 'security', campus: req.user.campus, isDeleted: false }).select('_id');
        const guardIds = guards.map(g => g._id);
        query.scannedBy = { $in: guardIds };
      } else {
        query.scannedBy = { $in: [] };
      }
    }

    const todayLogs = await AccessLog.find(query);

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
