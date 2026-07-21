const MORNING_START = 6 * 60;       // 06:00
const MORNING_END = 13 * 60;        // 13:00
const AFTERNOON_START = 13 * 60 + 1; // 13:01
const AFTERNOON_END = 20 * 60 + 30;  // 20:30

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
};

const formatMinutesLabel = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
};

/**
 * Validates security guard shift assignment.
 * Returns an error message string, or null if valid.
 */
const validateSecurityShift = (assignedShift, shiftStartTime, shiftEndTime) => {
  const shift = (assignedShift || 'none').toLowerCase();

  if (shift === 'none' || !shift) {
    return null;
  }

  if (!shiftStartTime || !shiftEndTime) {
    return 'Shift start time and end time are required for security guards.';
  }

  const start = parseTimeToMinutes(shiftStartTime);
  const end = parseTimeToMinutes(shiftEndTime);

  if (start === null || end === null) {
    return 'Shift times must be valid HH:MM values.';
  }

  if (start === end) {
    return 'Start Shift and End Shift cannot be the same. Please select different times.';
  }

  if (end <= start) {
    return 'End Shift must be later than the Start Shift.';
  }

  if (shift === 'full-time' || shift === 'fulltime') {
    return null;
  }

  if (shift === 'morning') {
    if (start < MORNING_START || start > MORNING_END) {
      return `Morning Shift start time must be between 06:00 AM and 01:00 PM (${formatMinutesLabel(MORNING_START)} – ${formatMinutesLabel(MORNING_END)}).`;
    }
    if (end > MORNING_END) {
      return `Morning Shift end time cannot exceed 01:00 PM (${formatMinutesLabel(MORNING_END)}).`;
    }
    return null;
  }

  if (shift === 'afternoon') {
    if (start < AFTERNOON_START || start > AFTERNOON_END) {
      return `Afternoon Shift start time must be between 01:01 PM and 08:30 PM (${formatMinutesLabel(AFTERNOON_START)} – ${formatMinutesLabel(AFTERNOON_END)}).`;
    }
    if (end > AFTERNOON_END) {
      return `Afternoon Shift end time cannot exceed 08:30 PM (${formatMinutesLabel(AFTERNOON_END)}).`;
    }
    return null;
  }

  return null;
};

module.exports = {
  validateSecurityShift,
  parseTimeToMinutes,
  MORNING_START,
  MORNING_END,
  AFTERNOON_START,
  AFTERNOON_END,
};
