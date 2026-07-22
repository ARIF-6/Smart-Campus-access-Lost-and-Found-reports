const AccessLog = require('../models/AccessLog');
const User = require('../models/User');
const Blacklist = require('../models/Blacklist');
const Shift = require('../models/Shift');
const { logAction } = require('../utils/auditLogger');
const { createNotification } = require('./notificationController');
const { getIO } = require('../socket');
const { emitDashboardRefresh, emitNotification } = require('../socket/events/notificationEvents');
const { checkAndGenerateDailyNoExitReports } = require('../utils/reportHelper');
const {
  getStudentCrossCampusAttendance,
  getCampusTodayLog,
  getCampusLiveAttendanceStats,
} = require('../utils/attendanceHelper');

const buildScanResponse = (payload, crossCampusAttendance) => ({
  ...payload,
  crossCampusAttendance,
});

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

    const guardCampusId = req.user?.campus || null;
    const crossCampusAttendance = user.role === 'student'
      ? await getStudentCrossCampusAttendance(user._id, guardCampusId)
      : { records: [], isInsideOtherCampus: false, otherCampusAlert: null, latestRecord: null };

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
      return res.status(403).json(buildScanResponse({
        status: 'BLACKLISTED',
        color: 'red',
        message: `⚠️ ALERT: ${user.fullName} is BLACKLISTED. Reason: ${blacklisted.reason}`,
        student: { name: user.fullName, studentId: user.studentId || '', photoUrl: user.photoUrl || '' },
        blacklist: { reason: blacklisted.reason, severity: 'banned' },
      }, crossCampusAttendance));
    }
    // ─────────────────────────────────────────────────────

    const studentPayload = {
      name: user.fullName || user.name || 'Unknown',
      studentId: user.studentId || '',
      major: user.address || '',
      photoUrl: user.photoUrl || '',
    };

    if (user.role !== 'student') {
      return res.status(400).json(buildScanResponse({
        status: 'Access Denied',
        color: 'red',
        message: 'Only student QR codes or Student IDs can be scanned here.',
        student: studentPayload,
      }, crossCampusAttendance));
    }

    if (req.user.role === 'security' && !guardCampusId) {
      return res.status(400).json(buildScanResponse({
        status: 'Access Denied',
        color: 'red',
        message: 'Your security account is not assigned to a campus. Contact an administrator.',
        student: studentPayload,
      }, crossCampusAttendance));
    }

    const now = new Date();

    const campusTodayLog = guardCampusId
      ? await getCampusTodayLog(user._id, guardCampusId)
      : null;

    // Student already completed entry/exit cycle at this campus today
    if (campusTodayLog && campusTodayLog.status === 'OUT') {
      return res.status(400).json(buildScanResponse({
        status: 'Limit Reached',
        color: 'red',
        message: 'sorry you have reached the limit of entry/exit of this day',
        student: studentPayload,
      }, crossCampusAttendance));
    }

    const isInsideThisCampus = campusTodayLog?.status === 'IN';
    const attemptingEntry = requestedStatus === 'IN' || (!requestedStatus && !isInsideThisCampus);
    const attemptingExit = requestedStatus === 'OUT' || (!requestedStatus && isInsideThisCampus);

    // Cross-campus entry block: student is inside another campus and has not exited
    if (attemptingEntry && crossCampusAttendance.isInsideOtherCampus) {
      const alertMessage = crossCampusAttendance.otherCampusAlert
        || 'This student is currently inside another campus and has not yet exited.';
      return res.status(409).json(buildScanResponse({
        status: 'Cross-Campus Alert',
        color: 'orange',
        message: alertMessage,
        student: studentPayload,
      }, crossCampusAttendance));
    }

    if (attemptingExit && !isInsideThisCampus) {
      return res.status(400).json(buildScanResponse({
        status: 'Not Inside Campus',
        color: 'red',
        message: crossCampusAttendance.isInsideOtherCampus
          ? crossCampusAttendance.otherCampusAlert
          : 'This student has not entered this campus today.',
        student: studentPayload,
      }, crossCampusAttendance));
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

    // Record exit at this campus
    if (attemptingExit && isInsideThisCampus && campusTodayLog) {
      const activeLog = await AccessLog.findById(campusTodayLog._id);
      if (!activeLog) {
        return res.status(400).json(buildScanResponse({
          status: 'Error',
          color: 'red',
          message: 'Unable to locate the active campus entry record.',
          student: studentPayload,
        }, crossCampusAttendance));
      }

      activeLog.exitTime = now;
      activeLog.status = 'OUT';
      activeLog.exitSource = 'Security Guard';
      await activeLog.save();
      await notifyAccess(activeLog, 'OUT');
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

      return res.status(200).json(buildScanResponse({
        status: 'Exit Recorded',
        color: 'yellow',
        message: `Exit recorded for ${studentPayload.name}`,
        student: studentPayload,
      }, crossCampusAttendance));
    }

    // Record first entry at this campus today
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

    return res.status(200).json(buildScanResponse({
      status: 'Access Granted',
      color: 'green',
      message: `Entry recorded for ${studentPayload.name}`,
      student: studentPayload,
    }, crossCampusAttendance));

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

    // 2. Campus-scoping: staff and security see logs for their assigned campus
    if (req.user.role === 'staff' || req.user.role === 'security') {
      if (req.user.campus) {
        if (req.user.role === 'staff') {
          const guards = await User.find({ role: 'security', campus: req.user.campus, isDeleted: false }).select('_id');
          const guardIds = guards.map(g => g._id);
          andClauses.push({
            $or: [
              { scannedBy: { $in: guardIds } },
              { campus: req.user.campus, scannedBy: null },
            ]
          });
        } else {
          andClauses.push({ campus: req.user.campus });
        }
      } else {
        query._id = { $in: [] };
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
    const campusId =
      req.user.role === 'security' || req.user.role === 'staff'
        ? req.user.campus || null
        : null;

    if ((req.user.role === 'security' || req.user.role === 'staff') && !campusId) {
      return res.status(200).json({ entries: 0, exits: 0, inside: 0, enteredToday: 0, exitedToday: 0 });
    }

    const stats = await getCampusLiveAttendanceStats(campusId);
    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
