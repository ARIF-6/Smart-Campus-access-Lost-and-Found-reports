const Category = require('../models/Category');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get categories (list)
// @route   GET /api/categories
// @access  Private (auth required, role-based visibility handled in middleware)
exports.getCategories = asyncHandler(async (req, res, next) => {
  const { type, search, page = 1, limit = 20, includeInactive = false, includeTemporary = false } = req.query;

  const query = {};
  if (type) query.categoryType = type; // expected values: campus_issue, class_issue, lost_found
  if (!includeInactive) query.status = 'active';
  if (!includeTemporary) query.isTemporary = false;
  if (search) query.name = { $regex: search, $options: 'i' };

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Category.countDocuments(query);
  const categories = await Category.find(query)
    .collation({ locale: 'en', strength: 2 }) // case‑insensitive sort
    .sort({ name: 1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('createdBy', 'fullName email role');

  res.status(200).json({
    success: true,
    count: categories.length,
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    data: categories,
  });
});

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private (superadmin, admin, staff)
exports.createCategory = asyncHandler(async (req, res, next) => {
  const { name, categoryType, status = 'active', isTemporary = false } = req.body;

  if (!name || !categoryType) {
    return next(new ErrorResponse('Name and category type are required.', 400));
  }

  // Validate categoryType values
  const allowedTypes = ['campus_issue', 'class_issue', 'lost_found', 'incident'];
  if (!allowedTypes.includes(categoryType)) {
    return next(new ErrorResponse('Invalid category type.', 400));
  }

  // Duplicate check (case‑insensitive)
  const existing = await Category.findOne({
    name: { $regex: `^${name}$`, $options: 'i' },
    categoryType,
  }).collation({ locale: 'en', strength: 2 });

  if (existing) {
    return next(new ErrorResponse('Category already exists.', 409));
  }

  const category = await Category.create({
    name,
    categoryType,
    status,
    isTemporary,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: category, message: 'Category created successfully.' });
});

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (superadmin, admin, staff for edit, delete only superadmin/admin)
exports.updateCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, status, isTemporary } = req.body;

  const category = await Category.findById(id);
  if (!category) {
    return next(new ErrorResponse('Category not found.', 404));
  }

  // Only allow edit of name, status, isTemporary (if staff, they cannot change status to inactive)
  if (name) {
    // duplicate check for new name
    const duplicate = await Category.findOne({
      _id: { $ne: id },
      name: { $regex: `^${name}$`, $options: 'i' },
      categoryType: category.categoryType,
    }).collation({ locale: 'en', strength: 2 });
    if (duplicate) {
      return next(new ErrorResponse('Category already exists.', 409));
    }
    category.name = name;
  }
  if (status) category.status = status;
  if (typeof isTemporary !== 'undefined') category.isTemporary = isTemporary;

  await category.save();

  res.status(200).json({ success: true, data: category, message: 'Category updated successfully.' });
});

// @desc    Delete a category permanently
// @route   DELETE /api/categories/:id
// @access  Private (superadmin, admin)
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    return next(new ErrorResponse('Category not found.', 404));
  }
  res.status(200).json({ success: true, message: 'Category deleted permanently.' });
});

// @desc    Get temporary category requests (isTemporary:true)
// @route   GET /api/categories/temporary
// @access  Private (admin, superadmin)
exports.getTemporaryRequests = asyncHandler(async (req, res, next) => {
  const temps = await Category.find({ isTemporary: true })
    .populate('createdBy', 'fullName email role')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: temps.length, data: temps });
});

// @desc    Convert temporary request to official category
// @route   POST /api/categories/convert
// @access  Private (admin, superadmin)
exports.convertTemporary = asyncHandler(async (req, res, next) => {
  const { tempId, name, categoryType } = req.body;
  const temp = await Category.findById(tempId);
  if (!temp || !temp.isTemporary) {
    return next(new ErrorResponse('Temporary request not found.', 404));
  }
  // Duplicate check for final name
  const exists = await Category.findOne({
    name: { $regex: `^${name}$`, $options: 'i' },
    categoryType,
    isTemporary: false,
  }).collation({ locale: 'en', strength: 2 });
  if (exists) {
    return next(new ErrorResponse('Category already exists.', 409));
  }
  // Update the temporary entry to become official
  temp.name = name;
  temp.categoryType = categoryType;
  temp.isTemporary = false;
  temp.status = 'active';
  await temp.save();
  res.status(200).json({ success: true, data: temp, message: 'Temporary request converted to official category.' });
});

// @desc    Get active lost & found categories (for student/mobile dropdown)
// @route   GET /api/categories/lost-found
// @access  Private
exports.getLostFoundCategories = asyncHandler(async (req, res, next) => {
  // Query both 'lost_found' and 'lostfound' to handle both enum variants in the database
  const categories = await Category.find({
    categoryType: { $in: ['lost_found', 'lostfound'] },
    status: 'active',
    isTemporary: false
  })
    .collation({ locale: 'en', strength: 2 })
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});
// @desc    Get active incident categories (for mobile dropdown)
// @route   GET /api/categories/incident
// @access  Private
exports.getIncidentCategories = asyncHandler(async (req, res, next) => {
  const categories = await Category.find({
    categoryType: 'incident',
    status: 'active',
    isTemporary: false
  })
    .collation({ locale: 'en', strength: 2 })
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  });
});
