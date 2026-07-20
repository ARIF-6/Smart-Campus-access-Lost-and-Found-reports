/**
 * Middleware that checks whether the authenticated security guard is performing an action
 * within the allowed time window of their assigned shift.
 *
 * Priority order:
 *  1. Uses `req.user.shiftStartTime` and `req.user.shiftEndTime` (admin-set custom times, e.g. "08:00", "16:00")
 *  2. Falls back to legacy logic based on `req.user.assignedShift` ("morning" → 05:00-13:29, "afternoon" → 13:30-18:00)
 *
 * NOTE: Does NOT require a manually-started Shift record. Guards are allowed to scan
 * anytime within their assigned time window without needing to press "Start Shift" first.
 * Admin and staff roles bypass this check entirely.
 */
const checkShiftWindow = async (req, res, next) => {
  try {
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    // Bypass check for admin and staff
    if (userRole === 'admin' || userRole === 'staff') {
      return next();
    }

    // Get current Egypt local time (handles UTC offset on cloud servers)
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // ── Option 1: Use admin-assigned custom start/end times ──────────────────
    const customStart = req.user.shiftStartTime; // e.g. "09:00"
    const customEnd   = req.user.shiftEndTime;   // e.g. "11:10"

    if (customStart && customEnd) {
      const [startH, startM] = customStart.split(':').map(Number);
      const [endH, endM]     = customEnd.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes   = endH * 60 + endM;

      let withinWindow;
      if (startMinutes <= endMinutes) {
        // Normal window (e.g. 09:00 – 11:10)
        withinWindow = nowMinutes >= startMinutes && nowMinutes <= endMinutes;
      } else {
        // Overnight window (e.g. 22:00 – 06:00)
        withinWindow = nowMinutes >= startMinutes || nowMinutes <= endMinutes;
      }

      if (withinWindow) return next();

      return res.status(403).json({
        success: false,
        message: `You are not currently on duty. Your assigned shift is ${customStart} – ${customEnd}.`
      });
    }

    // ── Option 2: Legacy fallback – use assignedShift name ───────────────────
    const assignedShift = (req.user.assignedShift || 'none').toLowerCase();

    if (assignedShift === 'none' || assignedShift === '') {
      return res.status(403).json({
        success: false,
        message: "No shift has been assigned to you. Please contact an administrator."
      });
    }

    const isMorningShift = assignedShift === 'morning';

    const startWindow = new Date(now);
    const endWindow   = new Date(now);
    if (isMorningShift) {
      startWindow.setHours(5, 0, 0, 0);
      endWindow.setHours(13, 29, 59, 999);
    } else {
      startWindow.setHours(13, 30, 0, 0);
      endWindow.setHours(18, 0, 0, 0);
    }

    if (now >= startWindow && now <= endWindow) {
      return next();
    }

    const windowLabel = isMorningShift ? '05:00 – 13:29' : '13:30 – 18:00';
    return res.status(403).json({
      success: false,
      message: `You are not currently on duty. Your ${assignedShift} shift window is ${windowLabel}.`
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { checkShiftWindow };
