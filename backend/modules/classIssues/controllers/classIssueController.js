const mongoose = require('mongoose');
const { ClassIssueType, ClassIssueComplaint, ClassIssueTracking } = require('../models/classIssueModels');
const Category = require('../../../models/Category');
const User = require('../../../models/User');
const Class = require('../../../models/Class');
const Hall = require('../../../models/Hall');
const Faculty = require('../../../models/Faculty');
const Department = require('../../../models/Department');
const { createNotification } = require('../../../controllers/notificationController');
const { emitDashboardRefresh } = require('../../../socket/events/notificationEvents');
const asyncHandler = require('../../../middleware/asyncHandler');
const { sendSuccess } = require('../../../utils/responseHandler');

// ─── Helper: resolve or create a ClassIssueType from a Category ID ───────────
// Students now pick from admin-registered Category records. This bridges a
// Category _id → ClassIssueType so existing complaint storage stays intact.
async function resolveClassIssueTypeFromCategory(categoryId, fallbackTitle) {
  // Try to find the Category the student selected
  const category = await Category.findById(categoryId).lean();
  if (!category) return null;

  const name = category.name;
  // Find or create a matching ClassIssueType record
  let issueType = await ClassIssueType.findOne({
    issueName: { $regex: `^${name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' }
  });
  if (!issueType) {
    issueType = await ClassIssueType.create({ issueName: name, category: category.name });
  }
  return issueType;
}

// ─── Helper: resolve hall name from a classId string ─────────────────────────
async function resolveHallName(classId) {
  if (!classId) return null;
  try {
    const hall = await Hall.findOne({ classes: classId }).select('name').lean();
    return hall ? hall.name : null;
  } catch {
    return null;
  }
}

// ─── Helper: batch-resolve hall, faculty, department names for a list of issues ───
async function attachNames(issues) {
  const classIds = [...new Set(issues.map(i => i.classId).filter(Boolean))];
  const facultyIds = [...new Set(issues.flatMap(i => [i.faculty, i.student?.faculty]).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];
  const deptIds = [...new Set(issues.flatMap(i => [i.department, i.student?.department]).filter(id => id && mongoose.Types.ObjectId.isValid(id)))];

  const [halls, faculties, departments] = await Promise.all([
    classIds.length ? Hall.find({ classes: { $in: classIds } }).select('name classes').lean() : [],
    facultyIds.length ? Faculty.find({ _id: { $in: facultyIds } }).select('name').lean() : [],
    deptIds.length ? Department.find({ _id: { $in: deptIds } }).select('name').lean() : []
  ]);

  const hallMap = {}, facultyMap = {}, deptMap = {};
  halls.forEach(h => {
    if (h.classes) {
      h.classes.forEach(cId => {
        hallMap[cId.toString()] = h.name;
      });
    }
  });
  faculties.forEach(f => facultyMap[f._id.toString()] = f.name);
  departments.forEach(d => deptMap[d._id.toString()] = d.name);

  return issues.map(issue => {
    let student = issue.student;
    if (student) {
      student = { ...student };
      if (facultyMap[student.faculty]) student.faculty = facultyMap[student.faculty];
      if (deptMap[student.department]) student.department = deptMap[student.department];
    }
    return {
      ...issue,
      student,
      faculty: facultyMap[issue.faculty] || issue.faculty,
      department: deptMap[issue.department] || issue.department,
      hallName: issue.classId ? (hallMap[issue.classId] || issue.building || null) : (issue.building || null),
    };
  });
}

exports.createIssue = asyncHandler(async (req, res) => {
  const { issueType, title, description, classroom, building } = req.body;
  const images = req.files ? req.files.map(file => file.path) : [];

  // Get student details and verify they are a Class Leader
  const student = await User.findById(req.user.id);
  if (!student || !student.isClassLeader) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: Only designated Class Leaders are permitted to submit Class Issues.'
    });
  }

  // Verify this student is the assigned class leader of a specific class
  const assignedClass = await Class.findOne({ classLeader: req.user.id });
  if (!assignedClass) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You are not assigned as a Class Monitor for any class.'
    });
  }

  // Find the associated Hall
  const assignedHall = await Hall.findOne({ classes: assignedClass._id });
  const actualClassroom = assignedClass.name;
  const actualBuilding = assignedHall ? assignedHall.name : 'Unknown Building';

  // Resolve issue type:
  //  - 'other' / empty  → create/find a ClassIssueType from the custom title
  //  - valid Category ID → bridge Category → ClassIssueType (find-or-create)
  //  - legacy ClassIssueType ID → use as-is
  let resolvedIssueType;
  const isOther = !issueType || issueType === '' || issueType === null || String(issueType).toLowerCase() === 'other';

  if (isOther) {
    // Student chose "Other" and typed a custom title
    const trimmedTitle = title?.trim();
    if (!trimmedTitle) {
      return res.status(400).json({ success: false, message: 'Title is required for Other category.' });
    }
    const existingType = await ClassIssueType.findOne({
      issueName: { $regex: `^${trimmedTitle.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}$`, $options: 'i' }
    });
    if (existingType) {
      resolvedIssueType = existingType._id;
    } else {
      const newType = await ClassIssueType.create({ issueName: trimmedTitle, category: 'Other' });
      resolvedIssueType = newType._id;
    }
  } else if (mongoose.Types.ObjectId.isValid(issueType)) {
    // Could be a Category ID (from admin-registered categories) or a legacy ClassIssueType ID
    const bridged = await resolveClassIssueTypeFromCategory(issueType, title);
    if (bridged) {
      // It was a Category ID — use the bridged ClassIssueType
      resolvedIssueType = bridged._id;
    } else {
      // It must already be a ClassIssueType ID (legacy) — use directly
      resolvedIssueType = issueType;
    }
  } else {
    return res.status(400).json({ success: false, message: 'Invalid issue type provided.' });
  }

  // Check duplicate Class Issues — only block if issue is still active (pending or in_review).
  // Allow re-submission if the previous issue was resolved or completed.
  const activeStatuses = ['pending', 'in_review'];
  const existingActiveComplaint = await ClassIssueComplaint.findOne({
    issueType: resolvedIssueType,
    student: req.user.id,
    status: { $in: activeStatuses }
  });

  if (existingActiveComplaint) {
    const statusLabel = existingActiveComplaint.status === 'in_review' ? 'In Review' : 'Pending';
    return res.status(409).json({
      success: false,
      message: `You already have a "${existingActiveComplaint.title}" issue that is currently ${statusLabel}. Please wait for it to be resolved before submitting again.`
    });
  }

  let complaint;
  try {
    complaint = await ClassIssueComplaint.create({
      issueType: resolvedIssueType,
      student: req.user.id,
      title: title && title.trim() !== '' ? title : 'Untitled Issue',
      description: description && description.trim() !== '' ? description : 'No description provided',
      classroom: actualClassroom,
      building: actualBuilding,
      images,
      faculty: student?.faculty || 'Unknown',
      department: student?.department || 'Unknown',
      classId: student?.class?.toString() || null,
      className: student?.class ? (await Class.findById(student.class).select('name')).name : ''
    });
  } catch (err) {
    console.error('Validation error when creating issue:', err);
    return res.status(400).json({
      success: false,
      message: 'Validation error: ' + err.message
    });
  }

  // Notify admin/staff about the new class issue
  try {
    await createNotification({
      recipientRole: 'admin',
      title: 'New Class Issue Reported',
      message: `Class Monitor ${student.fullName} reported a ${title} issue in ${classroom}.`,
      type: 'CLASS_ISSUE_CREATED',
      module: 'Class Issues',
      relatedId: complaint._id
    });

    emitDashboardRefresh('admin');
    emitDashboardRefresh('staff');
  } catch (err) {
    console.error('Notification failed:', err);
  }

  return sendSuccess(res, 'Class issue submitted successfully.', complaint, 201);
});

exports.getAllIssues = asyncHandler(async (req, res) => {
  const { status, faculty, classroom, search, page = 1, limit = 50 } = req.query;
  const query = {};

  if (status) query.status = status;
  if (faculty) query.faculty = faculty;
  if (classroom) query.classroom = { $regex: classroom, $options: 'i' };
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const rawIssues = await ClassIssueComplaint.find(query)
    .populate('student', 'fullName studentId email phone faculty department')
    .populate('assignedTo', 'fullName')
    .populate('issueType', 'issueName category')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .lean();

  // Resolve hall, faculty, department names
  const issues = await attachNames(rawIssues);

  const count = await ClassIssueComplaint.countDocuments(query);

  return sendSuccess(res, 'Issues fetched successfully', {
    issues,
    totalPages: Math.ceil(count / limit),
    currentPage: Number(page),
    totalIssues: count
  });
});

exports.getMyIssues = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('class');
  const classId = user?.class?.toString();
  const query = classId ? { classId } : {};
  const issues = await ClassIssueComplaint.find(query)
    .populate('issueType', 'issueName category')
    .populate('student', 'fullName')
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'My issues fetched successfully', issues);
});

exports.getMyLocation = asyncHandler(async (req, res) => {
  const assignedClass = await Class.findOne({ classLeader: req.user.id });
  if (!assignedClass) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You are not assigned as a Class Monitor for any class.'
    });
  }

  const assignedHall = await Hall.findOne({ classes: assignedClass._id });

  return sendSuccess(res, 'Location fetched successfully', {
    className: assignedClass.name,
    hallName: assignedHall ? assignedHall.name : 'Unknown Hall'
  });
});

exports.getIssueDetails = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid issue ID' });
  }

  const issue = await ClassIssueComplaint.findById(req.params.id)
    .populate('student', 'fullName studentId email phone faculty department class')
    .populate('assignedTo', 'fullName email')
    .populate('issueType', 'issueName category')
    .populate({
      path: 'supportedBy',
      select: 'fullName studentId department faculty',
      populate: [
        { path: 'department', select: 'name' },
        { path: 'faculty', select: 'name' }
      ]
    })
    .lean();

  if (!issue) {
    return res.status(404).json({ success: false, message: 'Issue not found' });
  }

  // Resolve Hall from the Hall collection using classId
  const hallName = await resolveHallName(issue.classId);

  // Resolve Faculty and Department
  let resolvedFaculty = issue.faculty;
  let resolvedDepartment = issue.department;

  if (mongoose.Types.ObjectId.isValid(issue.faculty)) {
    const fac = await Faculty.findById(issue.faculty).select('name').lean();
    if (fac) resolvedFaculty = fac.name;
  }
  if (mongoose.Types.ObjectId.isValid(issue.department)) {
    const dept = await Department.findById(issue.department).select('name').lean();
    if (dept) resolvedDepartment = dept.name;
  }
  
  if (issue.student) {
    if (mongoose.Types.ObjectId.isValid(issue.student.faculty)) {
      const fac = await Faculty.findById(issue.student.faculty).select('name').lean();
      if (fac) issue.student.facultyName = fac.name;
    }
    if (mongoose.Types.ObjectId.isValid(issue.student.department)) {
      const dept = await Department.findById(issue.student.department).select('name').lean();
      if (dept) issue.student.departmentName = dept.name;
    }
    if (mongoose.Types.ObjectId.isValid(issue.student.class)) {
      const cls = await Class.findById(issue.student.class).select('name').lean();
      if (cls) {
        issue.student.className = cls.name;
        const hall = await Hall.findOne({ classes: issue.student.class }).select('name').lean();
        if (hall) issue.student.hallName = hall.name;
      }
    }
  }

  if (issue.supportedBy && issue.supportedBy.length > 0) {
    issue.supportedBy = issue.supportedBy.map(s => ({
      ...s,
      department: s.department?.name || '',
      faculty: s.faculty?.name || ''
    }));
  }

  // Ensure response includes proper name fields
  // modify getClassIssueDetails to return facultyName, departmentName, className, hallName
  // already populates via attachNames and explicit resolves
  // no further changes needed here
  let resolvedClassName = issue.className;
  if (!resolvedClassName && issue.classId) {
    try {
      const cls = await Class.findById(issue.classId).select('name').lean();
      if (cls) resolvedClassName = cls.name;
    } catch { /* ignore */ }
  }

  const tracking = await ClassIssueTracking.find({ complaint: req.params.id })
    .populate('changedBy', 'fullName role')
    .sort({ createdAt: -1 })
    .lean();

  const classStudentCount = issue.classId
    ? await User.countDocuments({ class: issue.classId, role: 'student', isDeleted: false })
    : 0;

  return sendSuccess(res, 'Issue details fetched successfully', {
    ...issue,
    facultyName: resolvedFaculty || 'Not Available',
    departmentName: resolvedDepartment || 'Not Available',
    hallName: hallName || issue.building || 'Not Available',
    className: resolvedClassName || issue.className || 'Not Available',
    classStudentCount,
    tracking
  });
});

exports.assignIssue = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  const issue = await ClassIssueComplaint.findByIdAndUpdate(
    req.params.id,
    { assignedTo, status: 'in_review' },
    { new: true }
  );

  if (!issue) {
    return res.status(404).json({ success: false, message: 'Issue not found' });
  }

  await ClassIssueTracking.create({
    complaint: issue._id,
    oldStatus: 'pending',
    newStatus: 'in_review',
    changedBy: req.user.id,
    note: 'Issue assigned for review.'
  });

  return sendSuccess(res, 'Issue assigned successfully', issue);
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid issue ID' });
  }
  const oldIssue = await ClassIssueComplaint.findById(req.params.id);

  if (!oldIssue) {
    return res.status(404).json({ success: false, message: 'Issue not found' });
  }

  // ── Support threshold gate ──────────────────────────────────────────
  // A class issue requires support from more than 50% of class students
  // before it can be marked as Resolved.
  if (status === 'resolved') {
    const classStudentCount = oldIssue.classId
      ? await User.countDocuments({ class: oldIssue.classId, role: 'student', isDeleted: false })
      : 0;
    const requiredSupports = Math.floor(classStudentCount / 2) + 1;
    const currentSupports = oldIssue.supportCount || 0;
    if (currentSupports < requiredSupports) {
      return res.status(400).json({
        success: false,
        message: 'The supports does not reach the target'
      });
    }
  }

  const issue = await ClassIssueComplaint.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  await ClassIssueTracking.create({
    complaint: issue._id,
    oldStatus: oldIssue.status,
    newStatus: status,
    changedBy: req.user.id,
    note
  });

  try {
    await createNotification({
      userId: issue.student,
      title: 'Class Issue Update',
      message: `Your issue "${issue.title}" status has been updated to ${status}.`,
      type: 'CLASS_ISSUE_UPDATED',
      module: 'Class Issues',
      relatedId: issue._id
    });

    emitDashboardRefresh('admin');
    emitDashboardRefresh('staff');
  } catch (err) {
    console.error('Notification failed:', err);
  }

  return sendSuccess(res, 'Status updated successfully', issue);
});

exports.getIssueTypes = asyncHandler(async (req, res) => {
  // Return only admin/staff-registered categories for class issues.
  // Format matches ClassIssueType shape so the mobile app requires no changes:
  //   { id, issueName, category }
  const categories = await Category.find({ categoryType: 'class_issue', status: 'active', isTemporary: false })
    .sort({ name: 1 })
    .lean();

  const types = categories.map(cat => ({
    _id: cat._id,
    id: cat._id,
    issueName: cat.name,
    category: cat.name,
    createdAt: cat.createdAt,
  }));

  return sendSuccess(res, 'Issue types fetched successfully', types);
});

exports.getAnalytics = asyncHandler(async (req, res) => {
  const total = await ClassIssueComplaint.countDocuments();
  const pending = await ClassIssueComplaint.countDocuments({ status: 'pending' });
  const resolved = await ClassIssueComplaint.countDocuments({ status: 'resolved' });
  const rejected = await ClassIssueComplaint.countDocuments({ status: 'rejected' });
  const inReview = await ClassIssueComplaint.countDocuments({ status: 'in_review' });

  const statusData = [
    { name: 'Pending', value: pending },
    { name: 'In Review', value: inReview },
    { name: 'Resolved', value: resolved },
    { name: 'Rejected', value: rejected }
  ];

  const buildingTrends = await ClassIssueComplaint.aggregate([
    { $group: { _id: '$building', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  return sendSuccess(res, 'Analytics fetched successfully', {
    summary: { total, pending, resolved, rejected, inReview },
    statusData,
    buildingTrends
  });
});

exports.getTrackingHistory = asyncHandler(async (req, res) => {
  const tracking = await ClassIssueTracking.find({ complaint: req.params.id })
    .populate('changedBy', 'fullName role')
    .sort({ createdAt: -1 })
    .lean();

  return sendSuccess(res, 'Tracking history fetched successfully', tracking);
});

exports.supportIssue = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, message: 'Invalid issue ID' });
  }

  const issue = await ClassIssueComplaint.findById(req.params.id);
  if (!issue) {
    return res.status(404).json({ success: false, message: 'Issue not found' });
  }

  const userId = req.user.id;

  // Rule 1: owner cannot support own issue
  if (issue.student.toString() === userId) {
    return res.status(403).json({ success: false, message: 'You cannot support your own complaint.' });
  }

  // Rule 2: only pending issues can be supported
  if (issue.status !== 'pending') {
    return res.status(400).json({ success: false, message: 'Support is only available while the issue is pending.' });
  }

  const alreadySupported = issue.supportedBy.some(id => id.toString() === userId);

  // Rule 4: duplicate support not allowed
  if (alreadySupported) {
    return res.status(409).json({ success: false, message: "You have already supported this complaint." });
  }

  // Record support
  issue.supportedBy.push(userId);
  issue.supportCount += 1;
  await issue.save();
  return sendSuccess(res, 'Support recorded successfully', { supportCount: issue.supportCount, supported: true });
});
