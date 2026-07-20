const Claim = require('../models/Claim');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const Item = require('../models/Item');
const { logAction } = require('../utils/auditLogger');
const { createNotification } = require('./notificationController');
const mongoose = require('mongoose');
const { emitDashboardRefresh, emitGlobalEvent } = require('../socket/events/notificationEvents');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

// @desc    Create claim
// @route   POST /api/claims
// @access  Private
exports.submitClaim = asyncHandler(async (req, res) => {
  const { itemId, message } = req.body;
  const userId = req.user.id;

  if (!itemId || !message || message.trim() === '') {
    return res.status(400).json({ success: false, message: "Missing required fields: itemId or message" });
  }

  if (!mongoose.Types.ObjectId.isValid(itemId)) {
    return res.status(400).json({ success: false, message: "Invalid item ID format" });
  }

  // Check if item exists in any collection
  let item;
  let itemModelName;
  let itemTypeStr;

  item = await FoundItem.findById(itemId);
  if (item) {
    itemModelName = 'FoundItem';
    itemTypeStr = 'found';
  } else {
    item = await LostItem.findById(itemId);
    if (item) {
      itemModelName = 'LostItem';
      itemTypeStr = 'lost';
    } else {
      item = await Item.findById(itemId);
      if (item) {
        itemModelName = 'Item';
        itemTypeStr = item.type || 'found';
      }
    }
  }

  if (!item) {
    return res.status(404).json({ success: false, message: "Item not found" });
  }

  // Prevent claiming items that are already returned, claimed, or approved
  if (['returned', 'claimed', 'approved'].includes(item.status)) {
    return res.status(400).json({
      success: false,
      message: "An ownership claim has already been submitted for this item. Please wait until the current claim is resolved."
    });
  }

  // Prevent Duplicate Claim (also block users whose previous claim was rejected)
  const existingClaim = await Claim.findOne({
    user: userId,
    item: itemId,
    isDeleted: false,
    status: { $in: ['pending', 'approved', 'rejected'] } // block all – once rejected, cannot re-claim
  });

  if (existingClaim) {
    if (existingClaim.status === 'rejected') {
      return res.status(400).json({ success: false, message: "Your previous claim for this item was rejected. You cannot submit another claim for the same item." });
    }
    return res.status(400).json({ success: false, message: "You have already submitted a claim for this item" });
  }

  // Create new claim
    const path = require('path');
    const uploadsRoot = path.join(__dirname, '..', 'uploads');
    const proofImagePath = req.file ? path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/') : null;
    const newClaim = new Claim({
      user: userId,
      item: itemId,
      itemType: itemTypeStr,
      itemModel: itemModelName,
      message: message.trim(),
      proofImage: proofImagePath,
      status: "pending"
    });

  await newClaim.save();

  // Mark item as claimed/locked immediately so other students cannot claim it
  if (itemModelName === 'FoundItem') {
    await FoundItem.findByIdAndUpdate(itemId, { status: 'claimed' });
  } else if (itemModelName === 'LostItem') {
    await LostItem.findByIdAndUpdate(itemId, { status: 'claimed' });
  } else if (itemModelName === 'Item') {
    await Item.findByIdAndUpdate(itemId, { status: 'claimed' });
  }

  // Log audit
  await logAction({
    userId: userId,
    action: 'SUBMIT_CLAIM',
    targetId: newClaim._id,
    targetType: 'Claim',
    details: `Student submitted a claim for ${itemModelName}: ${item.title}`,
    req
  });

  // Notify Admins & Staff
  try {
    const notificationData = {
      title: 'New Claim Request',
      message: `${req.user.fullName} has submitted a claim for "${item.title}".`,
      type: 'CLAIM_SUBMITTED',
      relatedId: newClaim._id
    };

    await createNotification({ ...notificationData, recipientRole: 'admin' });
    await createNotification({ ...notificationData, recipientRole: 'staff' });

    if (item.createdBy) {
      await createNotification({
        userId: item.createdBy,
        title: 'New Claim for Your Item',
        message: `${req.user.fullName} has requested a claim for the item "${item.title}" you reported.`,
        type: 'CLAIM_SUBMITTED',
        relatedId: newClaim._id
      });
    }
  } catch (err) {
    console.error('Notification Error:', err);
  }

  emitGlobalEvent('claim:updated', newClaim);

  return sendSuccess(res, 'Claim submitted successfully', newClaim, 201);
});

// @desc    Get all claims
// @route   GET /api/claims
// @access  Private (Admin)
exports.getAllClaims = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const claims = await Claim.find({ isDeleted: false })
    .populate({
      path: 'user',
      select: 'fullName email studentId faculty department class photoUrl',
      populate: [
        { path: 'faculty', select: 'name' },
        { path: 'department', select: 'name' },
        { path: 'class', select: 'name' }
      ]
    })
    .populate('item')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Claim.countDocuments({ isDeleted: false });

  return sendSuccess(res, 'Claims fetched successfully', {
    items: claims,
    total,
    page,
    limit
  });
});

// @desc    Get current user's claims
// @route   GET /api/claims/my
// @access  Private
exports.getMyClaims = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ user: req.user.id, isDeleted: false })
    .populate("item", "title image category location")
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'My claims fetched successfully', claims);
});

// @desc    Get claim by ID
// @route   GET /api/claims/:id
// @access  Private
exports.getClaimById = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id)
    .populate('user', 'fullName email studentId name photoUrl')
    .populate('item')
    .lean();
      
  if (!claim) {
    return res.status(404).json({ success: false, message: 'Claim not found' });
  }
    
  return sendSuccess(res, 'Claim fetched successfully', claim);
});

// @desc    Update claim status (Unified)
// @route   PUT /api/claims/:id
// @access  Private (Admin/Staff)
exports.updateClaimStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  const claim = await Claim.findById(req.params.id).populate('item');
  if (!claim) {
    return res.status(404).json({ success: false, message: 'Claim not found' });
  }

  claim.status = status;
  await claim.save();

  const itemCollections = {
    'LostItem': LostItem,
    'FoundItem': FoundItem,
    'Item': Item
  };
  const Model = itemCollections[claim.itemModel];
  if (Model) {
    if (status === 'approved') {
      // Approve: mark item as approved
      await Model.findByIdAndUpdate(claim.item, { status: 'approved' });
    } else if (status === 'rejected') {
      // Reject: reset item back to pending so other users can claim it
      await Model.findByIdAndUpdate(claim.item, { status: 'pending' });
    }
  }

  // Log the update
  await logAction({
    userId: req.user.id,
    action: 'UPDATE_CLAIM_STATUS',
    targetId: claim._id,
    targetType: 'Claim',
    details: `Admin updated claim status to ${status}`,
    req
  });

  // Notify Student
  try {
    if (status === 'approved') {
      await createNotification({
        userId: claim.user,
        title: 'Claim APPROVED',
        message: 'your claim was accepted come an take it',
        type: 'CLAIM_APPROVED',
        relatedId: claim._id
      });
    } else if (status === 'rejected') {
      await createNotification({
        userId: claim.user,
        title: 'Claim REJECTED',
        message: `Your claim for "${claim.item?.title || 'item'}" has been rejected.`,
        type: 'CLAIM_REJECTED',
        relatedId: claim._id
      });
    }
  } catch (err) {
    console.error('Notification Error:', err);
  }

  // Trigger dashboard refreshes
  emitDashboardRefresh('admin');
  emitDashboardRefresh('staff');

  emitGlobalEvent('claim:updated', claim);

  return sendSuccess(res, `Claim ${status} successfully`, claim);
});

// @desc    Approve claim
// @route   PATCH /api/claims/:id/approve
// @access  Private (Admin)
exports.approveClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id).populate('item');
  if (!claim) {
    return res.status(404).json({ success: false, message: 'Claim not found' });
  }

  claim.status = "approved";
  await claim.save();

  // Update related item status
  const itemCollections = {
    'LostItem': LostItem,
    'FoundItem': FoundItem,
    'Item': Item
  };

  const Model = itemCollections[claim.itemModel];
  if (Model) {
    await Model.findByIdAndUpdate(claim.item, { status: 'approved' });
  }

  // Log the approval
  await logAction({
    userId: req.user.id,
    action: 'APPROVE_CLAIM',
    targetId: claim._id,
    targetType: 'Claim',
    details: `Admin approved claim for ${claim.itemType} item`,
    req
  });

  // Notify Student
  try {
    await createNotification({
      userId: claim.user,
      title: 'Claim APPROVED',
      message: 'your claim was accepted come an take it',
      type: 'CLAIM_APPROVED',
      relatedId: claim._id
    });
  } catch (err) {
    console.error('Notification Error:', err);
  }

  emitGlobalEvent('claim:updated', claim);

  return sendSuccess(res, 'Claim approved successfully', claim);
});

// @desc    Reject claim
// @route   PATCH /api/claims/:id/reject
// @access  Private (Admin)
exports.rejectClaim = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id).populate('item');
  if (!claim) {
    return res.status(404).json({ success: false, message: 'Claim not found' });
  }

  claim.status = "rejected";
  await claim.save();

  // Update related item status
  const itemCollections = {
    'LostItem': LostItem,
    'FoundItem': FoundItem,
    'Item': Item
  };

  const Model = itemCollections[claim.itemModel];
  if (Model) {
    // Reset item back to pending so other users can claim it
    await Model.findByIdAndUpdate(claim.item, { status: 'pending' });
  }

  // Log the rejection
  await logAction({
    userId: req.user.id,
    action: 'REJECT_CLAIM',
    targetId: claim._id,
    targetType: 'Claim',
    details: `Admin rejected claim for ${claim.itemType} item`,
    req
  });

  // Notify Student
  try {
    await createNotification({
      userId: claim.user,
      title: 'Claim REJECTED',
      message: `Your claim for "${claim.item?.title || 'item'}" has been rejected.`,
      type: 'CLAIM_REJECTED',
      relatedId: claim._id
    });
  } catch (err) {
    console.error('Notification Error:', err);
  }

  emitGlobalEvent('claim:updated', claim);

  return sendSuccess(res, 'Claim rejected successfully', claim);
});

// @desc    Get trashed claims
// @route   GET /api/trash/claims
// @access  Private/Admin
exports.getTrashedClaims = asyncHandler(async (req, res) => {
  const claims = await Claim.find({ isDeleted: true })
    .populate('user', 'fullName email name')
    .populate('item')
    .sort({ deletedAt: -1 })
    .lean();

  return sendSuccess(res, 'Trashed claims fetched successfully', claims);
});

