const FoundItem = require('../models/FoundItem');
const { findMatchesForFoundItem } = require('../services/matchService');
const { logAction } = require('../utils/auditLogger');

// @desc    Report a found item
// @route   POST /api/found-items
// @access  Private (Security, Cleaner, Admin)
exports.reportFoundItem = async (req, res) => {
  try {
    const { title, description, category, locationFound, dateFound } = req.body;
    let imageUrl = '';

    if (req.file) {
      imageUrl = req.file.path; // Cloudinary HTTP path
    }

    const newItem = new FoundItem({
      title,
      description,
      category,
      locationFound,
      dateFound,
      imageUrl,
      reportedBy: req.user.id
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

    // Trigger matching in the background
    findMatchesForFoundItem(savedItem._id).catch(err => console.error('Matching Error:', err));

    res.status(201).json(savedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get all found items (with search and filters)
// @route   GET /api/found-items
// @access  Public or loosely Private
exports.getAllFoundItems = async (req, res) => {
  try {
    const { search, category, status } = req.query;
    
    let query = {};

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const items = await FoundItem.find(query)
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
      
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single found item
// @route   GET /api/found-items/:id
// @access  Public or loosely Private
exports.getFoundItemById = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id)
      .populate('reportedBy', 'name email role')
      .populate('possibleMatch');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update found item
// @route   PUT /api/found-items/:id
// @access  Private (Admin, Security)
exports.updateFoundItem = async (req, res) => {
  try {
    const { title, description, category, locationFound, status } = req.body;

    const item = await FoundItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.title = title || item.title;
    item.description = description || item.description;
    item.category = category || item.category;
    item.locationFound = locationFound || item.locationFound;
    item.status = status || item.status;

    const updatedItem = await item.save();
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete found item
// @route   DELETE /api/found-items/:id
// @access  Private (Admin only)
exports.deleteFoundItem = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const itemToDelete = await FoundItem.findById(req.params.id);
    await FoundItem.findByIdAndDelete(req.params.id);
    
    // Log audit
    await logAction({
      userId: req.user.id,
      action: 'DELETE_ITEM',
      targetId: itemToDelete._id,
      targetType: 'FoundItem',
      details: `Deleted found item: ${itemToDelete.title}`,
      req
    });

    res.status(200).json({ message: 'Item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Mark item as returned
// @route   PATCH /api/found-items/:id/returned
// @access  Private (Admin only)
exports.markItemReturned = async (req, res) => {
  try {
    const item = await FoundItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    item.status = 'returned';
    const updatedItem = await item.save();
    
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Link found item to a lost item
// @route   PATCH /api/found-items/:id/link-lost
// @access  Private (Admin, Security)
exports.linkLostItem = async (req, res) => {
  try {
    const { lostItemId } = req.body;

    if (!lostItemId) {
      return res.status(400).json({ message: 'lostItemId is required' });
    }

    const item = await FoundItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(lostItemId)) {
      return res.status(400).json({ message: 'Invalid lostItemId format' });
    }

    item.possibleMatch = lostItemId;
    const updatedItem = await item.save();
    
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
