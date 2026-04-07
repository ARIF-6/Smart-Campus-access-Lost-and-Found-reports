const AccessLog = require('../models/AccessLog');
const User = require('../models/User');
const { logAction } = require('../utils/auditLogger');

// @desc    Scan QR Code for Campus Access
// @route   POST /api/access/scan
// @access  Private (Security, Admin)
exports.scanQRCode = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Missing userId in request body" });
    }

    // 2. Validate user exists in database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "INVALID QR" });
    }

    // 3. Find latest AccessLog for that user (sort by createdAt DESC)
    const lastLog = await AccessLog.findOne({ userId }).sort({ createdAt: -1 });

    const now = new Date();

    // 4. If NO previous log:
    if (!lastLog) {
      const newLog = await AccessLog.create({
        userId,
        entryTime: now,
        status: "IN"
      });
      return res.status(200).json({ success: true, status: "IN", message: `Access recorded for ${user.name}` });
    }

    // 5. If last status == "IN":
    if (lastLog.status === "IN") {
      // update latest log with exitTime and set status outward if needed
      // Actually the prompt says to "update: exitTime=now, status=OUT" on the same log or insert a new one?
      // "If last status == "IN": -> update: exitTime = now, status = "OUT""
      lastLog.exitTime = now;
      lastLog.status = "OUT";
      await lastLog.save();
      return res.status(200).json({ success: true, status: "OUT", message: `Exit recorded for ${user.name}` });
    }

    // 6. Else (last status == "OUT"): -> create new log
    if (lastLog.status === "OUT") {
      const newLog = await AccessLog.create({
        userId,
        entryTime: now,
        status: "IN"
      });
      
      // Log Audit
      await logAction({
        userId: req.user.id, // The security/admin scanning
        action: 'SCAN_QR',
        targetId: userId,
        targetType: 'User',
        details: `Scanned QR for user ${user.email} (Entry)`,
        req
      });

      return res.status(200).json({ success: true, status: "IN", message: `Entry recorded for ${user.name}` });
    }

  } catch (error) {
    console.error('Scan QR Error:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get all access logs
// @route   GET /api/access/logs
// @access  Private (Admin)
exports.getLogs = async (req, res) => {
  try {
    const logs = await AccessLog.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
