const User = require('../models/User');
const { logAction } = require('../utils/auditLogger');

// @desc    Get all users with pagination, search, and filter
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role;
    const search = req.query.search;
    
    const query = {};
    
    if (role && role !== 'All') {
      query.role = role.toLowerCase();
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const startIndex = (page - 1) * limit;
    const totalUsers = await User.countDocuments(query);
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    res.status(200).json({
      users,
      totalUsers,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.name = name || user.name;
    user.email = email || user.email;
    user.role = role || user.role;
    
    const updatedUser = await user.save();
    
    // Log audit
    await logAction({
      userId: req.user.id,
      action: 'UPDATE_USER',
      targetId: updatedUser._id,
      targetType: 'User',
      details: `Updated user info: ${updatedUser.email}`,
      req
    });

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.email === 'admin@smartcampus.com') {
      return res.status(403).json({ message: 'Cannot delete the main admin account' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    // Log audit
    await logAction({
      userId: req.user.id,
      action: 'DELETE_USER',
      targetId: user._id,
      targetType: 'User',
      details: `Deleted user: ${user.email}`,
      req
    });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Change user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private/Admin
exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!role) {
      return res.status(400).json({ message: 'Role is required' });
    }
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.email === 'admin@smartcampus.com' && role !== 'admin') {
      return res.status(403).json({ message: 'Cannot change the role of the main admin account' });
    }
    
    user.role = role;
    await user.save();
    
    res.status(200).json({ message: 'User role updated successfully', role: user.role });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
