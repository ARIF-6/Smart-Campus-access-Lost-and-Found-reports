const AuditLog = require('../models/AuditLog');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Get audit logs with filters and pagination
// @route   GET /api/audit-logs
// @access  Private (All roles - Admin sees all, others see their own)
exports.getAuditLogs = async (req, res) => {
  try {
    // Build query based on user role
    let query = {};
    
    // If user is not admin, only show their own logs
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
    }
    
    const total = await AuditLog.countDocuments(query);
    
    const apiFeatures = new APIFeatures(
      AuditLog.find(query).populate('userId', 'fullName name email role'),
      req.query,
      ['action', 'details']
    )
      .search()
      .filter()
      .sort()
      .pagination();
    
    const logs = await apiFeatures.query;
    // Map logs to include operator name for frontend
    const logsWithOperator = logs.map(log => {
      const logObj = log.toObject ? log.toObject() : log;
      const operatorName = (log.userId && (log.userId.fullName || log.userId.name)) || 'Unknown';
      return { ...logObj, operator: operatorName };
    });
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 1000;
    
    res.status(200).json({
      results: logsWithOperator,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
