const fs = require('fs');
const path = require('path');
const FoundItem = require('../models/FoundItem');
const Claim = require('../models/Claim');
const { findMatchesForFoundItem } = require('../services/matchService');
const { logAction } = require('../utils/auditLogger');
const APIFeatures = require('../utils/apiFeatures');
const { createNotification } = require('./notificationController');
const { emitGlobalEvent } = require('../socket/events/notificationEvents');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

/**
 * Deletes the physical image of a found item (local disk or Cloudinary)
 * and clears the image fields on the item document (does NOT save).
 */
async function clearItemImage(item) {
  if (!item.image && !item.imageUrl) return;

  const imagePath = item.image || item.imageUrl;

  if (imagePath && imagePath.includes('cloudinary')) {
    try {
      const cloudinary = require('../config/cloudinary');
      const urlParts = imagePath.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0];
      const folderPath = urlParts.slice(urlParts.indexOf('upload') + 2, urlParts.length - 1).join('/');
      const fullPublicId = folderPath ? `${folderPath}/${publicId}` : publicId;
      await cloudinary.uploader.destroy(fullPublicId);
    } catch (err) {
      console.error('Failed to delete image from Cloudinary:', err);
    }
  } else if (imagePath) {
    // Local file — resolve relative to uploads directory
    try {
      const uploadsRoot = path.join(__dirname, '..', 'uploads');
      const localPath = path.join(uploadsRoot, imagePath.replace(/^\/+/, ''));
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
    } catch (err) {
      console.error('Failed to delete local image file:', err);
    }
  }

  item.image = '';
  item.imageUrl = '';
}

// @desc    Report a found item
// @route   POST /api/found-items
// @access  Private (Security, Cleaner, Admin)
exports.reportFoundItem = asyncHandler(async (req, res) => {
  const { title, description, category, locationFound, dateFound, storageLocation, priority, notes } = req.body;
  
  if (!title || !category || !locationFound) {
    return res.status(400).json({ success: false, message: 'Title, category, and location are required' });
  }

    const path = require('path');
    const uploadsRoot = path.join(__dirname, '..', 'uploads');
    const imagePath = req.file ? path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/') : '';
    const newItem = new FoundItem({
      title,
      description,
      category,
      location: locationFound,
      dateFound: dateFound || Date.now(),
      image: imagePath,
      imageUrl: imagePath,
      storageLocation: storageLocation || '',
      priority: priority || 'low',
      notes: notes || '',
    createdBy: req.user.id,
    user: req.user.id
  });

  const savedItem = await newItem.save();

  // Log audit
  await logAction({
    userId: req.user.id,
    action: 'CREATE_FOUND_ITEM',
    targetId: savedItem._id,
    targetType: 'FoundItem',
    details: `Reported found item: ${savedItem.title}`,
    req
  });

  // Notify Admins, Staff, and Students
  try {
    const notificationData = {
      title: 'New Found Item Reported',
      message: `A new found item "${savedItem.title}" has been reported at ${savedItem.location}.`,
      type: 'FOUND_ITEM_REPORTED',
      relatedId: savedItem._id
    };

    await createNotification({ ...notificationData, recipientRole: 'admin' });
    await createNotification({ ...notificationData, recipientRole: 'staff' });
    await createNotification({ ...notificationData, recipientRole: 'student' });
  } catch (err) {
    console.error('Notification Error:', err);
  }

  // Trigger matching in the background
  findMatchesForFoundItem(savedItem._id).catch(err => {
    console.error('Matching Service Error:', err);
  });

  emitGlobalEvent('foundItem:created', savedItem);

  return sendSuccess(res, 'Found item reported successfully', savedItem, 201);
});

// @desc    Get all found items (with search and filters)
// @route   GET /api/found-items
// @access  Public or loosely Private
exports.getAllFoundItems = asyncHandler(async (req, res) => {
  const searchableFields = ['title', 'description', 'location'];
  const features = new APIFeatures(FoundItem.find({ isDeleted: { $ne: true } }), req.query, searchableFields)
    .search()
    .filter()
    .sort()
    .pagination();

  const items = await features.query.populate('createdBy', 'name fullName email').lean();
  const total = await FoundItem.countDocuments({ isDeleted: { $ne: true }, ...features.filterCriteria });

  // Check claim status for authenticated user (exclude rejected claims so UI shows correct state)
  let claimedItemIds = [];
  let rejectedItemIds = [];
  if (req.user && req.user.id) {
    const userClaims = await Claim.find({ 
      user: req.user.id, 
      isDeleted: false 
    }).select('item status').lean();
    // Only mark as claimed if the claim is pending or approved (not rejected)
    claimedItemIds = userClaims
      .filter(c => c.status !== 'rejected')
      .map(c => c.item.toString());
    rejectedItemIds = userClaims
      .filter(c => c.status === 'rejected')
      .map(c => c.item.toString());
  }

  const itemsWithClaimStatus = items.map(item => ({
    ...item,
    isClaimedByUser: claimedItemIds.includes(item._id.toString()),
    isRejectedByUser: rejectedItemIds.includes(item._id.toString())
  }));

  return sendSuccess(res, 'Found items fetched successfully', {
    items: itemsWithClaimStatus,
    total,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10
  });
});

// @desc    Get current user's found items
// @route   GET /api/found-items/my
// @access  Private
exports.getMyFoundItems = asyncHandler(async (req, res) => {
  const items = await FoundItem.find({ createdBy: req.user.id, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'My found items fetched successfully', items);
});

// @desc    Get single found item
// @route   GET /api/found-items/:id
// @access  Public or loosely Private
exports.getFoundItemById = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id)
    .populate('createdBy', 'name fullName email role')
    .populate('possibleMatch')
    .lean();

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  return sendSuccess(res, 'Found item fetched successfully', item);
});

// @desc    Update found item
// @route   PUT /api/found-items/:id
// @access  Private (Admin, Security)
exports.updateFoundItem = asyncHandler(async (req, res) => {
  const { title, description, category, locationFound, status, storageLocation, priority, notes } = req.body;

  const item = await FoundItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  const oldStatus = item.status;
  item.title = title || item.title;
  item.description = description || item.description;
  item.category = category || item.category;
  if (locationFound) item.location = locationFound;
  item.status = status || item.status;
  item.storageLocation = storageLocation !== undefined ? storageLocation : item.storageLocation;
  item.priority = priority || item.priority;
  item.notes = notes !== undefined ? notes : item.notes;



  const updatedItem = await item.save();

  if (item.status === 'returned' && oldStatus !== 'returned') {
    try {
      const claim = await Claim.findOne({ item: item._id, status: 'approved' });
      if (claim) {
        await createNotification({
          userId: claim.user,
          title: 'Claim Accepted',
          message: 'your claim was accepted come an take it',
          type: 'CLAIM_APPROVED',
          relatedId: claim._id
        });
      }
    } catch (err) {
      console.error('Claimant Notification Error:', err);
    }
  }

  return sendSuccess(res, 'Found item updated successfully', updatedItem);
});

// @desc    Delete found item
// @route   DELETE /api/found-items/:id
// @access  Private (Admin only)
exports.deleteFoundItem = asyncHandler(async (req, res) => {
  // Permanently delete the found item from the database
  const item = await FoundItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  // If the item has an image stored on Cloudinary, delete it
  if (item.image && item.image.includes('cloudinary')) {
    try {
      const cloudinary = require('../config/cloudinary');
      const urlParts = item.image.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0];
      const folderPath = urlParts.slice(urlParts.indexOf('upload') + 2, urlParts.length - 1).join('/');
      const fullPublicId = folderPath ? `${folderPath}/${publicId}` : publicId;
      await cloudinary.uploader.destroy(fullPublicId);
    } catch (err) {
      console.error('Failed to delete image from Cloudinary:', err);
    }
  }

  // Remove the document permanently
  await FoundItem.findByIdAndDelete(req.params.id);

  // Log audit of permanent delete
  await logAction({
    userId: req.user.id,
    action: 'PERMANENT_DELETE',
    targetId: item._id,
    targetType: 'FoundItem',
    details: `Permanently deleted found item: ${item.title}`,
    req
  });

  return sendSuccess(res, 'Item permanently deleted');
});

// @desc    Mark item as returned
// @route   PATCH /api/found-items/:id/returned
// @access  Private (Admin only)
exports.markItemReturned = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  item.status = 'returned';

  const updatedItem = await item.save();
  
  // Notify the claimant if there's an approved claim
  try {
    const claim = await Claim.findOne({ item: item._id, status: 'approved' });
    if (claim) {
      await createNotification({
        userId: claim.user,
        title: 'Claim Accepted',
        message: 'your claim was accepted come an take it',
        type: 'CLAIM_APPROVED',
        relatedId: claim._id
      });
    }
  } catch (err) {
    console.error('Claimant Notification Error:', err);
  }

  // Notify the creator (Cleaner/Security)
  try {
    await createNotification({
      userId: item.createdBy,
      title: 'Item Returned',
      message: `The item "${item.title}" you reported has been marked as returned to its owner.`,
      type: 'GENERAL',
      relatedId: item._id
    });
  } catch (err) {
    console.error('Notification Error:', err);
  }
  
  return sendSuccess(res, 'Item marked as returned', updatedItem);
});

// @desc    Link found item to a lost item
// @route   PATCH /api/found-items/:id/link-lost
// @access  Private (Admin, Security)
exports.linkLostItem = asyncHandler(async (req, res) => {
  const { lostItemId } = req.body;
  const LostItem = require('../models/LostItem');

  if (!lostItemId) {
    return res.status(400).json({ success: false, message: 'lostItemId is required' });
  }

  const item = await FoundItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Found item not found' });
  }

  const lostItem = await LostItem.findById(lostItemId);
  if (!lostItem) {
    return res.status(404).json({ success: false, message: 'Lost item not found' });
  }

  // Two-way connect and approve
  item.possibleMatch = lostItemId;
  item.status = 'approved';
  const updatedItem = await item.save();

  lostItem.linkedFoundItem = item._id;
  lostItem.status = 'approved';
  await lostItem.save();
  
  return sendSuccess(res, 'Items linked and approved successfully', updatedItem);
});

// @desc    Restore soft deleted found item
// @route   PATCH /api/found-items/:id/restore
// @access  Private/Admin
exports.restoreFoundItem = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  item.isDeleted = false;
  item.deletedAt = null;
  await item.save();

  // Log audit
  await logAction({
    userId: req.user.id,
    action: 'RESTORE',
    targetId: item._id,
    targetType: 'FoundItem',
    details: `Restored found item: ${item.title}`,
    req
  });

  return sendSuccess(res, 'Item restored successfully');
});

// @desc    Permanently delete found item
// @route   DELETE /api/found-items/:id/permanent
// @access  Private/Admin
exports.permanentDeleteFoundItem = asyncHandler(async (req, res) => {
  const item = await FoundItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  await FoundItem.findByIdAndDelete(req.params.id);

  if (item.image && item.image.includes('cloudinary')) {
    // Extract public_id from Cloudinary URL (assuming format: .../upload/v1234/folder/filename.ext)
    try {
      const cloudinary = require('../config/cloudinary');
      const urlParts = item.image.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0];
      const folderPath = urlParts.slice(urlParts.indexOf('upload') + 2, urlParts.length - 1).join('/');
      const fullPublicId = folderPath ? `${folderPath}/${publicId}` : publicId;
      await cloudinary.uploader.destroy(fullPublicId);
    } catch (err) {
      console.error('Failed to delete image from Cloudinary:', err);
    }
  }

  // Log audit
  await logAction({
    userId: req.user.id,
    action: 'PERMANENT_DELETE',
    targetId: item._id,
    targetType: 'FoundItem',
    details: `Permanently deleted found item: ${item.title}`,
    req
  });

  return sendSuccess(res, 'Item permanently deleted');
});

// @desc    Get trashed found items
// @route   GET /api/trash/found-items
// @access  Private/Admin
exports.getTrashedFoundItems = asyncHandler(async (req, res) => {
  const items = await FoundItem.find({ isDeleted: true })
    .populate('createdBy', 'name fullName email')
    .sort({ deletedAt: -1 })
    .lean();
    
  return sendSuccess(res, 'Trashed items fetched successfully', items);
});




