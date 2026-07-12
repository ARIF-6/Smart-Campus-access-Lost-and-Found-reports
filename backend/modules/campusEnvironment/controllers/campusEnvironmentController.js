const CampusEnvironmentComplaint = require('../models/CampusEnvironmentComplaint');
const CampusEnvironmentIssue = require('../models/CampusEnvironmentIssue');
const CampusEnvironmentTracking = require('../models/CampusEnvironmentTracking');
const CampusEnvironmentSupport = require('../models/CampusEnvironmentSupport');
const Category = require('../../../models/Category');
const User = require('../../../models/User');
const Class = require('../../../models/Class');
const Hall = require('../../../models/Hall');
const { createNotification } = require('../../../controllers/notificationController');
const { emitDashboardRefresh } = require('../../../socket/events/notificationEvents');
const asyncHandler = require('../../../middleware/asyncHandler');
const { sendSuccess } = require('../../../utils/responseHandler');
const mongoose = require('mongoose');

// ─── Helper: resolve or create a CampusEnvironmentIssue from a Category ID ───
// Students select from admin-registered Category records. This bridges a
// Category _id → CampusEnvironmentIssue so existing storage stays intact.
async function resolveEnvIssueTypeFromCategory(categoryId) {
  const category = await Category.findById(categoryId).lean();
  if (!category) return null;

  const name = category.name;
  let issue = await CampusEnvironmentIssue.findOne({
    issueName: { $regex: `^${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' }
  });
  if (!issue) {
    issue = await CampusEnvironmentIssue.create({ issueName: name, category: name });
  }
  return issue;
}

// @desc    Create a new complaint
// @route   POST /api/campus-environment
// @access  Private (Student)
exports.createComplaint = asyncHandler(async (req, res) => {
  const { title, issueType, description, location, faculty, department, class: className, hall: hallName } = req.body;

  // Resolve the issue type:
  //  - 'other' / empty / invalid   → fall back to a generic type
  //  - valid Category ID (admin)    → bridge Category → CampusEnvironmentIssue
  //  - legacy CampusEnvironmentIssue ID → use directly
  let issue;
  const isOtherOrEmpty = !issueType || issueType === '' || issueType === 'null' || String(issueType).toLowerCase() === 'other';

  if (isOtherOrEmpty) {
    // Fall back to a generic issue type
    issue = await CampusEnvironmentIssue.findOne({ issueName: { $regex: /^General Campus Issue$/i } })
      || await CampusEnvironmentIssue.findOne()
      || await CampusEnvironmentIssue.create({ issueName: 'General Campus Issue', category: 'General' });
  } else if (mongoose.Types.ObjectId.isValid(issueType)) {
    // Try bridging as a Category ID first (admin-registered categories)
    const bridged = await resolveEnvIssueTypeFromCategory(issueType);
    if (bridged) {
      issue = bridged;
    } else {
      // Fall back: try as a legacy CampusEnvironmentIssue ID
      issue = await CampusEnvironmentIssue.findById(issueType);
      if (!issue) {
        return res.status(400).json({ success: false, message: 'Invalid issue type' });
      }
    }
  } else {
    return res.status(400).json({ success: false, message: 'Invalid issue type provided.' });
  }

  const resolvedIssueType = issue._id;

  const images = req.files ? req.files.map(file => file.path) : [];

  let complaint;
  try {
    // Duplicate detection: prevent identical pending complaints
    const duplicate = await CampusEnvironmentComplaint.findOne({
      title: title && title.trim() !== '' ? title.trim() : issue.issueName,
      location: location && location.trim() !== '' ? location.trim() : 'Unknown Location',
      status: { $in: ['pending', 'in_review'] }
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'A similar complaint already exists.' });
    }
    // Validation for "Other" issue type requiring custom title
    if (issue.issueName.toLowerCase() === 'other' && (!title || title.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Title required for Other issue type.' });
    }
    // Proceed to create complaint
    complaint = await CampusEnvironmentComplaint.create({
      title: title && title.trim() !== '' ? title : issue.issueName,
      issueType: resolvedIssueType,
      student: req.user.id,
      description: description && description.trim() !== '' ? description : 'No description provided',
      images,
      location: location && location.trim() !== '' ? location : 'Unknown Location',
      faculty: faculty || req.user.faculty,
      department: department || req.user.department,
      // class/hall may not be valid ObjectIds in the JWT — always default to null
      class: null,
      hall: null,
      status: 'pending'
    });
  } catch (err) {
    console.error('Validation error when creating campus complaint:', err);
    return res.status(400).json({
      success: false,
      message: 'Validation error: ' + err.message
    });
  }

  // Notify Admins/Staff
  try {
    await createNotification({
      recipientRole: 'admin',
      title: 'New Campus Complaint',
      message: `A new ${issue.issueName} has been reported at ${location}.`,
      type: 'GENERAL',
      module: 'Campus Environment',
      relatedId: complaint._id
    });
  } catch (err) {
    console.error('Notification Error (admin):', err);
  }

  // Broadcast to ALL students across the university
  try {
    await createNotification({
      recipientRole: 'student',
      title: '📢 Campus Issue Reported',
      message: `A ${issue.issueName} issue has been reported at ${location}. Campus management has been notified.`,
      type: 'GENERAL',
      module: 'Campus Environment',
      relatedId: complaint._id
    });
  } catch (err) {
    console.error('Notification Error (students):', err);
  }

  // Trigger dashboard refreshes
  emitDashboardRefresh('admin');
  emitDashboardRefresh('staff');

  try {
    const { getIO } = require('../../../socket');
    getIO().emit('issueCreated', complaint);
  } catch (err) {
    console.error('Socket emit error:', err);
  }

  return sendSuccess(res, 'Complaint submitted successfully', complaint, 201);
});

// @desc    Get all complaints with filters/search
// @route   GET /api/campus-environment
// @access  Private (Admin/Staff)
exports.getAllComplaints = asyncHandler(async (req, res) => {
  const { 
    status, 
    issueType, 
    faculty, 
    search, 
    startDate, 
    endDate, 
    page = 1, 
    limit = 10,
    sortBy = 'createdAt',
    order = 'desc'
  } = req.query;
  
  const query = {};
  
  // Filters
  if (status) query.status = status;
  if (issueType) query.issueType = issueType;
  if (faculty) query.faculty = faculty;
  
  // Date Range
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  // Search
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    
    // We might need to find students matching the name to filter by their ID
    const matchingStudents = await User.find({ fullName: searchRegex }).select('_id');
    const studentIds = matchingStudents.map(s => s._id);

    query.$or = [
      { description: searchRegex },
      { location: searchRegex },
      { student: { $in: studentIds } }
    ];
  }

  const complaints = await CampusEnvironmentComplaint.find(query)
    .populate({
      path: 'student',
      select: 'fullName email studentId photoUrl class',
      populate: { path: 'class', select: 'name' }
    })
    .populate('issueType')
    .populate('assignedTo', 'fullName')
    .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .lean();

  const totalItems = await CampusEnvironmentComplaint.countDocuments(query);

  return sendSuccess(res, 'Complaints fetched successfully', {
    complaints,
    totalItems,
    totalPages: Math.ceil(totalItems / limit),
    currentPage: Number(page)
  });
});

// @desc    Get all complaints for students
// @route   GET /api/campus-environment/my
// @access  Private (Student)
exports.getMyComplaints = asyncHandler(async (req, res) => {
  // User requested all students to see all campus issues on this page, 
  const complaints = await CampusEnvironmentComplaint.find({})
    .populate({
      path: 'student',
      select: 'fullName email studentId phone faculty department class',
      populate: { path: 'class', select: 'name' }
    })
    .populate('issueType')
    .sort({ createdAt: -1 })
    .lean();
  
  return sendSuccess(res, 'Campus complaints fetched successfully', complaints);
});

// @desc    Get single complaint details
// @route   GET /api/campus-environment/:id
// @access  Private
exports.getComplaintById = asyncHandler(async (req, res) => {
  // Fetch complaint with nested population for reporter details (class only)
  const complaint = await CampusEnvironmentComplaint.findById(req.params.id)
    .populate('hall', 'name')
    .populate({
      path: 'student',
      select: 'fullName email studentId phone faculty department class',
      populate: { path: 'class', select: 'name' }
    })
    .populate('issueType')
    .populate('assignedTo', 'fullName')
    .lean();

  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  // Build reporter object with real values (no fallbacks)
  let facultyName = complaint.faculty && complaint.faculty.trim() ? complaint.faculty : complaint.student?.faculty || null;
  let departmentName = complaint.department && complaint.department.trim() ? complaint.department : complaint.student?.department || null;
  
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (facultyName && objectIdRegex.test(facultyName)) {
    const Faculty = require('../../../models/Faculty');
    const fac = await Faculty.findById(facultyName).select('name');
    if (fac) facultyName = fac.name;
  }
  if (departmentName && objectIdRegex.test(departmentName)) {
    const Department = require('../../../models/Department');
    const dep = await Department.findById(departmentName).select('name');
    if (dep) departmentName = dep.name;
  }

  let hallName = null;
  if (complaint.hall && complaint.hall.name) {
    hallName = complaint.hall.name;
  } else if (complaint.student?.class) {
    // Find hall associated with the class
    const Hall = require('../../../models/Hall'); // Adjust path as needed
    const hallDoc = await Hall.findOne({ classes: complaint.student.class._id }).select('name');
    if (hallDoc) hallName = hallDoc.name;
  }
  const reporter = {
    fullName: complaint.student?.fullName || null,
    studentId: complaint.student?.studentId || null,
    facultyName: facultyName,
    departmentName: departmentName,
    className: complaint.student?.class?.name || null,
    hallName: hallName,
    email: complaint.student?.email || null,
    phoneNumber: complaint.student?.phone || null
  };

  // Remove raw student field to avoid exposing ObjectIds
  delete complaint.student;

  const tracking = await CampusEnvironmentTracking.find({ complaint: req.params.id })
    .populate('changedBy', 'fullName role')
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'Complaint details fetched successfully', { ...complaint, reporter, tracking });
});

// @desc    Support a complaint (Upvote)
// @route   POST /api/campus-environment/:id/support
// @access  Private (Student)
exports.supportComplaint = asyncHandler(async (req, res) => {
  const complaintId = req.params.id;
  const studentId = req.user.id;

  try {
    await CampusEnvironmentSupport.create({ complaint: complaintId, student: studentId });
    
    const complaint = await CampusEnvironmentComplaint.findByIdAndUpdate(
      complaintId,
      { $inc: { supportCount: 1 } },
      { new: true }
    );

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Validation: prevent self-support
    if (complaint.student.toString() === studentId) {
      return res.status(400).json({ success: false, message: 'You cannot support your own complaint.' });
    }
    // Validation: prevent support on resolved complaints
    if (complaint.status === 'resolved') {
      return res.status(400).json({ success: false, message: 'This complaint has already been resolved. Support is no longer available.' });
    }

    try {
      const { getIO } = require('../../../socket');
      getIO().emit('supportChanged', { complaintId, supportCount: complaint.supportCount });
    } catch (err) {
      console.error('Socket emit error:', err);
    }

    return sendSuccess(res, 'Support added successfully', { supportCount: complaint.supportCount });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'You already supported this complaint' });
    }
    throw err;
  }
});

// @desc    Remove support (Downvote)
// @route   DELETE /api/campus-environment/:id/support
// @access  Private (Student)
exports.removeSupport = asyncHandler(async (req, res) => {
  const support = await CampusEnvironmentSupport.findOneAndDelete({
    complaint: req.params.id,
    student: req.user.id
  });

  if (!support) {
    return res.status(404).json({ success: false, message: 'Support not found' });
  }

  const complaint = await CampusEnvironmentComplaint.findByIdAndUpdate(
    req.params.id,
    { $inc: { supportCount: -1 } },
    { new: true }
  );

  try {
    const { getIO } = require('../../../socket');
    getIO().emit('supportChanged', { complaintId: req.params.id, supportCount: complaint?.supportCount || 0 });
  } catch (err) {
    console.error('Socket emit error:', err);
  }

  return sendSuccess(res, 'Support removed successfully', { supportCount: complaint?.supportCount || 0 });
});

// @desc    Assign complaint to staff
// @route   PUT /api/campus-environment/:id/assign
// @access  Private (Admin/Staff)
exports.assignComplaint = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  
  const complaint = await CampusEnvironmentComplaint.findById(req.params.id);
  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  const assignee = await User.findById(assignedTo);
  if (!assignee) {
    return res.status(404).json({ success: false, message: 'Assignee user not found' });
  }

  complaint.assignedTo = assignedTo;
  if (complaint.status === 'pending') {
    complaint.status = 'in_review';
  }
  await complaint.save();

  // Notify assignee
  try {
    await createNotification({
      userId: assignedTo,
      title: 'New Complaint Assigned',
      message: `You have been assigned a new complaint: ${complaint.description.substring(0, 50)}...`,
      type: 'GENERAL',
      module: 'Campus Environment',
      relatedId: complaint._id
    });
  } catch (err) {
    console.error('Notification Error:', err);
  }

  return sendSuccess(res, 'Complaint assigned successfully', complaint);
});

// @desc    Update complaint status
// @route   PUT /api/campus-environment/:id/status
// @access  Private (Admin/Staff)
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  const complaint = await CampusEnvironmentComplaint.findById(req.params.id);

  if (!complaint) {
    return res.status(404).json({ success: false, message: 'Complaint not found' });
  }

  const allowedStatuses = ['pending', 'in_review', 'resolved', 'completed', 'rejected'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  // ── Support threshold gate ──────────────────────────────────────────
  // A campus issue requires at least 20 student supports before it can
  // be marked as Resolved.
  if (status === 'resolved') {
    const CAMPUS_MIN_SUPPORTS = 20;
    if ((complaint.supportCount || 0) < CAMPUS_MIN_SUPPORTS) {
      return res.status(400).json({
        success: false,
        message: 'This campus issue cannot be resolved until it receives at least 20 student supports.'
      });
    }
  }

  const oldStatus = complaint.status;
  complaint.status = status;
  await complaint.save();

  // Create tracking record
  await CampusEnvironmentTracking.create({
    complaint: complaint._id,
    oldStatus,
    newStatus: status,
    changedBy: req.user.id,
    note
  });

  // Notify student
  try {
    await createNotification({
      userId: complaint.student,
      title: 'Complaint Update',
      message: `Your complaint status is now: ${status.replace('_', ' ')}.`,
      type: 'GENERAL',
      module: 'Campus Environment',
      relatedId: complaint._id
    });
  } catch (err) {
    console.error('Notification Error:', err);
  }

  // Trigger dashboard refreshes
  emitDashboardRefresh('admin');
  emitDashboardRefresh('staff');

  try {
    const { getIO } = require('../../../socket');
    getIO().emit('statusUpdated', { complaintId: req.params.id, status });
  } catch (err) {
    console.error('Socket emit error:', err);
  }

  return sendSuccess(res, 'Status updated successfully', complaint);
});

// @desc    Get dashboard statistics
// @route   GET /api/campus-environment/dashboard/stats
// @access  Private (Admin/Staff)
exports.getStats = asyncHandler(async (req, res) => {
  const stats = await CampusEnvironmentComplaint.aggregate([
    {
      $facet: {
        statusCounts: [
          { $group: { _id: "$status", count: { $sum: 1 } } }
        ],
        issueTypeCounts: [
          { $group: { _id: "$issueType", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'campusenvironmentissues',
              localField: '_id',
              foreignField: '_id',
              as: 'details'
            }
          }
        ],
        total: [{ $count: "count" }]
      }
    }
  ]);

  const formattedStats = {
    total: stats[0].total[0]?.count || 0,
    status: {
      pending: stats[0].statusCounts.find(s => s._id === 'pending')?.count || 0,
      in_review: stats[0].statusCounts.find(s => s._id === 'in_review')?.count || 0,
      resolved: stats[0].statusCounts.find(s => s._id === 'resolved')?.count || 0,
      completed: stats[0].statusCounts.find(s => s._id === 'completed')?.count || 0,
      rejected: stats[0].statusCounts.find(s => s._id === 'rejected')?.count || 0
    },
    topIssues: stats[0].issueTypeCounts.map(i => ({
      name: i.details[0]?.issueName || 'Unknown',
      count: i.count
    }))
  };

  // Get highest supported complaints
  formattedStats.hotComplaints = await CampusEnvironmentComplaint.find()
    .populate('issueType')
    .populate({
      path: 'student',
      select: 'fullName class',
      populate: { path: 'class', select: 'name' }
    })
    .sort({ supportCount: -1 })
    .limit(5)
    .lean();

  return sendSuccess(res, 'Statistics fetched successfully', formattedStats);
});

// @desc    Get tracking history
// @route   GET /api/campus-environment/:id/tracking
// @access  Private
exports.getTrackingHistory = asyncHandler(async (req, res) => {
  const history = await CampusEnvironmentTracking.find({ complaint: req.params.id })
    .populate('changedBy', 'fullName role')
    .sort({ createdAt: -1 })
    .lean();
  
  return sendSuccess(res, 'Tracking history fetched successfully', history);
});

// @desc    Get all issue categories
// @route   GET /api/campus-environment/issue-types
// @access  Private
exports.getIssueTypes = asyncHandler(async (req, res) => {
  // Return only admin/staff-registered categories for campus issues.
  // Format matches CampusEnvironmentIssue shape: { id, issueName, category }
  const categories = await Category.find({ categoryType: 'campus_issue', status: 'active', isTemporary: false })
    .sort({ name: 1 })
    .lean();

  const issues = categories.map(cat => ({
    _id: cat._id,
    id: cat._id,
    issueName: cat.name,
    category: cat.name,
    createdAt: cat.createdAt,
  }));

  return sendSuccess(res, 'Issue types fetched successfully', issues);
});

// @desc    Create a new issue category
// @route   POST /api/campus-environment/issue-types
// @access  Private (Admin)
exports.createIssueType = asyncHandler(async (req, res) => {
  const issueName = req.body.issueName || req.body.name;
  const category = req.body.category || 'Other';

  if (!issueName) {
    return res.status(400).json({ success: false, message: 'Issue name is required' });
  }

  // Check for existing issue type case-insensitively
  let issue = await CampusEnvironmentIssue.findOne({
    issueName: { $regex: new RegExp(`^${issueName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, 'i') }
  });

  if (!issue) {
    issue = await CampusEnvironmentIssue.create({ issueName, category });
  }

  return sendSuccess(res, 'Issue type created successfully', issue, 201);
});
