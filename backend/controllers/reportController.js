const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const ClaimRequest = require('../models/ClaimRequest');
const User = require('../models/User');
const Incident = require('../models/Incident');
const Visitor = require('../models/Visitor');
const AccessLog = require('../models/AccessLog');
const AuditLog = require('../models/AuditLog');
const DailyNoExitReport = require('../models/DailyNoExitReport');
const Hall = require('../models/Hall');
const { checkAndGenerateDailyNoExitReports } = require('../utils/reportHelper');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const { logAction } = require('../utils/auditLogger');

/**
 * Common helper to filter by date range, category, and status
 */
const buildFilters = (query) => {
  const { startDate, endDate, category, status } = query;
  const filter = { isDeleted: false };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  if (category && category !== 'All') {
    filter.category = category;
  }

  if (status && status !== 'All') {
    filter.status = status;
  }

  return filter;
};

const buildClaimFilters = (query) => {
  const filters = buildFilters(query);

  if (filters.status) {
    filters.status = filters.status.toUpperCase();
  }

  return filters;
};

/**
 * Handle CSV Export
 */
const exportCSV = (res, data, fields, filename) => {
  const json2csvParser = new Parser({ fields });
  const csv = json2csvParser.parse(data);
  
  res.header('Content-Type', 'text/csv');
  res.attachment(`${filename}.csv`);
  return res.send(csv);
};

/**
 * Handle PDF Export
 */
const exportPDF = (res, data, title, columns, filename) => {
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  
  res.header('Content-Type', 'application/pdf');
  res.attachment(`${filename}.pdf`);
  doc.pipe(res);

  // Title
  doc.fontSize(20).text('Smart Campus System Report', { align: 'center' });
  doc.fontSize(14).text(title, { align: 'center' });
  doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(2);

  // Table Header
  const tableTop = doc.y;
  let currentY = tableTop;
  const colWidth = (doc.page.width - 60) / columns.length;

  doc.fontSize(10).font('Helvetica-Bold');
  columns.forEach((col, i) => {
    doc.text(col.label, 30 + (i * colWidth), currentY);
  });
  
  doc.moveTo(30, currentY + 15).lineTo(doc.page.width - 30, currentY + 15).stroke();
  currentY += 25;

  // Table Body
  doc.font('Helvetica').fontSize(9);
  data.forEach((item) => {
    if (currentY > doc.page.height - 50) {
      doc.addPage();
      currentY = 30;
      // Re-draw header on new page if needed (simplified here)
    }

    columns.forEach((col, i) => {
      const val = col.key.split('.').reduce((obj, key) => obj?.[key], item) || '-';
      doc.text(String(val), 30 + (i * colWidth), currentY, { width: colWidth - 10 });
    });

    currentY += 20;
  });

  doc.end();
};

// @desc    Export Lost Items Report
// @route   GET /api/reports/lost-items
// @access  Admin
exports.exportLostItems = async (req, res) => {
  try {
    const filters = buildFilters(req.query);
    const items = await LostItem.find(filters).sort({ createdAt: -1 });

    const reportData = items.map(item => ({
      title: item.title,
      category: item.category,
      status: item.status,
      location: item.locationLost,
      createdAt: item.createdAt.toLocaleString()
    }));

    const format = req.query.format || 'csv';
    
    // Audit Log
    await logAction({
      userId: req.user.id,
      action: 'EXPORT_REPORT',
      details: `Exported Lost Items Report as ${format.toUpperCase()}`,
      req
    });

    if (format === 'pdf') {
      const columns = [
        { label: 'Title', key: 'title' },
        { label: 'Category', key: 'category' },
        { label: 'Status', key: 'status' },
        { label: 'Location', key: 'location' },
        { label: 'Date', key: 'createdAt' }
      ];
      return exportPDF(res, reportData, 'Lost Items Report', columns, 'lost-items-report');
    }

    return exportCSV(res, reportData, ['title', 'category', 'status', 'location', 'createdAt'], 'lost-items-report');

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Claims Report
// @route   GET /api/reports/claims
// @access  Admin
exports.exportClaims = async (req, res) => {
  try {
    const filters = buildClaimFilters(req.query);
    const claims = await ClaimRequest.find(filters)
      .populate('foundItemId', 'title')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    const reportData = claims.map(claim => ({
      item: claim.foundItemId?.title || 'Unknown',
      user: claim.userId?.name || 'Unknown',
      userEmail: claim.userId?.email || '-',
      status: claim.status,
      createdAt: claim.createdAt.toLocaleString()
    }));

    const format = req.query.format || 'csv';

    // Audit Log
    await logAction({
      userId: req.user.id,
      action: 'EXPORT_REPORT',
      details: `Exported Claims Report as ${format.toUpperCase()}`,
      req
    });

    if (format === 'pdf') {
      const columns = [
        { label: 'Found Item', key: 'item' },
        { label: 'Claimed By', key: 'user' },
        { label: 'Email', key: 'userEmail' },
        { label: 'Status', key: 'status' },
        { label: 'Date', key: 'createdAt' }
      ];
      return exportPDF(res, reportData, 'Claim Requests Report', columns, 'claims-report');
    }

    return exportCSV(res, reportData, ['item', 'user', 'userEmail', 'status', 'createdAt'], 'claims-report');

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Users Report
// @route   GET /api/reports/users
// @access  Admin
exports.exportUsersCount = async (req, res) => {
  try {
    // Note: Users might not have 'category', but they have 'role' and 'status' (if implemented)
    let { role } = req.query;
    const filter = { isDeleted: false };
    if (role === 'cleaner') role = 'clean';
    if (role && role !== 'All') filter.role = role;

    const users = await User.find(filter).sort({ createdAt: -1 });

    const reportData = users.map(user => ({
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt.toLocaleString()
    }));

    const format = req.query.format || 'csv';

    // Audit Log
    await logAction({
      userId: req.user.id,
      action: 'EXPORT_REPORT',
      details: `Exported Users Report as ${format.toUpperCase()}`,
      req
    });

    if (format === 'pdf') {
      const columns = [
        { label: 'Name', key: 'name' },
        { label: 'Email', key: 'email' },
        { label: 'Role', key: 'role' },
        { label: 'Joined Date', key: 'createdAt' }
      ];
      return exportPDF(res, reportData, 'Users Registry Report', columns, 'users-report');
    }

    return exportCSV(res, reportData, ['name', 'email', 'role', 'createdAt'], 'users-report');

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all system reports (aggregated view for admin Reports page)
// @route   GET /api/reports/system
// @access  Admin / Staff
exports.getAllSystemReports = async (req, res) => {
  try {
    await checkAndGenerateDailyNoExitReports();
    const { startDate, endDate, module } = req.query;

    // Build date filter
    const dateFilter = {};
    const noExitFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      noExitFilter.date = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
        noExitFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
        noExitFilter.date.$lte = end;
      }
    }

    const isStaff = req.user?.role === 'staff';
    let guardIds = [];
    if (isStaff && req.user.campus) {
      // Find IDs of all security guards assigned to the same campus as this staff
      const guards = await User.find({ role: 'security', campus: req.user.campus, isDeleted: false }).select('_id');
      guardIds = guards.map(g => g._id);
    }

    const [lostItems, foundItems, claims, users, incidents, visitors, accessLogs, auditLogs, noExitReports] =
      await Promise.all([
        LostItem.find({ isDeleted: false, ...dateFilter })
          .select('title category status locationLost createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        FoundItem.find({ isDeleted: false, ...dateFilter })
          .select('title category status location createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        ClaimRequest.find({ ...dateFilter })
          .populate('foundItemId', 'title')
          .populate('userId', 'name email')
          .select('status createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        User.find({
          isDeleted: false,
          ...dateFilter,
          // Staff can only see students, security, and cleaners they personally registered
          ...(isStaff ? { createdBy: req.user.id, role: { $nin: ['admin', 'superadmin', 'staff'] } } : {}),
        })
          .populate('faculty', 'name')
          .populate('department', 'name')
          .populate('class', 'name')
          .populate('campus', 'name')
          .select('fullName name email username studentId parentNumber photoUrl faculty department class campus assignedShift shiftStartTime shiftEndTime academicYear role createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        Incident.find({
          ...dateFilter,
          // Staff can only see incidents reported by security guards on their campus
          ...(isStaff ? { reportedBy: { $in: guardIds } } : {}),
        })
          .populate('reportedBy', 'fullName')
          .select('reportedBy type severity status location description createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        Visitor.find({
          ...dateFilter,
          // Staff can only see visitors registered by security guards on their campus
          ...(isStaff ? { registeredBy: { $in: guardIds } } : {}),
        })
          .populate('registeredBy', 'fullName')
          .select('registeredBy name purpose status entryTime exitTime createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        AccessLog.find({
          ...dateFilter,
          // Staff can only see access logs scanned by security guards on their campus
          ...(isStaff ? { scannedBy: { $in: guardIds } } : {}),
        })
          .populate('userId', 'fullName name role')
          .select('scannedBy status entryTime exitTime createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        AuditLog.find({ ...dateFilter })
          .populate('userId', 'fullName name role')
          .select('action details targetType ipAddress createdAt')
          .sort({ createdAt: -1 })
          .limit(500)
          .lean(),

        DailyNoExitReport.find({ ...noExitFilter })
          .populate('students.userId', 'fullName studentId createdBy')
          .sort({ date: -1 })
          .limit(500)
          .lean(),
      ]);

    // If staff, filter students inside noExitReports in-memory to only show their own registered students
    if (isStaff) {
      noExitReports.forEach(rep => {
        if (rep.students) {
          rep.students = rep.students.filter(
            s => s.userId && String(s.userId.createdBy) === String(req.user.id)
          );
        }
      });
    }

    // Resolve halls for users
    const classIds = users.filter(u => u.class?._id || u.class).map(u => u.class?._id || u.class);
    const hallsList = classIds.length ? await Hall.find({ classes: { $in: classIds } }).select('name classes').lean() : [];
    const hallMap = {};
    hallsList.forEach(h => {
      if (Array.isArray(h.classes)) {
        h.classes.forEach(cId => {
          hallMap[cId.toString()] = h.name;
        });
      }
    });

    const enrichedUsers = users.map(u => {
      const studentClassId = u.class?._id || u.class;
      return {
        ...u,
        hallName: studentClassId ? (hallMap[studentClassId.toString()] || '—') : '—'
      };
    });

    // Build summary counts
    const summary = {
      lostItems: lostItems.length,
      foundItems: foundItems.length,
      claims: claims.length,
      users: enrichedUsers.length,
      incidents: incidents.length,
      visitors: visitors.length,
      accessLogs: accessLogs.length,
      auditLogs: auditLogs.length,
      noExitReports: noExitReports.length,
    };

    res.json({
      success: true,
      data: {
        summary,
        lostItems,
        foundItems,
        claims,
        users: enrichedUsers,
        incidents,
        visitors,
        accessLogs,
        auditLogs,
        noExitReports,
      },
    });
  } catch (error) {
    console.error('getAllSystemReports error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
