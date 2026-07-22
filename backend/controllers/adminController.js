const User = require('../models/User');
const LostItem = require('../models/LostItem');
const FoundItem = require('../models/FoundItem');
const { normalizeLostFoundItemsImages } = require('../utils/imageStorageHelper');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalSecurity = await User.countDocuments({ role: 'security' });
    const totalCleaners = await User.countDocuments({ role: 'clean' });
    const totalLostItems = await LostItem.countDocuments();
    const totalFoundItems = await FoundItem.countDocuments();

    res.status(200).json({
      totalUsers,
      totalStudents,
      totalSecurity,
      totalCleaners,
      totalLostItems,
      totalFoundItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get recent users
// @route   GET /api/admin/recent-users
// @access  Private/Admin
exports.getRecentUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(5);
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get recent lost items
// @route   GET /api/admin/recent-lost-items
// @access  Private/Admin
exports.getRecentLostItems = async (req, res) => {
  try {
    const lostItems = await LostItem.find()
      .sort({ createdAt: -1 })
      .limit(5);
    res.status(200).json(normalizeLostFoundItemsImages(lostItems.map((item) => (item.toObject ? item.toObject() : item))));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get recent found items
// @route   GET /api/admin/recent-found-items
// @access  Private/Admin
exports.getRecentFoundItems = async (req, res) => {
  try {
    const foundItems = await FoundItem.find()
      .sort({ createdAt: -1 })
      .limit(5);
    res.status(200).json(normalizeLostFoundItemsImages(foundItems.map((item) => (item.toObject ? item.toObject() : item))));
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
