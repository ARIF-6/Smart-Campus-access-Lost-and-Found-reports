const LostItem = require('../models/LostItem');
const { findMatchesForLostItem } = require('../services/matchService');
const { logAction } = require('../utils/auditLogger');

// @desc    Create lost item report
// @route   POST /api/lost-items
// @access  Private (student, admin)
exports.reportLostItem = async (req, res) => {
  try {
    const { title, description, category, locationLost, dateLost } = req.body;
    let imageUrl = '';

    // If using local or cloudinary storage
    if (req.file) {
      imageUrl = req.file.path; // Cloudinary automatically returns a valid HTTP URL in req.file.path
    }

    const newItem = new LostItem({
      title,
      description,
      category,
      locationLost,
      dateLost,
      image: imageUrl,
      reportedBy: req.user.id
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

    // Trigger matching in the background
    findMatchesForLostItem(savedItem._id).catch(err => console.error('Matching Error:', err));

    res.status(201).json(savedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all lost items
// @route   GET /api/lost-items
// @access  Private
exports.getAllLostItems = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const items = await LostItem.find(query)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
      
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single lost item
// @route   GET /api/lost-items/:id
// @access  Private
exports.getLostItemById = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id)
      .populate('reportedBy', 'name email');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update lost item
// @route   PUT /api/lost-items/:id
// @access  Private (admin or owner student)
exports.updateLostItem = async (req, res) => {
  try {
    const { title, description, category, locationLost } = req.body;

    const item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is admin or the student who reported it
    if (req.user.role !== 'admin' && item.reportedBy.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this report' });
    }

    item.title = title || item.title;
    item.description = description || item.description;
    item.category = category || item.category;
    item.locationLost = locationLost || item.locationLost;

    const updatedItem = await item.save();
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete lost item
// @route   DELETE /api/lost-items/:id
// @access  Private (admin only)
exports.deleteLostItem = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Role check logic already handled by middleware, but adding here for safety
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admin can delete reports' });
    }

    const itemToDelete = await LostItem.findById(req.params.id);
    await LostItem.findByIdAndDelete(req.params.id);
    
    // Log audit
    await logAction({
      userId: req.user.id,
      action: 'DELETE_ITEM',
      targetId: itemToDelete._id,
      targetType: 'LostItem',
      details: `Deleted lost item: ${itemToDelete.title}`,
      req
    });

    res.status(200).json({ message: 'Item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
