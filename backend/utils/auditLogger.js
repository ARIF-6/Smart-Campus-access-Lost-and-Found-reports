const AuditLog = require('../models/AuditLog');

/**
 * Helper to log system actions for auditing.
 * @param {Object} options - Logging data
 * @param {string} options.userId - ID of the user performing action
 * @param {string} options.action - Action name (e.g. "CREATE_USER")
 * @param {string} options.targetId - ID of affected resource (optional)
 * @param {string} options.targetType - Type of resource (optional)
 * @param {string} options.details - Description (optional)
 * @param {Object} options.req - Express request object to extract IP (optional)
 */
const logAction = async ({ userId, action, targetId, targetType, details, req }) => {
  try {
    const ipAddress = req ? req.ip : null;
    
    const newLog = new AuditLog({
      userId,
      action,
      targetId,
      targetType,
      details,
      ipAddress
    });

    await newLog.save();
    // Non-blocking log to console (optional)
    // console.log(`[AUDIT] ${action} by user ${userId}`);
  } catch (error) {
    // Fail silently in terms of app logic but log the error
    console.error('Failed to save audit log:', error.message);
  }
};

module.exports = { logAction };
