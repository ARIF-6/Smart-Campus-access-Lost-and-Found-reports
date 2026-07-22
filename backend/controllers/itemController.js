const Item = require('../models/Item');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const { logAction } = require('../utils/auditLogger');
const { resolveStoredImagePath, normalizeLostFoundItemImages, normalizeLostFoundItemsImages } = require('../utils/imageStorageHelper');
const { enrichFoundItemForUser } = require('../utils/itemStatusHelper');

// Helper to find item in any collection
const findItemInAllCollections = async (id) => {
  let item = await Item.findById(id);
  let source = 'unified';

  if (!item) {
    item = await LostItem.findById(id);
    source = 'lost';
  }

  if (!item) {
    item = await FoundItem.findById(id);
    source = 'found';
  }

  return item ? { item, source } : null;
};

exports.createItem = async (req, res) => {
  try {
    const { title, description, category, type, location, image } = req.body;

    if (!title || !description || !category || !type || !location) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    const storedImage = await resolveStoredImagePath(req.file, 'campus-access/items');
    const itemImage = storedImage.image || image || '';
    const newItem = new Item({
      title,
      description,
      category: category.toLowerCase(),
      type: type.toLowerCase(),
      location,
      image: itemImage,
      createdBy: req.user.id,
      user: req.user.id
    });

    await newItem.save();
    res.status(201).json({ message: "Item created successfully", data: normalizeLostFoundItemImages(newItem.toObject ? newItem.toObject() : newItem) });
  } catch (error) {
    res.status(500).json({ message: "Server error while creating item", error: error.message });
  }
};

exports.getItems = async (req, res) => {
  try {
    // Broaden query to ensure we catch items even if isDeleted is missing
    let query = { 
      $or: [
        { isDeleted: { $ne: true } },
        { isDeleted: { $exists: false } }
      ]
    };

    const typeFilter = req.query.type;
    const categoryFilter = req.query.category;
    const statusFilter = req.query.status;

    // Fetch from all collections in parallel
    const [unifiedItems, lostItems, foundItems] = await Promise.all([
      Item.find(query).populate('createdBy', 'name email').lean(),
      LostItem.find(query).populate('createdBy', 'name email').lean(),
      FoundItem.find(query).populate('createdBy', 'name email').lean()
    ]);

    // Combine and normalize types
    let combined = [
      ...unifiedItems.map(i => ({ 
        ...i, 
        _id: i._id.toString(),
        type: i.type || 'found' 
      })),
      ...lostItems.map(i => ({ 
        ...i, 
        _id: i._id.toString(),
        type: 'lost' 
      })),
      ...foundItems.map(i => ({ 
        ...i, 
        _id: i._id.toString(),
        type: 'found' 
      }))
    ];

    // Case-insensitive filtering
    if (typeFilter && typeFilter !== 'all') {
      const tf = typeFilter.toLowerCase();
      combined = combined.filter(i => (i.type || '').toLowerCase() === tf);
    }
    if (categoryFilter && categoryFilter !== 'all') {
      const cf = categoryFilter.toLowerCase();
      combined = combined.filter(i => (i.category || '').toLowerCase() === cf);
    }
    if (statusFilter && statusFilter !== 'all') {
      combined = combined.filter(i => i.status === statusFilter);
    }

    // Sort by newest first
    combined.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    // Limit if requested
    if (req.query.limit) {
      combined = combined.slice(0, parseInt(req.query.limit));
    }

    const normalizedItems = normalizeLostFoundItemsImages(combined);

    res.status(200).json(normalizedItems);
  } catch (error) {
    console.error('getItems Aggregation Error:', error);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

exports.getItem = async (req, res) => {
  try {
    const result = await findItemInAllCollections(req.params.id);
    if (!result) return res.status(404).json({ message: "Item not found" });

    // Normalize type for lost/found items
    const itemData = result.item.toObject();
    if (result.source === 'lost') itemData.type = 'lost';
    if (result.source === 'found') {
      itemData.type = 'found';
      Object.assign(itemData, enrichFoundItemForUser(itemData, req.user?.id));
    }

    res.json(normalizeLostFoundItemImages(itemData));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await findItemInAllCollections(req.params.id);

    if (!result) return res.status(404).json({ message: "Item not found" });

    const { item, source } = result;

    // Check ownership
    const ownerId = (item.user || item.createdBy)?.toString();
    if (ownerId !== userId) {
      return res.status(403).json({ message: "Not authorized to update this item" });
    }

    const { title, description, location, image } = req.body;

    // Update fields
    if (title) item.title = title;
    if (description) item.description = description;
    if (location) {
      item.location = location;
      // Also update collection-specific location fields if they exist
      if (source === 'lost') item.locationLost = location;
      if (source === 'found') item.locationFound = location;
    }
    if (req.file) {
      const storedImage = await resolveStoredImagePath(req.file, 'campus-access/items');
      item.image = storedImage.image;
      if (item.imageUrl !== undefined) item.imageUrl = storedImage.imageUrl;
    } else if (image) {
      item.image = image;
    }

    await item.save();
    res.json(normalizeLostFoundItemImages(item.toObject ? item.toObject() : item));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await findItemInAllCollections(req.params.id);

    if (!result) return res.status(404).json({ message: "Item not found" });

    const { item } = result;

    // Check ownership
    const ownerId = (item.user || item.createdBy)?.toString();
    if (ownerId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this item" });
    }

    await item.constructor.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyItems = async (req, res) => {
  try {
    const userId = req.user.id;

    const [unifiedItems, lostItems, foundItems] = await Promise.all([
      Item.find({ $or: [{ user: userId }, { createdBy: userId }] }).lean(),
      LostItem.find({ $or: [{ user: userId }, { createdBy: userId }] }).lean(),
      FoundItem.find({ $or: [{ user: userId }, { createdBy: userId }] }).lean()
    ]);

    const combined = [
      ...unifiedItems.map(i => ({ ...i, itemSource: 'unified' })),
      ...lostItems.map(i => ({ ...i, type: 'lost', itemSource: 'lost' })),
      ...foundItems.map(i => enrichFoundItemForUser(
        { ...i, type: 'found', itemSource: 'found' },
        userId
      ))
    ];

    combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json(normalizeLostFoundItemsImages(combined));
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching my items', error: error.message });
  }
};
