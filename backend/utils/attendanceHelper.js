const AccessLog = require('../models/AccessLog');
const CampusAttendance = require('../models/CampusAttendance');

const getTodayBounds = () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return { startOfToday, endOfToday };
};

const getTodayDateString = () => getTodayBounds().startOfToday.toISOString().slice(0, 10);

const buildTodayTimeFilter = () => {
  const { startOfToday, endOfToday } = getTodayBounds();
  return {
    $or: [
      { entryTime: { $gte: startOfToday, $lte: endOfToday } },
      { createdAt: { $gte: startOfToday, $lte: endOfToday } },
    ],
  };
};

/**
 * Latest access log for a student at a specific campus today.
 */
async function getCampusTodayLog(userId, campusId) {
  if (!userId || !campusId) return null;
  return AccessLog.findOne({
    userId,
    campus: campusId,
    ...buildTodayTimeFilter(),
  })
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Live attendance counters scoped to one campus (today only).
 */
async function getCampusLiveAttendanceStats(campusId) {
  if (!campusId) {
    return { inside: 0, entries: 0, exits: 0, enteredToday: 0, exitedToday: 0 };
  }

  const logs = await AccessLog.find({
    campus: campusId,
    ...buildTodayTimeFilter(),
  })
    .sort({ createdAt: 1 })
    .lean();

  let entries = 0;
  let exits = 0;
  const lastStatusByUser = {};

  for (const log of logs) {
    if (log.entryTime) entries += 1;
    if (log.exitTime) exits += 1;
    if (log.userId) {
      lastStatusByUser[log.userId.toString()] = log.status;
    }
  }

  const inside = Object.values(lastStatusByUser).filter((s) => s === 'IN').length;

  return {
    inside,
    entries,
    exits,
    enteredToday: entries,
    exitedToday: exits,
  };
};

const formatAttendanceTime = (date) => {
  if (!date) return null;
  return new Date(date).toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Returns today's cross-campus attendance history for a student.
 * Used by security guards to verify prior campus entries before processing a scan.
 */
async function getStudentCrossCampusAttendance(userId, guardCampusId = null) {
  const { startOfToday, endOfToday } = getTodayBounds();
  const todayStr = startOfToday.toISOString().slice(0, 10);

  const [accessLogs, campusRecords] = await Promise.all([
    AccessLog.find({
      userId,
      $or: [
        { entryTime: { $gte: startOfToday, $lte: endOfToday } },
        { createdAt: { $gte: startOfToday, $lte: endOfToday } },
      ],
    })
      .populate('campus', 'name')
      .sort({ entryTime: 1, createdAt: 1 })
      .lean(),
    CampusAttendance.find({ userId, date: todayStr })
      .populate('campusId', 'name')
      .sort({ entryTime: 1, createdAt: 1 })
      .lean(),
  ]);

  const records = accessLogs.map((log) => {
    const campusId = log.campus?._id || log.campus || null;
    return {
      campusId,
      campusName: log.campus?.name || 'Unknown Campus',
      entryTime: log.entryTime,
      entryTimeFormatted: formatAttendanceTime(log.entryTime),
      exitTime: log.exitTime || null,
      exitTimeFormatted: formatAttendanceTime(log.exitTime),
      status: log.status === 'IN' ? 'Inside' : 'Outside',
      method: log.source || 'Security Guard',
      exitMethod: log.exitSource || null,
      isCurrentCampus: Boolean(
        guardCampusId && campusId && String(campusId) === String(guardCampusId)
      ),
    };
  });

  // Include campus-specific attendance records not already reflected in access logs
  for (const record of campusRecords) {
    const campusId = record.campusId?._id || record.campusId;
    const alreadyIncluded = records.some(
      (r) => r.campusId && campusId && String(r.campusId) === String(campusId)
    );
    if (!alreadyIncluded) {
      records.push({
        campusId,
        campusName: record.campusId?.name || 'Unknown Campus',
        entryTime: record.entryTime,
        entryTimeFormatted: formatAttendanceTime(record.entryTime),
        exitTime: record.exitTime || null,
        exitTimeFormatted: formatAttendanceTime(record.exitTime),
        status: record.status === 'IN' ? 'Inside' : 'Outside',
        method: 'Campus QR Code',
        exitMethod: record.exitTime ? 'Campus QR Code' : null,
        isCurrentCampus: Boolean(
          guardCampusId && campusId && String(campusId) === String(guardCampusId)
        ),
      });
    }
  }

  records.sort((a, b) => {
    const aTime = a.entryTime ? new Date(a.entryTime).getTime() : 0;
    const bTime = b.entryTime ? new Date(b.entryTime).getTime() : 0;
    return aTime - bTime;
  });

  const insideElsewhere = records.find(
    (r) =>
      r.status === 'Inside' &&
      guardCampusId &&
      r.campusId &&
      String(r.campusId) !== String(guardCampusId)
  );

  let otherCampusAlert = null;
  if (insideElsewhere) {
    otherCampusAlert = `This student has already entered ${insideElsewhere.campusName} and has not yet exited.`;
  }

  return {
    records,
    isInsideOtherCampus: Boolean(insideElsewhere),
    otherCampusAlert,
    activeOtherCampusRecord: insideElsewhere || null,
    latestRecord: records.length ? records[records.length - 1] : null,
  };
}

/**
 * Resolves the student's dashboard attendance label from today's latest records.
 * Inside  — currently inside a campus (has not exited yet)
 * Exited  — recorded attendance today and latest state is outside
 * Outside — no attendance recorded for the current day
 */
async function getStudentDashboardAttendanceStatus(userId) {
  const crossCampus = await getStudentCrossCampusAttendance(userId);
  const records = crossCampus.records || [];

  const insideRecord = records.find((record) => record.status === 'Inside');
  if (insideRecord) {
    return {
      displayStatus: 'Inside',
      status: 'IN',
      campusName: insideRecord.campusName || null,
      campusId: insideRecord.campusId || null,
      latestRecord: insideRecord,
    };
  }

  if (records.length > 0) {
    const latestRecord = crossCampus.latestRecord;
    return {
      displayStatus: 'Exited',
      status: 'OUT',
      campusName: latestRecord?.campusName || null,
      campusId: latestRecord?.campusId || null,
      latestRecord: latestRecord || null,
    };
  }

  return {
    displayStatus: 'Outside',
    status: 'OUT',
    campusName: null,
    campusId: null,
    latestRecord: null,
  };
}

async function emitStudentAttendanceStatusUpdate(userId) {
  if (!userId) return;
  try {
    const { emitToUser } = require('../socket/events/notificationEvents');
    const status = await getStudentDashboardAttendanceStatus(userId);
    emitToUser(String(userId), 'student:attendance:updated', status);
  } catch (err) {
    console.error('Failed to emit student attendance status update:', err.message);
  }
}

module.exports = {
  getTodayBounds,
  getTodayDateString,
  buildTodayTimeFilter,
  getCampusTodayLog,
  getCampusLiveAttendanceStats,
  getStudentCrossCampusAttendance,
  getStudentDashboardAttendanceStatus,
  emitStudentAttendanceStatusUpdate,
};
