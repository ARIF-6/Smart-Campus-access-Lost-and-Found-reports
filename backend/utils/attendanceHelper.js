const AccessLog = require('../models/AccessLog');
const CampusAttendance = require('../models/CampusAttendance');

const getTodayBounds = () => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return { startOfToday, endOfToday };
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
    otherCampusAlert =
      `Student is currently INSIDE ${insideElsewhere.campusName}` +
      (insideElsewhere.entryTimeFormatted
        ? ` (entered at ${insideElsewhere.entryTimeFormatted} via ${insideElsewhere.method})`
        : ` (via ${insideElsewhere.method})`) +
      '.';
  }

  return {
    records,
    isInsideOtherCampus: Boolean(insideElsewhere),
    otherCampusAlert,
    latestRecord: records.length ? records[records.length - 1] : null,
  };
}

module.exports = {
  getStudentCrossCampusAttendance,
};
