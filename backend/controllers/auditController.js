const AuditLog = require('../models/AuditLog');

// @desc    Get all audit logs with filters and pagination
// @route   GET /api/audit-logs
// @access  Private (Admin Only)
exports.getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { action, startDate, endDate } = req.query;

    const query = {};

    // Action filter
    if (action && action !== 'All') {
      query.action = action;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set end date to end of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const totalLogs = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      logs,
      total: totalLogs,
      page,
      pages: Math.ceil(totalLogs / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
