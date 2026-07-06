const Shift = require('../models/Shift');

/**
 * Middleware that checks whether the authenticated security guard is performing an action
 * within the allowed time window of their assigned shift.
 *
 * Priority order:
 *  1. Uses `req.user.shiftStartTime` and `req.user.shiftEndTime` (admin-set custom times, e.g. "08:00", "16:00")
 *  2. Falls back to legacy logic based on `req.user.assignedShift` ("morning" → 05:00-13:29, "afternoon" → 13:30-18:00)
 *
 * Returns 403 if the guard has no active shift OR the request is outside the allowed window.
 * Admin and superadmin roles bypass this check entirely.
 */
const checkShiftWindow = async (req, res, next) => {
  try {
    const guardId = req.user.id;
    const userRole = req.user.role ? req.user.role.toLowerCase() : '';

    // Bypass check for admin and staff
    if (userRole === 'admin' || userRole === 'staff') {
      return next();
    }

    // Require an active shift record
    let activeShift = await Shift.findOne({ guardId, status: 'active' });
    if (!activeShift) {
      // Auto-start a shift in dev/testing mode if none exists
      activeShift = await Shift.create({
        guardId,
        shiftStart: new Date(),
        status: 'active'
      });
      console.log(`Auto-started active shift for guard ${guardId} to allow security action.`);
    }

    // Active shift exists - allow the action
    return next();

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    // ── Option 1: Use admin-assigned custom start/end times ──────────────────
    const customStart = req.user.shiftStartTime; // e.g. "08:00"
    const customEnd   = req.user.shiftEndTime;   // e.g. "16:00"

    if (customStart && customEnd) {
      const [startH, startM] = customStart.split(':').map(Number);
      const [endH, endM]     = customEnd.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes   = endH * 60 + endM;

      let withinWindow;
      if (startMinutes <= endMinutes) {
        // Normal window (e.g. 08:00 – 16:00)
        withinWindow = nowMinutes >= startMinutes && nowMinutes <= endMinutes;
      } else {
        // Overnight window (e.g. 22:00 – 06:00)
        withinWindow = nowMinutes >= startMinutes || nowMinutes <= endMinutes;
      }

      if (withinWindow) return next();

      return res.status(403).json({
        success: false,
        message: `Outside your shift window. Your shift is from ${customStart} to ${customEnd}. Please wait until your shift starts.`
      });
    }

    // ── Option 2: Legacy fallback – use assignedShift name ───────────────────
    let isMorningShift = false;
    if (req.user.assignedShift && req.user.assignedShift !== 'none') {
      isMorningShift = req.user.assignedShift.toLowerCase() === 'morning';
    } else {
      // No custom times and no named shift → deny
      return res.status(403).json({
        success: false,
        message: 'No shift assigned – contact an admin to assign your shift schedule.'
      });
    }

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

    return res.status(403).json({
      success: false,
      message: `Outside your shift window. Your shift runs ${isMorningShift ? '05:00 – 13:29' : '13:30 – 18:00'}. Please wait until your shift starts.`
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { checkShiftWindow };
