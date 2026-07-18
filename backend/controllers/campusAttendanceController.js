const Campus = require('../models/Campus');
const CampusAttendance = require('../models/CampusAttendance');
const User = require('../models/User');
const Blacklist = require('../models/Blacklist');
const AccessLog = require('../models/AccessLog');
const { logAction } = require('../utils/auditLogger');
const { createNotification } = require('./notificationController');
const { getIO } = require('../socket');
const { haversineDistance } = require('../utils/haversine');

// Helper: Get today's date string YYYY-MM-DD (UTC)
const getTodayDate = () => new Date().toISOString().slice(0, 10);

/**
 * POST /api/campus-attendance/scan
 * Validates a scanned QR token and returns the campus details if valid.
 * Body: { qrToken: string }
 */
exports.scanCampusQR = async (req, res) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken) {
      return res.status(400).json({ success: false, message: 'QR token is required.' });
    }

    const campus = await Campus.findOne({ qrCode: qrToken.trim() }).lean();
    if (!campus) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or unrecognised campus QR Code. Please scan the current campus QR Code.',
      });
    }

    const now = new Date();
    if (!campus.qrExpiresAt || now >= new Date(campus.qrExpiresAt)) {
      return res.status(410).json({
        success: false,
        message: 'This campus QR Code has expired. Please ask an administrator to refresh it.',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        campusId: campus._id,
        campusName: campus.name,
        qrGeneratedAt: campus.qrGeneratedAt,
        qrExpiresAt: campus.qrExpiresAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

/**
 * POST /api/campus-attendance/verify-id
 * Validates the student ID, checks the blacklist, checks impersonation, returns current attendance status.
 * Body: { studentId: string, campusId: string }
 */
exports.verifyStudentId = async (req, res) => {
  try {
    const { studentId, campusId } = req.body;
    if (!studentId || !campusId) {
      return res.status(400).json({ success: false, message: 'studentId and campusId are required.' });
    }

    // 1. Check if the QR campus exists
    const campus = await Campus.findById(campusId).lean();
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found.' });
    }

    // 2. Validate Student ID using case-insensitive check
    const studentIdClean = studentId.trim();
    const student = await User.findOne({
      studentId: { $regex: new RegExp('^' + studentIdClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
      role: 'student',
      isDeleted: { $ne: true },
    }).select('_id fullName studentId photoUrl isActive campus').lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Student ID. Please try again.',
        code: 'INVALID_STUDENT',
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This student account is currently inactive. Please contact the administrator.',
        code: 'INACTIVE_STUDENT',
      });
    }

    // 3. Prevent Student Identity Impersonation (authenticated user must own entered Student ID)
    if (String(req.user._id) !== String(student._id)) {
      const campusName = campus.name;
      
      // Trigger real-time popup security alert to all guards
      const io = getIO();
      if (io) {
        io.to('role:security').emit('security:alert', {
          title: 'Security Alert',
          message: `A student attempted to use another student's ID to access the campus.\nStudent: ${req.user.fullName} (${req.user.studentId})\nEntered ID: ${studentIdClean}\nCampus: ${campusName}`,
          studentName: req.user.fullName,
          loggedInStudentId: req.user.studentId,
          enteredStudentId: studentIdClean,
          campus: campusName,
          dateTime: new Date().toLocaleString()
        });
      }

      // Record impersonation in Audit Logs
      logAction({
        userId: req.user._id,
        action: 'Student Identity Impersonation Attempt',
        targetId: campusId,
        targetType: 'Campus',
        details: `Impersonation Attempt: Logged-in user "${req.user.fullName}" (ID: ${req.user.studentId}) tried using entered ID "${studentIdClean}". Campus: ${campusName}. Status: Rejected`,
        req
      }).catch(() => {});

      // Create persistent notification for security/admin
      createNotification({
        recipientRole: 'security',
        title: 'Security Alert: Identity Impersonation',
        message: `Student "${req.user.fullName}" (ID: ${req.user.studentId}) attempted entry with ID "${studentIdClean}" at campus "${campusName}".`,
        type: 'SECURITY_ALERT',
        module: 'Security'
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        message: 'Access Denied. You can only use your own Student ID.',
        code: 'IMPERSONATION_ATTEMPT',
      });
    }

    // Campus assignment check removed — students may access any campus.

    // 5. Check Blacklist status
    const blacklistRecord = await Blacklist.findOne({
      studentId: { $regex: new RegExp('^' + studentIdClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
      status: 'accepted',
    }).lean();

    if (blacklistRecord) {
      // Trigger real-time popup security alert to all guards
      const io = getIO();
      if (io) {
        io.to('role:security').emit('security:alert', {
          title: 'Security Alert',
          message: `${student.fullName} (${student.studentId}) this student is in blacklist`,
          studentName: student.fullName,
          loggedInStudentId: student.studentId,
          enteredStudentId: studentIdClean,
          campus: campus.name,
          dateTime: new Date().toLocaleString()
        });
      }

      // Create persistent notification for security/admin
      createNotification({
        recipientRole: 'security',
        title: 'Security Alert: Blacklist',
        message: `${student.fullName} (${student.studentId}) this student is in blacklist`,
        type: 'SECURITY_ALERT',
        module: 'Security'
      }).catch(() => {});

      logAction({
        userId: student._id,
        action: 'CAMPUS_ATTENDANCE_BLOCKED',
        targetId: campusId,
        targetType: 'Campus',
        details: `Student ${studentIdClean} blocked from campus — blacklisted.`,
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        message: 'Access Denied. This student has been blacklisted from campus access.',
        code: 'BLACKLISTED',
        blacklistReason: blacklistRecord.reason || '',
      });
    }

    // 6. Prevent Duplicate Entry and Exit (check latest AccessLog status)
    const lastLog = await AccessLog.findOne({ userId: student._id }).sort({ createdAt: -1 }).lean();
    const currentStatus = lastLog?.status || null; // 'IN' or 'OUT'
    const nextAction = (!currentStatus || currentStatus === 'OUT') ? 'ENTER' : 'EXIT';

    return res.status(200).json({
      success: true,
      data: {
        userId: student._id,
        fullName: student.fullName,
        studentId: student.studentId,
        photoUrl: student.photoUrl || null,
        currentStatus,
        nextAction,
        today: getTodayDate(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

/**
 * POST /api/campus-attendance/submit
 * Saves the attendance record (ENTER or EXIT) and creates or updates AccessLog.
 * Body: { userId, studentId, campusId, action: 'ENTER'|'EXIT', latitude, longitude, accuracy }
 *
 * GPS GEOFENCING: Backend validates that the student is physically inside the campus.
 */
exports.submitAttendance = async (req, res) => {
  try {
    const { userId, studentId, campusId, action, latitude, longitude, accuracy } = req.body;

    // ── 1. Required fields ────────────────────────────────────────────────────
    if (!userId || !studentId || !campusId || !action) {
      return res.status(400).json({ success: false, message: 'userId, studentId, campusId, and action are required.' });
    }
    if (!['ENTER', 'EXIT'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action must be ENTER or EXIT.' });
    }

    // ── 2. GPS coordinate validation ─────────────────────────────────────────
    const studentLat = parseFloat(latitude);
    const studentLon = parseFloat(longitude);
    const gpsAccuracy = parseFloat(accuracy);

    if (latitude == null || longitude == null || isNaN(studentLat) || isNaN(studentLon)) {
      console.log('[GPS] REJECTED — missing or invalid coordinates:', { latitude, longitude });
      return res.status(400).json({
        success: false,
        message: 'GPS coordinates are required. Please ensure location services are enabled.',
      });
    }

    if (studentLat < -90 || studentLat > 90 || studentLon < -180 || studentLon > 180) {
      console.log('[GPS] REJECTED — coordinates out of valid range:', { studentLat, studentLon });
      return res.status(400).json({
        success: false,
        message: 'Invalid GPS coordinates. Please try again.',
      });
    }

    if (!isNaN(gpsAccuracy) && gpsAccuracy > 100) {
      console.log('[GPS] WARNING — GPS accuracy is low:', gpsAccuracy, 'm');
    }

    // ── 3. Load campus and validate GPS geofencing ───────────────────────────
    const campus = await Campus.findById(campusId).lean();
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found.' });
    }

    // Ensure the campus has coordinates configured
    if (campus.latitude == null || campus.longitude == null) {
      console.log('[GPS] REJECTED — Campus has no coordinates configured:', campus.name);
      return res.status(400).json({
        success: false,
        message: 'This campus does not have GPS coordinates configured. Please contact the administrator.',
      });
    }

    const campusRadius = campus.radius || 120; // Default 120 meters
    const distanceMeters = haversineDistance(studentLat, studentLon, campus.latitude, campus.longitude);

    // ── DEBUG LOGGING (remove in production) ────────────────────────────────
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[GPS Geofence Debug]');
    console.log('  Student Lat    :', studentLat);
    console.log('  Student Lon    :', studentLon);
    console.log('  Campus Lat     :', campus.latitude);
    console.log('  Campus Lon     :', campus.longitude);
    console.log('  Campus Name    :', campus.name);
    console.log('  Campus Radius  :', campusRadius, 'm');
    console.log('  Distance       :', distanceMeters.toFixed(2), 'm');
    console.log('  GPS Accuracy   :', isNaN(gpsAccuracy) ? 'N/A' : gpsAccuracy + 'm');
    console.log('  Result         :', distanceMeters <= campusRadius ? '✅ ALLOWED' : '❌ REJECTED (outside campus)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // ── Enforce geofencing boundary ───────────────────────────────────────────
    if (distanceMeters > campusRadius) {
      return res.status(403).json({
        success: false,
        message: 'You are out of campus.',
      });
    }

    // ── 4. Validate Student ID ────────────────────────────────────────────────
    const studentIdClean = studentId.trim();
    const student = await User.findOne({
      studentId: { $regex: new RegExp('^' + studentIdClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
      role: 'student',
      isDeleted: { $ne: true },
    }).select('_id fullName studentId photoUrl isActive campus').lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Invalid Student ID. Please try again.',
      });
    }

    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: 'This student account is currently inactive.',
      });
    }

    // 3. Prevent Student Identity Impersonation (authenticated user must own entered Student ID)
    if (String(req.user._id) !== String(student._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access Denied. You can only use your own Student ID.',
      });
    }

    // Campus assignment check removed — students may access any campus.

    // 5. Check Blacklist status
    const blacklistRecord = await Blacklist.findOne({
      studentId: { $regex: new RegExp('^' + studentIdClean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') },
      status: 'accepted',
    }).lean();

    if (blacklistRecord) {
      // Trigger real-time popup security alert to all guards
      const io = getIO();
      if (io) {
        io.to('role:security').emit('security:alert', {
          title: 'Security Alert',
          message: `${student.fullName} (${student.studentId}) this student is in blacklist`,
          studentName: student.fullName,
          loggedInStudentId: student.studentId,
          enteredStudentId: studentIdClean,
          campus: campus.name,
          dateTime: new Date().toLocaleString()
        });
      }

      // Create persistent notification for security/admin
      createNotification({
        recipientRole: 'security',
        title: 'Security Alert: Blacklist',
        message: `${student.fullName} (${student.studentId}) this student is in blacklist`,
        type: 'SECURITY_ALERT',
        module: 'Security'
      }).catch(() => {});

      return res.status(403).json({
        success: false,
        message: 'Access Denied. This student has been blacklisted.',
      });
    }

    // 6. Prevent Duplicate Entry and Exit (check latest AccessLog status)
    const lastLog = await AccessLog.findOne({ userId: student._id }).sort({ createdAt: -1 });
    const currentStatus = lastLog?.status || null;

    if (action === 'ENTER') {
      if (currentStatus === 'IN') {
        return res.status(400).json({
          success: false,
          message: 'This student has already entered the campus.',
        });
      }

      const today = getTodayDate();
      // Check if student already has an entry record today
      const existingEntry = await CampusAttendance.findOne({
        userId: student._id,
        date: today,
        entryTime: { $ne: null }
      });
      if (existingEntry) {
        return res.status(400).json({
          success: false,
          message: 'You have already completed your daily entry.',
        });
      }
      
      const now = new Date();

      // Create CampusAttendance record
      const attendanceRecord = await CampusAttendance.create({
        studentId: student.studentId,
        userId: student._id,
        campusId,
        entryTime: now,
        status: 'IN',
        date: today,
        latitude: studentLat,
        longitude: studentLon,
        accuracy: gpsAccuracy || null,
        distance: Math.round(distanceMeters),
      });

      // Synchronize by creating a new AccessLog record
      const accessLog = await AccessLog.create({
        userId: student._id,
        entryTime: now,
        status: 'IN',
        campus: campusId,
        scannedBy: null, // scanned by student self via QR Code
        source: 'Campus QR Code',
        latitude: studentLat,
        longitude: studentLon,
        accuracy: gpsAccuracy || null,
        distance: Math.round(distanceMeters),
      });

      logAction({
        userId: student._id,
        action: 'CAMPUS_ENTRY',
        targetId: campusId,
        targetType: 'Campus',
        details: `Student ${student.studentId} entered campus via Campus QR Code.`,
      }).catch(() => {});

      // Send Socket to refresh Admin and Security dashboards
      const io = getIO();
      if (io) {
        io.to('role:security').to('role:admin').emit('dashboard:refresh', {});
      }

      return res.status(201).json({
        success: true,
        message: 'Campus entry recorded successfully.',
        data: { attendanceId: attendanceRecord._id, status: 'IN', entryTime: now },
      });
    } else {
      // EXIT
      if (!currentStatus || currentStatus === 'OUT') {
        return res.status(400).json({
          success: false,
          message: 'This student has already exited the campus.',
        });
      }

      const today = getTodayDate();
      // Check if student already has an exit record today
      const existingExit = await CampusAttendance.findOne({
        userId: student._id,
        date: today,
        exitTime: { $ne: null }
      });
      if (existingExit) {
        return res.status(400).json({
          success: false,
          message: 'You have already completed your daily exit.',
        });
      }

      const now = new Date();

      // Create CampusExit record (find existing IN record for today or fallback)
      const existingAttendance = await CampusAttendance.findOneAndUpdate(
        { userId: student._id, campusId, date: today, status: 'IN' },
        { 
          $set: { 
            exitTime: now, 
            status: 'OUT',
            latitude: studentLat,
            longitude: studentLon,
            accuracy: gpsAccuracy || null,
            distance: Math.round(distanceMeters),
          } 
        },
        { sort: { createdAt: -1 }, new: true }
      );

      if (!existingAttendance) {
        await CampusAttendance.create({
          studentId: student.studentId,
          userId: student._id,
          campusId,
          exitTime: now,
          status: 'OUT',
          date: today,
          latitude: studentLat,
          longitude: studentLon,
          accuracy: gpsAccuracy || null,
          distance: Math.round(distanceMeters),
        });
      }

      // Synchronize by updating latest IN AccessLog record to OUT
      if (lastLog && lastLog.status === 'IN') {
        lastLog.exitTime = now;
        lastLog.status = 'OUT';
        lastLog.latitude = studentLat;
        lastLog.longitude = studentLon;
        lastLog.accuracy = gpsAccuracy || null;
        lastLog.distance = Math.round(distanceMeters);
        await lastLog.save();
      } else {
        await AccessLog.create({
          userId: student._id,
          exitTime: now,
          status: 'OUT',
          campus: campusId,
          scannedBy: null,
          source: 'Campus QR Code',
          latitude: studentLat,
          longitude: studentLon,
          accuracy: gpsAccuracy || null,
          distance: Math.round(distanceMeters),
        });
      }

      logAction({
        userId: student._id,
        action: 'CAMPUS_EXIT',
        targetId: campusId,
        targetType: 'Campus',
        details: `Student ${student.studentId} exited campus via Campus QR Code.`,
      }).catch(() => {});

      // Send Socket to refresh Admin and Security dashboards
      const io = getIO();
      if (io) {
        io.to('role:security').to('role:admin').emit('dashboard:refresh', {});
      }

      return res.status(200).json({
        success: true,
        message: 'Campus exit recorded successfully.',
        data: { status: 'OUT', exitTime: now },
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/campus-attendance/records
 * Admin: Get attendance records with optional filters.
 * Query: campusId, date, studentId
 */
exports.getAttendanceRecords = async (req, res) => {
  try {
    const { campusId, date, studentId } = req.query;
    const filter = {};
    if (campusId) filter.campusId = campusId;
    if (date) filter.date = date;
    if (studentId) filter.studentId = studentId;

    const records = await CampusAttendance.find(filter)
      .populate('userId', 'fullName studentId photoUrl')
      .populate('campusId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};
