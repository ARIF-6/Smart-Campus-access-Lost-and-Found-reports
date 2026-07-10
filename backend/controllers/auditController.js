const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const APIFeatures = require('../utils/apiFeatures');

// @desc    Get audit logs with filters and pagination
// @route   GET /api/audit-logs
// @access  Private (All roles - Admin sees all, others see their own)
exports.getAuditLogs = async (req, res) => {
  try {
    // Build query based on user role
    let query = {};
    
    // Filter by operator role (only applies when admin is filtering by role)
    if (req.query.role && req.user.role === 'admin') {
      const usersWithRole = await User.find({ role: req.query.role }).select('_id');
      const userIds = usersWithRole.map(u => u._id);
      query.userId = { $in: userIds };
    }
    
    // If user is not admin, only show their own logs
    if (req.user.role !== 'admin') {
      query.userId = req.user.id;
    }
    
    const total = await AuditLog.countDocuments(query);
    
    const apiFeatures = new APIFeatures(
      AuditLog.find(query)
        .populate('userId', 'fullName name email role username'),
      req.query,
      ['action', 'details']
    )
      .search()
      .filter()
      .sort()
      .pagination();
    
    const logs = await apiFeatures.query;
    // Map logs to include operator name and a human-readable target name for frontend
    const logsWithOperator = logs.map(log => {
      const logObj = log.toObject ? log.toObject() : log;
      const operatorName = (log.userId && (log.userId.fullName || log.userId.name)) || 'Unknown';
      
      // Derive targetName: for User targets we can extract from details string
      // e.g. "User logged in: JohnDoe (admin)" → "JohnDoe"
      let targetName = '';
      if (log.targetType === 'User' && log.details) {
        // Extract name from parentheses pattern or colon pattern in the details string
        const colonMatch = log.details.match(/:\s*([^(]+)\s*\(/);
        if (colonMatch) {
          targetName = colonMatch[1].trim();
        } else {
          targetName = log.userId ? (log.userId.fullName || log.userId.name || '') : '';
        }
      } else if (log.targetType && log.targetType !== 'Other' && log.details) {
        // For other types, show the targetType with a short snippet of details
        targetName = '';
      }
      
      return { ...logObj, operator: operatorName, targetName };
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
    console.error('Audit log error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

