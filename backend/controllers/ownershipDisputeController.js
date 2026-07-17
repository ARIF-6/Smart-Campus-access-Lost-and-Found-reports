const OwnershipDispute = require('../models/OwnershipDispute');
const OwnershipReport = require('../models/OwnershipReport');
const OwnershipHistory = require('../models/OwnershipHistory');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const User = require('../models/User');
const { createNotification } = require('./notificationController');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');
const { logAction } = require('../utils/auditLogger');
const { emitDashboardRefresh } = require('../socket/events/notificationEvents');

// @desc    Get all ownership disputes
// @route   GET /api/ownership-disputes
// @access  Private (Admin)
exports.getAllDisputes = asyncHandler(async (req, res) => {
  const disputes = await OwnershipDispute.find()
    .populate({
      path: 'foundItem',
      select: 'title description category location dateFound image imageUrl status storageLocation'
    })
    .populate({
      path: 'ownershipReport',
      select: 'reason comments status'
    })
    .populate({
      path: 'originalReturnedStudent',
      select: 'fullName email studentId faculty department class photoUrl'
    })
    .populate({
      path: 'newClaimant',
      select: 'fullName email studentId faculty department class photoUrl'
    })
    .populate({
      path: 'adminDecision.resolvedBy',
      select: 'fullName role'
    })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'Ownership disputes fetched successfully', disputes);
});

// @desc    Get ownership dispute by ID
// @route   GET /api/ownership-disputes/:id
// @access  Private (Admin)
exports.getDisputeById = asyncHandler(async (req, res) => {
  const dispute = await OwnershipDispute.findById(req.params.id)
    .populate({
      path: 'foundItem',
      select: 'title description category location dateFound image imageUrl status storageLocation createdBy returnedAt'
    })
    .populate({
      path: 'ownershipReport',
      select: 'reason comments status adminComments'
    })
    .populate({
      path: 'originalReturnedStudent',
      select: 'fullName email studentId faculty department class photoUrl',
      populate: [
        { path: 'faculty', select: 'name' },
        { path: 'department', select: 'name' },
        { path: 'class', select: 'name' }
      ]
    })
    .populate({
      path: 'newClaimant',
      select: 'fullName email studentId faculty department class photoUrl',
      populate: [
        { path: 'faculty', select: 'name' },
        { path: 'department', select: 'name' },
        { path: 'class', select: 'name' }
      ]
    })
    .populate({
      path: 'adminDecision.resolvedBy',
      select: 'fullName role'
    })
    .lean();

  if (!dispute) {
    return res.status(404).json({ success: false, message: 'Ownership dispute not found' });
  }

  // Also query other claims for this item for admin context
  const claims = await Claim.find({ item: dispute.foundItem?._id, isDeleted: false })
    .populate('user', 'fullName studentId role')
    .sort({ createdAt: -1 })
    .lean();

  // Query ownership history for this item
  const history = await OwnershipHistory.find({ foundItem: dispute.foundItem?._id })
    .populate('originalFinder', 'fullName studentId')
    .populate('returnedStudent', 'fullName studentId')
    .populate('claimant', 'fullName studentId')
    .populate('resolvedBy', 'fullName studentId')
    .sort({ createdAt: 1 })
    .lean();

  return sendSuccess(res, 'Ownership dispute details fetched successfully', {
    dispute,
    claims,
    history
  });
});

// @desc    Resolve ownership dispute
// @route   POST /api/ownership-disputes/:id/resolve
// @access  Private (Admin)
exports.resolveDispute = asyncHandler(async (req, res) => {
  const { decision, reason, comment } = req.body;

  if (!['original', 'new'].includes(decision)) {
    return res.status(400).json({ success: false, message: 'Invalid decision. Must be original or new.' });
  }
  if (!reason || reason.trim() === '') {
    return res.status(400).json({ success: false, message: 'Reason is required to resolve a dispute.' });
  }

  const dispute = await OwnershipDispute.findById(req.params.id);
  if (!dispute) {
    return res.status(404).json({ success: false, message: 'Ownership dispute not found' });
  }
  if (dispute.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'This dispute has already been resolved.' });
  }

  const item = await FoundItem.findById(dispute.foundItem);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Associated found item not found' });
  }

  const report = await OwnershipReport.findById(dispute.ownershipReport);

  dispute.status = decision === 'original' ? 'resolved_original' : 'resolved_new';
  dispute.adminDecision = {
    reason: reason.trim(),
    comment: comment ? comment.trim() : '',
    resolvedBy: req.user.id,
    resolvedAt: new Date()
  };
  await dispute.save();

  if (decision === 'original') {
    // 1. Confirm original owner: Reject the new claim
    if (report) {
      report.status = 'rejected';
      if (comment) {
        report.adminComments.push({
          user: req.user.id,
          comment: comment.trim()
        });
      }
      await report.save();
    }

    // 2. Change item status back to Returned
    item.status = 'returned';
    item.activeDispute = null;
    await item.save();

    // 3. Write OwnershipHistory entry
    try {
      await OwnershipHistory.create({
        foundItem: item._id,
        eventType: 'dispute_resolved_original',
        originalFinder: item.createdBy,
        returnedStudent: dispute.originalReturnedStudent,
        claimant: dispute.newClaimant,
        resolvedBy: req.user.id,
        decision: 'Confirmed original recipient',
        reason: reason.trim(),
        comments: comment ? comment.trim() : '',
        previousStatus: 'under_ownership_review',
        newStatus: 'returned'
      });
    } catch (err) {
      console.error('Failed to save dispute resolution history:', err);
    }

    // 4. Audit Log
    await logAction({
      userId: req.user.id,
      action: 'RESOLVE_DISPUTE_CONFIRM_ORIGINAL',
      targetId: dispute._id,
      targetType: 'OwnershipDispute',
      details: `Admin confirmed original returned owner for item "${item.title}". Reason: ${reason}`,
      req
    });

    // 5. Notify new claimant
    try {
      await createNotification({
        userId: dispute.newClaimant,
        title: 'Ownership Report Rejected',
        message: 'Your ownership report has been rejected after verification.',
        type: 'CLAIM_REJECTED',
        relatedId: dispute._id,
        module: 'LostFound'
      });
    } catch (err) {
      console.error('Notification error (Claimant):', err);
    }

    // 6. Notify original student
    try {
      await createNotification({
        userId: dispute.originalReturnedStudent,
        title: 'Ownership Verification Completed',
        message: 'Ownership verification has been completed. The returned item remains assigned to you.',
        type: 'CLAIM_APPROVED',
        relatedId: dispute._id,
        module: 'LostFound'
      });
    } catch (err) {
      console.error('Notification error (Original):', err);
    }

  } else {
    // 1. Confirm new claimant: Approve report, transfer ownership
    if (report) {
      report.status = 'approved';
      if (comment) {
        report.adminComments.push({
          user: req.user.id,
          comment: comment.trim()
        });
      }
      await report.save();
    }

    // 2. Cancel previous Claim and make a new Claim request record
    try {
      // Find the approved claim belonging to the original returned student
      const originalClaim = await Claim.findOne({
        item: item._id,
        user: dispute.originalReturnedStudent,
        status: 'approved'
      });
      if (originalClaim) {
        originalClaim.status = 'rejected'; // cancel/revoke the old claim approval
        await originalClaim.save();
      }

      // Create a new approved Claim for the new owner to keep data models synchronized
      const newClaim = new Claim({
        user: dispute.newClaimant,
        item: item._id,
        itemType: 'found',
        message: `Approved via dispute resolution: ${reason.trim()}`,
        status: 'approved'
      });
      await newClaim.save();
    } catch (err) {
      console.error('Failed to update Claim requests during dispute resolution:', err);
    }

    // 3. Update FoundItem owner details
    item.status = 'returned';
    item.currentReturnedStudent = dispute.newClaimant;
    item.activeDispute = null;
    await item.save();

    // 4. Write OwnershipHistory entry
    try {
      await OwnershipHistory.create({
        foundItem: item._id,
        eventType: 'dispute_resolved_transfer',
        originalFinder: item.createdBy,
        returnedStudent: dispute.newClaimant, // new student
        claimant: dispute.newClaimant,
        resolvedBy: req.user.id,
        decision: 'Transferred ownership to claimant',
        reason: reason.trim(),
        comments: comment ? comment.trim() : '',
        previousStatus: 'under_ownership_review',
        newStatus: 'returned'
      });
    } catch (err) {
      console.error('Failed to save dispute transfer history:', err);
    }

    // 5. Audit Log
    await logAction({
      userId: req.user.id,
      action: 'RESOLVE_DISPUTE_TRANSFER_OWNERSHIP',
      targetId: dispute._id,
      targetType: 'OwnershipDispute',
      details: `Admin transferred ownership of item "${item.title}" to student ID: ${dispute.newClaimant}. Reason: ${reason}`,
      req
    });

    // 6. Notify previous student
    try {
      await createNotification({
        userId: dispute.originalReturnedStudent,
        title: 'Ownership Updated',
        message: 'After administrative verification, ownership of this item has been transferred to another student. Please contact the administration office if you need further clarification.',
        type: 'CLAIM_REJECTED',
        relatedId: dispute._id,
        module: 'LostFound'
      });
    } catch (err) {
      console.error('Notification error (Original):', err);
    }

    // 7. Notify new claimant
    try {
      await createNotification({
        userId: dispute.newClaimant,
        title: 'Ownership Claim Approved',
        message: 'Congratulations! Your ownership claim has been approved. The item has been assigned to you. Please visit the administration office to collect your item.',
        type: 'CLAIM_APPROVED',
        relatedId: dispute._id,
        module: 'LostFound'
      });
    } catch (err) {
      console.error('Notification error (Claimant):', err);
    }
  }

  emitDashboardRefresh('admin');

  return sendSuccess(res, 'Dispute resolved successfully', dispute);
});

// @desc    Get ownership history for an item
// @route   GET /api/ownership-disputes/history/:itemId
// @access  Private (Admin)
exports.getItemOwnershipHistory = asyncHandler(async (req, res) => {
  const history = await OwnershipHistory.find({ foundItem: req.params.itemId })
    .populate('originalFinder', 'fullName studentId email role')
    .populate('returnedStudent', 'fullName studentId email faculty department class')
    .populate('claimant', 'fullName studentId email faculty department class')
    .populate('resolvedBy', 'fullName studentId role')
    .sort({ createdAt: 1 })
    .lean();

  return sendSuccess(res, 'Item ownership history fetched successfully', history);
});
