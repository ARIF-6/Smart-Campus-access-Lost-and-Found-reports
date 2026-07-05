const LostItem = require('../models/LostItem');
const { findMatchesForLostItem } = require('../services/matchService');
const { logAction } = require('../utils/auditLogger');
const APIFeatures = require('../utils/apiFeatures');
const { createNotification } = require('./notificationController');
const { emitGlobalEvent } = require('../socket/events/notificationEvents');
const asyncHandler = require('../middleware/asyncHandler');
const { sendSuccess } = require('../utils/responseHandler');

// @desc    Create lost item report
// @route   POST /api/lost-items
// @access  Private (student, admin)
exports.reportLostItem = asyncHandler(async (req, res) => {
  const { title, description, category, locationLost, dateLost } = req.body;
  
  const path = require('path');
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const imagePath = req.file ? path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/') : '';
  
  const newItem = new LostItem({
    title,
    description,
    category,
    location: locationLost,
    dateLost: dateLost || Date.now(),
    image: imagePath,
    imageUrl: imagePath,
    createdBy: req.user.id,
    user: req.user.id
  });

  const savedItem = await newItem.save();
  
  // Log audit
  await logAction({
    userId: req.user.id,
    action: 'CREATE_LOST_ITEM',
    targetId: savedItem._id,
    targetType: 'LostItem',
    details: `Reported lost item: ${savedItem.title}`,
    req
  });

  // Notify Admins & Staff
  try {
    await createNotification({
      recipientRole: 'admin',
      title: 'New Lost Item Reported',
      message: `A new lost item "${savedItem.title}" has been reported by ${req.user.fullName}.`,
      type: 'LOST_ITEM_REPORTED',
      relatedId: savedItem._id
    });

    await createNotification({
      recipientRole: 'staff',
      title: 'New Lost Item Reported',
      message: `A new lost item "${savedItem.title}" has been reported by ${req.user.fullName}.`,
      type: 'LOST_ITEM_REPORTED',
      relatedId: savedItem._id
    });
  } catch (err) {
    console.error('Notification Error:', err);
  }

  // Trigger matching in the background
  findMatchesForLostItem(savedItem._id).catch(err => console.error('Matching Error:', err));

  emitGlobalEvent('lostItem:created', savedItem);

  return sendSuccess(res, 'Lost item reported successfully', savedItem, 201);
});

// @desc    Get all lost items
// @route   GET /api/lost-items
// @access  Private
exports.getAllLostItems = asyncHandler(async (req, res) => {
  const searchableFields = ['title', 'description', 'location'];
  const features = new APIFeatures(LostItem.find({ isDeleted: { $ne: true } }), req.query, searchableFields)
    .search()
    .filter()
    .sort()
    .pagination();

  const items = await features.query.populate('createdBy', 'name fullName email').lean();
  const total = await LostItem.countDocuments({ isDeleted: { $ne: true }, ...features.filterCriteria });

  return sendSuccess(res, 'Lost items fetched successfully', {
    items,
    total,
    page: parseInt(req.query.page) || 1,
    limit: parseInt(req.query.limit) || 10
  });
});

// @desc    Get current user's lost items
// @route   GET /api/lost-items/my
// @access  Private
exports.getMyLostItems = asyncHandler(async (req, res) => {
  const items = await LostItem.find({ createdBy: req.user.id, isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'My lost items fetched successfully', items);
});

// @desc    Get single lost item
// @route   GET /api/lost-items/:id
// @access  Private
exports.getLostItemById = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id)
    .populate('createdBy', 'name fullName email')
    .populate('linkedFoundItem')
    .lean();

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  return sendSuccess(res, 'Lost item fetched successfully', item);
});

// @desc    Update lost item
// @route   PUT /api/lost-items/:id
// @access  Private (admin or owner student)
exports.updateLostItem = asyncHandler(async (req, res) => {
  const { title, description, category, locationLost, status } = req.body;

  const item = await LostItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  // Check if user is admin, staff, security, or the student who reported it
  if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.role !== 'security' && item.createdBy.toString() !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this report' });
  }

  item.title = title || item.title;
  item.description = description || item.description;
  item.category = category || item.category;
  if (locationLost) item.location = locationLost;
  if (status) item.status = status;

  const updatedItem = await item.save();
  return sendSuccess(res, 'Lost item updated successfully', updatedItem);
});

// @desc    Delete lost item
// @route   DELETE /api/lost-items/:id
// @access  Private (admin only)
exports.deleteLostItem = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);

  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  // Check if user is authorized to delete (Admin, Staff, or Security)
  if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.role !== 'security') {
    return res.status(403).json({ success: false, message: 'Only authorized personnel (admin/staff/security) can delete reports' });
  }

  // Permanently delete the lost item from the database
  await LostItem.findByIdAndDelete(req.params.id);

  // Log audit for permanent deletion
  await logAction({
    userId: req.user.id,
    action: 'PERMANENT_DELETE',
    targetId: item._id,
    targetType: 'LostItem',
    details: `Permanently deleted lost item: ${item.title}`,
    req
  });

  return res.status(200).json({ success: true, message: 'Lost item permanently deleted' });
});

// @desc    Restore soft deleted lost item
// @route   PATCH /api/lost-items/:id/restore
// @access  Private/Admin
exports.restoreLostItem = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);
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
    targetType: 'LostItem',
    details: `Restored lost item: ${item.title}`,
    req
  });

  return sendSuccess(res, 'Item restored successfully');
});

// @desc    Permanently delete lost item
// @route   DELETE /api/lost-items/:id/permanent
// @access  Private/Admin
exports.permanentDeleteLostItem = asyncHandler(async (req, res) => {
  const item = await LostItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: 'Item not found' });
  }

  await LostItem.findByIdAndDelete(req.params.id);

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

  // Log audit
  await logAction({
    userId: req.user.id,
    action: 'PERMANENT_DELETE',
    targetId: item._id,
    targetType: 'LostItem',
    details: `Permanently deleted lost item: ${item.title}`,
    req
  });

  return sendSuccess(res, 'Item permanently deleted');
});

// @desc    Get trashed lost items
// @route   GET /api/trash/lost-items
// @access  Private/Admin
exports.getTrashedLostItems = asyncHandler(async (req, res) => {
  const items = await LostItem.find({ isDeleted: true })
    .populate('createdBy', 'name fullName email')
    .sort({ deletedAt: -1 })
    .lean();
    
  return sendSuccess(res, 'Trashed items fetched successfully', items);
});




