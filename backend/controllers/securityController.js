const Incident = require('../models/Incident');
const Visitor = require('../models/Visitor');
const Blacklist = require('../models/Blacklist');
const Shift = require('../models/Shift');
const AccessLog = require('../models/AccessLog');
const User = require('../models/User');
const { getIO } = require('../socket');
const { emitDashboardRefresh, emitNotification } = require('../socket/events/notificationEvents');
const { createNotification } = require('./notificationController');
const { getCampusLiveAttendanceStats } = require('../utils/attendanceHelper');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

// ─────────────────── INCIDENTS ───────────────────

// @desc    Create an incident report
// @route   POST /api/security/incidents
exports.createIncident = asyncHandler(async (req, res) => {
  const { type, description, location, personInvolved, severity } = req.body;
  const path = require('path');
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const evidenceImage = req.file ? path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/') : null;
  const incident = await Incident.create({
    reportedBy: req.user.id,
    type, description,
    location: location || 'Main Gate',
    personInvolved: personInvolved || {},
    evidenceImage: evidenceImage,
    severity: severity || 'medium'
  });

  // Update active shift incident count
  await Shift.findOneAndUpdate(
    { guardId: req.user.id, status: 'active' },
    { $inc: { incidentsCount: 1 } }
  );

  // Real-time alert to admin/staff
  const io = getIO();
  if (io) {
    io.to('role:security').to('role:admin').to('role:staff').emit('security:alert', {
      title: 'Security Incident',
      message: `New ${type} incident at ${location}`,
      severity,
      time: incident.createdAt
    });

    // Persistent notification
    await createNotification({
      recipientRole: 'admin',
      title: 'Security Incident Report',
      message: `New ${severity} severity incident reported: ${type}`,
      type: 'SECURITY_ALERT',
      module: 'Security',
      relatedId: incident._id
    });
  }

  // Trigger dashboard refreshes
  emitDashboardRefresh('admin');
  emitDashboardRefresh('security');

  return sendSuccess(res, 'Incident reported successfully', incident, 201);
});

// @desc    Get all incidents (security sees own, admin sees all, staff sees campus-wide)
// @route   GET /api/security/incidents
exports.getIncidents = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'security') {
    filter = { reportedBy: req.user.id };
  } else if (req.user.role === 'staff') {
    if (req.user.campus) {
      const guards = await User.find({ role: 'security', campus: req.user.campus, isDeleted: false }).select('_id');
      const guardIds = guards.map(g => g._id);
      filter = { reportedBy: { $in: guardIds } };
    } else {
      filter = { reportedBy: { $in: [] } };
    }
  }

  const incidents = await Incident.find(filter)
    .populate('reportedBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  
  return sendSuccess(res, 'Incidents fetched successfully', incidents);
});

// @desc    Update incident status
// @route   PATCH /api/security/incidents/:id/status
exports.updateIncidentStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'review', 'resolved'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  const incident = await Incident.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  ).populate('reportedBy', 'fullName');
  if (!incident) return res.status(404).json({ success: false, message: 'Incident not found' });
  emitDashboardRefresh('admin');
  emitDashboardRefresh('security');
  return sendSuccess(res, 'Incident status updated', incident);
});

// ─────────────────── VISITORS ───────────────────

// @desc    Register a visitor
// @route   POST /api/security/visitors
exports.registerVisitor = asyncHandler(async (req, res) => {
  const { name, idNumber, phone, purpose, hostName, hostStudentId } = req.body;

  // ── 1. Purpose & hostName must not contain digits ─────────────────────────
  const hasDigit = /\d/;
  if (purpose && hasDigit.test(purpose)) {
    return res.status(400).json({
      success: false,
      message: 'Purpose cannot contain numbers.'
    });
  }
  if (hostName && hasDigit.test(hostName)) {
    return res.status(400).json({
      success: false,
      message: 'Host name cannot contain numbers.'
    });
  }

  // ── 2. Duplicate active check-in guard (by phone) ─────────────────────────
  if (phone && phone.trim()) {
    const existing = await Visitor.findOne({
      phone: phone.trim(),
      status: 'inside'
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This visitor is already checked in and is currently inside the campus.'
      });
    }
  }

  // ── 3. Create visitor record ──────────────────────────────────────────────
  const lastVisitor = await Visitor.findOne().sort({ createdAt: -1 });
  const nextSeq = lastVisitor && lastVisitor.visitorId ? lastVisitor.visitorId + 1 : 1;
  const finalIdNumber = idNumber && idNumber.trim() ? idNumber : String(nextSeq);

  const visitor = await Visitor.create({
    registeredBy: req.user.id,
    name,
    visitorId: nextSeq,
    idNumber: finalIdNumber,
    phone,
    purpose,
    hostName,
    hostStudentId,
    entryTime: new Date()
  });
  
  // Refresh dashboards
  emitDashboardRefresh('security');
  emitDashboardRefresh('admin');
  
  return sendSuccess(res, 'Visitor registered successfully', visitor, 201);
});

// @desc    Mark visitor as exited
// @route   PATCH /api/security/visitors/:id/exit
exports.visitorExit = asyncHandler(async (req, res) => {
  const visitor = await Visitor.findById(req.params.id);
  if (!visitor) {
    return res.status(404).json({ success: false, message: 'Visitor not found' });
  }
  
  visitor.exitTime = new Date();
  visitor.status = 'exited';
  await visitor.save();
  
  // Refresh dashboards
  emitDashboardRefresh('security');
  emitDashboardRefresh('admin');
  
  return sendSuccess(res, 'Visitor marked as exited', visitor);
});

// @desc    Get all visitors (today or all)
// @route   GET /api/security/visitors
exports.getVisitors = asyncHandler(async (req, res) => {
  let filter = {};
  if (req.user.role === 'security') {
    filter = { registeredBy: req.user.id };
  } else if (req.user.role === 'staff') {
    if (req.user.campus) {
      const guards = await User.find({ role: 'security', campus: req.user.campus, isDeleted: false }).select('_id');
      const guardIds = guards.map(g => g._id);
      filter = { registeredBy: { $in: guardIds } };
    } else {
      filter = { registeredBy: { $in: [] } };
    }
  }

  const visitors = await Visitor.find(filter)
    .populate('registeredBy', 'fullName')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  
  return sendSuccess(res, 'Visitors fetched successfully', visitors);
});

// ─────────────────── BLACKLIST ───────────────────

exports.addToBlacklist = asyncHandler(async (req, res) => {
  const { name, studentId, qrCode, reason, description } = req.body;
  const resolvedStudentId = studentId ? studentId.trim() : '';

  if (!resolvedStudentId) {
    return res.status(400).json({ success: false, message: 'invalid name/id' });
  }

  // Validate Student ID or Name against User database
  const student = await User.findOne({
    role: 'student',
    isDeleted: { $ne: true },
    $or: [
      { studentId: { $regex: new RegExp('^' + resolvedStudentId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } },
      { fullName: { $regex: new RegExp('^' + resolvedStudentId.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') } }
    ]
  });

  if (!student) {
    return res.status(400).json({ success: false, message: 'invalid name/id' });
  }

  const studentName = student.fullName || student.name || name || 'Unknown';
  const qr = student.qrCode || qrCode || '';

  const isGuard = req.user.role === 'security';

  const entry = await Blacklist.create({
    addedBy: req.user.id,
    name: studentName,
    studentId: student.studentId,
    qrCode: qr,
    reason: reason || 'Violation',
    description: description || '',
    status: isGuard ? 'pending' : 'accepted',
    isActive: !isGuard
  });

  if (isGuard) {
    // Notify admins
    try {
      const { createNotification } = require('./notificationController');
      await createNotification({
        recipientRole: 'admin',
        title: 'New Blacklist Request',
        message: `Security guard ${req.user.fullName} requested to blacklist student ${entry.name}.`,
        type: 'SECURITY_ALERT',
        module: 'Security'
      });
    } catch (_) {}
  }

  // Socket refresh
  try {
    const { emitGlobalEvent } = require('../socket/events/notificationEvents');
    emitGlobalEvent('dashboard:refresh', {});
  } catch (_) {}

  return sendSuccess(
    res,
    isGuard ? 'Blacklist request submitted to admin for decision' : 'Blacklist entry created successfully',
    entry,
    201
  );
});

// @desc    Get blacklist
// @route   GET /api/security/blacklist
exports.getBlacklist = asyncHandler(async (req, res) => {
  let query = {};
  if (req.user.role === 'security') {
    query = { 
      $or: [
        { isActive: true },
        { addedBy: req.user.id }
      ]
    };
  } else if (req.user.role === 'staff') {
    if (req.user.campus) {
      const guards = await User.find({ role: 'security', campus: req.user.campus, isDeleted: false }).select('_id');
      const guardIds = guards.map(g => g._id);
      query = { addedBy: { $in: guardIds } };
    } else {
      query = { addedBy: { $in: [] } };
    }
  }

  const list = await Blacklist.find(query)
    .populate('addedBy', 'fullName')
    .sort({ createdAt: -1 })
    .lean();
  
  return sendSuccess(res, 'Blacklist fetched successfully', list);
});

// @desc    Remove from blacklist (Permanent Delete)
// @route   DELETE /api/security/blacklist/:id
exports.removeFromBlacklist = asyncHandler(async (req, res) => {
  const entry = await Blacklist.findByIdAndDelete(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Blacklist entry not found' });
  }
  
  return sendSuccess(res, 'Blacklist record deleted permanently');
});

// @desc    Approve blacklist request
// @route   PATCH /api/security/blacklist/:id/approve
exports.approveBlacklist = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Not authorized to approve blacklist requests' });
  }

  const entry = await Blacklist.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Blacklist entry not found' });
  }

  entry.status = 'approved';
  entry.isActive = true;
  await entry.save();

  return sendSuccess(res, 'Blacklist request approved', entry);
});

// @desc    Reject blacklist request
// @route   PATCH /api/security/blacklist/:id/reject
exports.rejectBlacklist = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'staff') {
    return res.status(403).json({ success: false, message: 'Not authorized to reject blacklist requests' });
  }

  const entry = await Blacklist.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Blacklist entry not found' });
  }

  entry.status = 'rejected';
  entry.isActive = false;
  await entry.save();

  return sendSuccess(res, 'Blacklist request rejected', entry);
});

// @desc    Update blacklist status (Admin/Staff only)
// @route   PATCH /api/security/blacklist/:id/status
exports.updateBlacklistStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending', 'in review', 'rejected', 'accepted'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  const entry = await Blacklist.findById(req.params.id);
  if (!entry) {
    return res.status(404).json({ success: false, message: 'Blacklist entry not found' });
  }

  entry.status = status;
  // If status is accepted, mark as active; otherwise inactive
  entry.isActive = (status === 'accepted');
  await entry.save();

  // Socket refresh
  try {
    const { emitGlobalEvent } = require('../socket/events/notificationEvents');
    emitGlobalEvent('dashboard:refresh', {});
  } catch (_) {}

  return sendSuccess(res, 'Blacklist status updated successfully', entry);
});

// ─────────────────── SHIFTS ───────────────────

// @desc    Start a shift
// @route   POST /api/security/shifts/start
exports.startShift = asyncHandler(async (req, res) => {
  // Check for existing active shift
  const existing = await Shift.findOne({ guardId: req.user.id, status: 'active' }).lean();
  if (existing) {
    return res.status(400).json({ 
      success: false, 
      message: 'You already have an active shift', 
      data: existing 
    });
  }

  // Guards can start their shift tracking record at any time.
  // Access control (QR scanning) is already enforced by shiftTimeMiddleware
  // based on the time window — no need to re-gate here.
  const shift = await Shift.create({
    guardId: req.user.id,
    shiftStart: new Date()
  });
  
  return sendSuccess(res, 'Shift started successfully', shift, 201);
});


// @desc    End a shift
// @route   PATCH /api/security/shifts/end
exports.endShift = asyncHandler(async (req, res) => {
  const { notes } = req.body;
  const shift = await Shift.findOneAndUpdate(
    { guardId: req.user.id, status: 'active' },
    { shiftEnd: new Date(), status: 'completed', notes: notes || '' },
    { new: true }
  );
  
  if (!shift) {
    return res.status(404).json({ success: false, message: 'No active shift found' });
  }
  
  return sendSuccess(res, 'Shift ended successfully', shift);
});

// @desc    Get shift history (security sees own, admin/staff sees all)
// @route   GET /api/security/shifts
exports.getShifts = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'security' ? { guardId: req.user.id } : {};
  const shifts = await Shift.find(filter)
    .populate('guardId', 'fullName name email role')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  
  return sendSuccess(res, 'Shift history fetched successfully', shifts);
});

// @desc    Get active shift for current guard
// @route   GET /api/security/shifts/active
exports.getActiveShift = asyncHandler(async (req, res) => {
  const shift = await Shift.findOne({ guardId: req.user.id, status: 'active' }).lean();
  return sendSuccess(res, 'Active shift status fetched', shift || null);
});

// ─────────────────── REPORTS ───────────────────

// @desc    Daily, weekly & monthly report summary
// @route   GET /api/reports/security
exports.getSecurityReports = asyncHandler(async (req, res) => {
  const now = new Date();
  
  const startOfDay = new Date(now); 
  startOfDay.setHours(0, 0, 0, 0);
  
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    dailyEntries, dailyExits, todayIncidents, dailyVisitors,
    weeklyEntries, weeklyExits, weeklyIncidents, weeklyVisitors, weeklyShifts,
    monthlyEntries, monthlyExits, monthlyIncidents, monthlyVisitors, monthlyShifts
  ] = await Promise.all([
    // Daily
    AccessLog.countDocuments({ entryTime: { $gte: startOfDay }, status: 'IN' }),
    AccessLog.countDocuments({ exitTime: { $gte: startOfDay }, status: 'OUT' }),
    Incident.countDocuments({ createdAt: { $gte: startOfDay } }),
    Visitor.countDocuments({ createdAt: { $gte: startOfDay } }),

    // Weekly
    AccessLog.countDocuments({ entryTime: { $gte: startOfWeek }, status: 'IN' }),
    AccessLog.countDocuments({ exitTime: { $gte: startOfWeek }, status: 'OUT' }),
    Incident.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Visitor.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Shift.countDocuments({ guardId: req.user.id, createdAt: { $gte: startOfWeek } }),

    // Monthly
    AccessLog.countDocuments({ entryTime: { $gte: startOfMonth }, status: 'IN' }),
    AccessLog.countDocuments({ exitTime: { $gte: startOfMonth }, status: 'OUT' }),
    Incident.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Visitor.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Shift.countDocuments({ guardId: req.user.id, createdAt: { $gte: startOfMonth } })
  ]);

  // Current inside count
  const todayLogs = await AccessLog.find({ createdAt: { $gte: startOfDay } }).lean();
  const lastStatus = {};
  for (const log of todayLogs) {
    if (log.userId) {
      lastStatus[log.userId.toString()] = log.status;
    }
  }
  const currentlyInside = Object.values(lastStatus).filter(s => s === 'IN').length;

  return sendSuccess(res, 'Security reports fetched successfully', {
    daily: { entries: dailyEntries, exits: dailyExits, incidents: todayIncidents, visitors: dailyVisitors, currentlyInside },
    weekly: { entries: weeklyEntries, exits: weeklyExits, incidents: weeklyIncidents, visitors: weeklyVisitors, shifts: weeklyShifts },
    monthly: { entries: monthlyEntries, exits: monthlyExits, incidents: monthlyIncidents, visitors: monthlyVisitors, shifts: monthlyShifts }
  });
});

// ─────────────────── LIVE STATUS ───────────────────

// @desc    Live campus status
// @route   GET /api/security/live
exports.getLiveStatus = asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const campusId =
    req.user.role === 'security' || req.user.role === 'staff'
      ? req.user.campus || null
      : null;

  const attendanceStats = await getCampusLiveAttendanceStats(campusId);

  let incidentFilter = { createdAt: { $gte: startOfDay } };
  let visitorFilter = { createdAt: { $gte: startOfDay } };

  if (req.user.role === 'security') {
    incidentFilter.reportedBy = req.user.id;
    visitorFilter.registeredBy = req.user.id;
  } else if (req.user.role === 'staff') {
    if (campusId) {
      const guards = await User.find({ role: 'security', campus: campusId, isDeleted: false }).select('_id');
      const guardIds = guards.map((g) => g._id);
      incidentFilter.reportedBy = { $in: guardIds };
      visitorFilter.registeredBy = { $in: guardIds };
    } else {
      incidentFilter.reportedBy = { $in: [] };
      visitorFilter.registeredBy = { $in: [] };
    }
  }

  const [todayIncidents, todayVisitors] = await Promise.all([
    Incident.countDocuments(incidentFilter),
    Visitor.countDocuments(visitorFilter),
  ]);

  return sendSuccess(res, 'Live status fetched successfully', {
    ...attendanceStats,
    todayIncidents,
    todayVisitors,
  });
});
