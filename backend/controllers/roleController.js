const Role = require('../models/Role');
const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
exports.getRoles = asyncHandler(async (req, res, next) => {
  let roles = await Role.find();

  // Staff should not see or be able to assign the admin role
  const userRole = req.user.role ? req.user.role.toLowerCase() : '';
  if (userRole === 'staff') {
    roles = roles.filter(role => role.name.toLowerCase() !== 'admin');
  }

  res.status(200).json({
    success: true,
    data: roles
  });
});

// @desc    Create a role
// @route   POST /api/roles
// @access  Private/Admin
exports.createRole = asyncHandler(async (req, res, next) => {
  const role = await Role.create(req.body);
  res.status(201).json({
    success: true,
    data: role
  });
});

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private/Admin
exports.updateRole = asyncHandler(async (req, res, next) => {
  let role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  role = await Role.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: role
  });
});

// @desc    Delete a role AND permanently delete all users assigned to it
// @route   DELETE /api/roles/:id
// @access  Private/Admin
exports.deleteRole = asyncHandler(async (req, res, next) => {
  const role = await Role.findById(req.params.id);

  if (!role) {
    return next(new ErrorResponse(`Role not found with id of ${req.params.id}`, 404));
  }

  // Protect the core admin role from ever being deleted
  if (role.name.toLowerCase() === 'admin') {
    return next(new ErrorResponse('The admin role cannot be deleted', 403));
  }

  // Cascade: permanently hard-delete every user assigned to this role
  const { deletedCount } = await User.deleteMany({ role: role.name });

  // Now delete the role itself
  await role.deleteOne();

  res.status(200).json({
    success: true,
    message: `Role "${role.displayName}" deleted along with ${deletedCount} associated user(s).`,
    data: {
      deletedRole: role.name,
      deletedUsersCount: deletedCount
    }
  });
});
