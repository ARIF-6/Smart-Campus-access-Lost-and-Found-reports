const OwnershipReport = require('../models/OwnershipReport');
const FoundItem = require('../models/FoundItem');
const User = require('../models/User');
const OwnershipDispute = require('../models/OwnershipDispute');
const OwnershipHistory = require('../models/OwnershipHistory');
const { createNotification } = require('./notificationController');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const { logAction } = require('../utils/auditLogger');
const { emitDashboardRefresh } = require('../socket/events/notificationEvents');

// @desc    Submit ownership report
// @route   POST /api/ownership-reports
// @access  Private (Student)
exports.submitReport = asyncHandler(async (req, res) => {
  const { itemId, reason, comments } = req.body;
  const userId = req.user.id;

  if (!itemId || !reason || reason.trim() === '') {
    return res.status(400).json({ success: false, message: 'Item ID and reason are required' });
  }

  // Validate ObjectId format before querying to prevent CastError → 404
  if (!/^[a-fA-F0-9]{24}$/.test(itemId)) {
    return res.status(400).json({ success: false, message: 'Invalid item ID format. Please try again.' });
  }

  const item = await FoundItem.findOne({ _id: itemId, isDeleted: { $ne: true } });
  if (!item) {
    return res.status(404).json({ success: false, message: 'Found item not found' });
  }

  if (item.status === 'under_ownership_review') {
    return res.status(400).json({
      success: false,
      message: 'This item is currently under ownership review. No further reports are allowed.'
    });
  }

  if (item.status !== 'returned') {
    return res.status(400).json({ success: false, message: 'Ownership reports can only be submitted for returned items.' });
  }

  // Enforce 24-hour submission limit after item is returned
  const returnedTime = item.returnedAt || item.updatedAt;
  const oneDay = 24 * 60 * 60 * 1000;
  if (Date.now() - new Date(returnedTime).getTime() > oneDay) {
    return res.status(400).json({
      success: false,
      message: 'Ownership claims can only be reported within 24 hours after the item has been returned.'
    });
  }

  // Prevent duplicate ownership reports for the same student and the same item while a previous report is still pending
  const existingPendingReport = await OwnershipReport.findOne({
    student: userId,
    foundItem: itemId,
    status: 'pending',
    isDeleted: false
  });

  if (existingPendingReport) {
    return res.status(400).json({
      success: false,
      message: 'You have already submitted a pending ownership report for this item.'
    });
  }

  const newReport = new OwnershipReport({
    student: userId,
    foundItem: itemId,
    reason: reason.trim(),
    comments: comments ? comments.trim() : '',
    status: 'pending'
  });

  await newReport.save();

  // Create OwnershipDispute
  const originalReturnedStudent = item.currentReturnedStudent || item.user || null;
  const dispute = new OwnershipDispute({
    foundItem: itemId,
    ownershipReport: newReport._id,
    originalReturnedStudent,
    newClaimant: userId,
    status: 'pending'
  });

  await dispute.save();

  // Update item status and active dispute reference
  item.status = 'under_ownership_review';
  item.activeDispute = dispute._id;
  await item.save();

  // Audit Log for Report Submission
  await logAction({
    userId: userId,
    action: 'SUBMIT_OWNERSHIP_REPORT',
    targetId: newReport._id,
    targetType: 'OwnershipReport',
    details: `Student submitted ownership report for found item: ${item.title}`,
    req
  });

  // Audit Log for Dispute Creation
  await logAction({
    userId: userId,
    action: 'CREATE_OWNERSHIP_DISPUTE',
    targetId: dispute._id,
    targetType: 'OwnershipDispute',
    details: `Ownership dispute automatically created for item: ${item.title}`,
    req
  });

  // Create OwnershipHistory record
  try {
    await OwnershipHistory.create({
      foundItem: item._id,
      eventType: 'dispute_created',
      originalFinder: item.createdBy,
      returnedStudent: originalReturnedStudent,
      claimant: userId,
      reason: reason.trim(),
      comments: comments ? comments.trim() : '',
      previousStatus: 'returned',
      newStatus: 'under_ownership_review'
    });
  } catch (err) {
    console.error('Failed to create ownership history:', err);
  }

  // Real-time Notification to the original student who received the item
  if (originalReturnedStudent) {
    try {
      await createNotification({
        userId: originalReturnedStudent,
        title: 'Ownership Dispute',
        message: 'Another student has claimed ownership of the item that was returned to you. Please visit the administration office for verification.',
        type: 'OWNERSHIP_DISPUTE',
        relatedId: dispute._id,
        module: 'LostFound'
      });
    } catch (err) {
      console.error('Notification Error (Original Student):', err);
    }
  }

  // Real-time Notification to Administrator
  try {
    await createNotification({
      title: 'New Ownership Dispute',
      message: `An ownership dispute has been raised for the item "${item.title}".`,
      type: 'CLAIM_SUBMITTED',
      relatedId: dispute._id,
      recipientRole: 'admin',
      module: 'LostFound'
    });
  } catch (err) {
    console.error('Notification Error (Admin):', err);
  }

  emitDashboardRefresh('admin');

  return sendSuccess(res, 'Ownership report submitted and dispute created successfully', { report: newReport, dispute }, 201);
});

// @desc    Get all ownership reports
// @route   GET /api/ownership-reports
// @access  Private (Admin)
exports.getAllReports = asyncHandler(async (req, res) => {
  const reports = await OwnershipReport.find({ isDeleted: false })
    .populate({
      path: 'student',
      select: 'fullName email studentId faculty department class photoUrl'
    })
    .populate('foundItem')
    .populate({
      path: 'adminComments.user',
      select: 'fullName role'
    })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'Ownership reports fetched successfully', reports);
});

// @desc    Get current student's ownership reports
// @route   GET /api/ownership-reports/my-reports
// @access  Private (Student)
exports.getMyReports = asyncHandler(async (req, res) => {
  const reports = await OwnershipReport.find({ student: req.user.id, isDeleted: false })
    .populate('foundItem')
    .populate({
      path: 'adminComments.user',
      select: 'fullName role'
    })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'My ownership reports fetched successfully', reports);
});


// @desc    Get ownership report by ID
// @route   GET /api/ownership-reports/:id
// @access  Private (Admin/Student)
exports.getReportById = asyncHandler(async (req, res) => {
  const report = await OwnershipReport.findById(req.params.id)
    .populate({
      path: 'student',
      select: 'fullName email studentId faculty department class photoUrl',
      populate: [
        { path: 'faculty', select: 'name' },
        { path: 'department', select: 'name' },
        { path: 'class', select: 'name' }
      ]
    })
    .populate('foundItem')
    .populate({
      path: 'adminComments.user',
      select: 'fullName role'
    })
    .lean();

  if (!report) {
    return res.status(404).json({ success: false, message: 'Ownership report not found' });
  }

  return sendSuccess(res, 'Ownership report fetched successfully', report);
});

// @desc    Resolve ownership report (Approve/Reject)
// @route   PATCH /api/ownership-reports/:id/resolve
// @access  Private (Admin)
exports.resolveReport = asyncHandler(async (req, res) => {
  const { status, comment } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid resolution status. Must be approved or rejected.' });
  }

  const report = await OwnershipReport.findById(req.params.id).populate('foundItem');
  if (!report) {
    return res.status(404).json({ success: false, message: 'Ownership report not found' });
  }

  report.status = status;

  if (comment && comment.trim() !== '') {
    report.adminComments.push({
      user: req.user.id,
      comment: comment.trim()
    });
  }

  await report.save();

  // Audit Log
  await logAction({
    userId: req.user.id,
    action: `RESOLVE_OWNERSHIP_REPORT`,
    targetId: report._id,
    targetType: 'OwnershipReport',
    details: `Admin ${status} ownership report for item: ${report.foundItem.title}`,
    req
  });

  // Real-time Notification to Student
  try {
    await createNotification({
      userId: report.student,
      title: `Ownership Report ${status.toUpperCase()}`,
      message: `Your ownership report for "${report.foundItem.title}" has been ${status}.`,
      type: status === 'approved' ? 'CLAIM_APPROVED' : 'CLAIM_REJECTED',
      relatedId: report._id,
      module: 'LostFound'
    });
  } catch (err) {
    console.error('Notification Error:', err);
  }

  emitDashboardRefresh('admin');

  return sendSuccess(res, `Ownership report has been ${status} successfully`, report);
});

// @desc    Add comment to ownership report
// @route   POST /api/ownership-reports/:id/comments
// @access  Private (Admin)
exports.addReportComment = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  if (!comment || comment.trim() === '') {
    return res.status(400).json({ success: false, message: 'Comment cannot be empty' });
  }

  const report = await OwnershipReport.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Ownership report not found' });
  }

  report.adminComments.push({
    user: req.user.id,
    comment: comment.trim()
  });

  await report.save();

  const updatedReport = await OwnershipReport.findById(report._id)
    .populate({
      path: 'adminComments.user',
      select: 'fullName role'
    })
    .lean();

  return sendSuccess(res, 'Comment added successfully', updatedReport.adminComments);
});
