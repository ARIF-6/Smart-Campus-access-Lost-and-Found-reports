const User = require('../models/User');
const Role = require('../models/Role');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Class = require('../models/Class');
const Campus = require('../models/Campus');
const { enforceHallCapacityForClass } = require('../utils/hallCapacityHelper');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const fs = require('fs');
const { logAction } = require('../utils/auditLogger');
const { isValidObjectId } = require('mongoose');
const { emitToUser } = require('../socket/events/notificationEvents');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sendSuccess = (res, message, data = null, status = 200) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(status).json(payload);
};

const sendError = (res, message, status = 500) =>
  res.status(status).json({ success: false, message });

/** Validates that the academic year spans exactly one year (e.g. 24/25 or 2024/2025) starting Sept and ending next Sept */
const isValidAcademicYear = (academicYear) => {
  if (!academicYear) return true;
  const yearParts = String(academicYear).split('/');
  if (yearParts.length !== 2) return false;
  const startNum = parseInt(yearParts[0].trim(), 10);
  const endNum   = parseInt(yearParts[1].trim(), 10);
  if (isNaN(startNum) || isNaN(endNum)) return false;
  const startShort = startNum > 99 ? startNum % 100 : startNum;
  const endShort   = endNum   > 99 ? endNum   % 100 : endNum;
  return endShort === (startShort + 1) % 100;
};

/** Returns the current academic year in YY/YY format (e.g. 25/26). Year resets each September. */
const getCurrentAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  const startYear = month >= 9 ? year : year - 1;
  const endYear = startYear + 1;
  return `${String(startYear).slice(-2)}/${String(endYear).slice(-2)}`;
};

// ─── Excel column constants ───────────────────────────────────────────────────
// Normalized (lowercase, no spaces) column names for Excel student import
const EXCEL_REQUIRED_COLS = ['studentid', 'fullname', 'faculty', 'department', 'class', 'parentnumber'];
const EXCEL_OPTIONAL_COLS = ['academicyear', 'image'];
const EXCEL_ALL_ALLOWED  = new Set([...EXCEL_REQUIRED_COLS, ...EXCEL_OPTIONAL_COLS]);

/** Enrich a plain user object with resolved faculty/department/campus names */
const enrichUsers = async (users) => {
  const facultyIds = new Set();
  const departmentIds = new Set();
  const campusIds = new Set();
  const classIds = new Set();

  for (const user of users) {
    const facultyId = typeof user.faculty === 'object' ? user.faculty?._id : user.faculty;
    const departmentId = typeof user.department === 'object' ? user.department?._id : user.department;
    const campusId = typeof user.campus === 'object' ? user.campus?._id : user.campus;
    const classId = typeof user.class === 'object' ? user.class?._id : user.class;
    if (isValidObjectId(facultyId)) facultyIds.add(String(facultyId));
    if (isValidObjectId(departmentId)) departmentIds.add(String(departmentId));
    if (isValidObjectId(campusId)) campusIds.add(String(campusId));
    if (isValidObjectId(classId)) classIds.add(String(classId));
  }

  const [faculties, departments, campuses, classes] = await Promise.all([
    Faculty.find({ _id: { $in: [...facultyIds] } }).select('name description').lean(),
    Department.find({ _id: { $in: [...departmentIds] } }).select('name description facultyId').lean(),
    Campus.find({ _id: { $in: [...campusIds] } }).select('name').lean(),
    Class.find({ _id: { $in: [...classIds] } }).select('name academicYear departmentId').lean(),
  ]);

  const facultyMap = new Map(faculties.map((f) => [String(f._id), f]));
  const departmentMap = new Map(departments.map((d) => [String(d._id), d]));
  const campusMap = new Map(campuses.map((c) => [String(c._id), c]));
  const classMap = new Map(classes.map((c) => [String(c._id), c]));

  return users.map((plainUser) => {
    const facultyId = typeof plainUser.faculty === 'object' ? plainUser.faculty?._id : plainUser.faculty;
    const departmentId = typeof plainUser.department === 'object' ? plainUser.department?._id : plainUser.department;
    const campusId = typeof plainUser.campus === 'object' ? plainUser.campus?._id : plainUser.campus;
    const classId = typeof plainUser.class === 'object' ? plainUser.class?._id : plainUser.class;
    return {
      ...plainUser,
      faculty: facultyMap.get(String(facultyId)) || plainUser.faculty || null,
      department: departmentMap.get(String(departmentId)) || plainUser.department || null,
      campus: campusMap.get(String(campusId)) || plainUser.campus || null,
      class: classMap.get(String(classId)) || plainUser.class || null,
    };
  });
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { role, search, status, department, class: classId, sortField = 'fullName', sortOrder = 'asc' } = req.query;

    const query = { isDeleted: { $ne: true } };

    // Staff can only see users they registered; admins/superadmins can see all
    if (req.user && req.user.role === 'staff') {
      query.createdBy = req.user.id;
    }

    if (role && role !== 'All') {
      const roles = role.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
      if (roles.length === 1) query.role = roles[0];
      else query.role = { $in: roles };
    }

    if (status === 'active') query.isActive = true;
    else if (status === 'inactive') query.isActive = false;

    if (department && isValidObjectId(department)) query.department = department;
    if (classId && isValidObjectId(classId)) query.class = classId;

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj = {};
    const allowedSortFields = ['fullName', 'email', 'role', 'createdAt', 'isActive', 'studentId'];
    if (allowedSortFields.includes(sortField)) {
      sortObj[sortField] = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortObj['fullName'] = 1;
    }

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(query);
    const rawUsers = await User.find(query)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean();

    const users = await enrichUsers(rawUsers);

    return sendSuccess(res, 'Users fetched successfully', {
      users,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('getAllUsers error:', error);
    return sendError(res, 'Server Error: ' + error.message);
  }
};

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').lean();
    if (!user) return sendError(res, 'User not found', 404);

    if (req.user && req.user.role === 'staff' && String(user.createdBy) !== req.user.id) {
      return sendError(res, 'Not authorized to view this user', 403);
    }

    const [enriched] = await enrichUsers([user]);
    return sendSuccess(res, 'User fetched successfully', enriched);
  } catch (error) {
    return sendError(res, 'Server Error: ' + error.message);
  }
};

// ─── POST /api/admin/users ────────────────────────────────────────────────────

exports.createUser = async (req, res) => {
  try {
    const {
      fullName, username, password, role,
      phone, address, studentId, parentNumber,
      faculty, department, class: classId, campus,
      assignedShift, shiftStartTime, shiftEndTime,
      academicYear, isActive,
    } = req.body;

    const userRole = (role || 'student').toLowerCase();

    // Check for duplicate username
    if (username) {
      const usernameExists = await User.findOne({ username: username.trim() });
      if (usernameExists) return sendError(res, 'Username already taken', 400);
    } else if (userRole !== 'student') {
      return sendError(res, 'Username is required for non-student roles', 400);
    }

    // Check for duplicate studentId
    if (studentId) {
      const sidExists = await User.findOne({ studentId: studentId.trim() });
      if (sidExists) return sendError(res, 'Student ID already in use', 400);
    }

    const photoUrl = req.file ? `/uploads/profiles/${req.file.filename}` : '';

    const generatedQrCode = userRole === 'student'
      ? crypto.randomBytes(16).toString('hex')
      : undefined;

    const userData = {
      fullName: fullName.trim(),
      username: username ? username.trim() : undefined,
      password,
      plainPassword: password,
      role: userRole,
      phone,
      address,
      photoUrl,
      isActive: isActive !== undefined ? isActive : true,
      isDeleted: false,
      createdBy: req.user?.id || null,
    };

    if (userRole === 'student') {
      if (academicYear && !isValidAcademicYear(academicYear)) {
        return sendError(res, `Academic year '${academicYear}' is invalid. It must span exactly one year (e.g. 24/25 or 2024/2025).`, 400);
      }
      userData.studentId = studentId;
      // Parse parentNumber as integer and validate minimum 9 digits
      if (parentNumber !== undefined && parentNumber !== '') {
        const parentNumInt = parseInt(parentNumber, 10);
        if (isNaN(parentNumInt) || parentNumInt < 100000000) {
          return sendError(res, 'Parent number must be a valid number with at least 9 digits', 400);
        }
        userData.parentNumber = parentNumInt;
      }
      userData.qrCode = generatedQrCode;
      userData.faculty = faculty || null;
      userData.department = department || null;
      userData.class = classId || null;
      userData.academicYear = academicYear || '25/26';
    } else if (['staff', 'clean', 'security'].includes(userRole)) {
      userData.campus = campus || null;
      if (userRole === 'security') {
        if (shiftStartTime && shiftEndTime) {
          if (shiftStartTime === shiftEndTime) {
            return sendError(res, 'Start Shift and End Shift cannot be the same. Please select different times.', 400);
          }
          const [h1, m1] = shiftStartTime.split(':').map(Number);
          const [h2, m2] = shiftEndTime.split(':').map(Number);
          if ((h2 * 60 + m2) < (h1 * 60 + m1)) {
            return sendError(res, 'End Shift must be later than the Start Shift.', 400);
          }
        }
        userData.assignedShift = assignedShift || 'none';
        userData.shiftStartTime = shiftStartTime || '';
        userData.shiftEndTime = shiftEndTime || '';
      }
    }

    const newUser = await User.create(userData);
    if (newUser.role === 'student' && newUser.class) {
      await enforceHallCapacityForClass(newUser.class);
    }

    await logAction({
      userId: req.user?.id,
      action: 'CREATE_USER',
      targetId: newUser._id,
      targetType: 'User',
      details: `Created user: ${newUser.email || newUser.fullName} (${userRole})`,
      req,
    });

    const plain = newUser.toObject();
    delete plain.password;

    return sendSuccess(res, 'User created successfully', plain, 201);
  } catch (error) {
    console.error('createUser error:', error);
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── PUT /api/admin/users/:id ─────────────────────────────────────────────────

exports.updateUser = async (req, res) => {
  try {
    const {
      fullName, username, password, role,
      phone, address, studentId, parentNumber, qrCode, photoUrl,
      faculty, department, class: classId, campus,
      assignedShift, shiftStartTime, shiftEndTime,
      academicYear, isActive,
    } = req.body;

    const user = await User.findById(req.params.id).select('+password');
    if (!user) return sendError(res, 'User not found', 404);

    if (req.user && req.user.role === 'staff' && String(user.createdBy) !== req.user.id) {
      return sendError(res, 'Not authorized to modify this user', 403);
    }

    // Duplicate checks
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username: username.trim(), _id: { $ne: user._id } });
      if (usernameExists) return sendError(res, 'Username already taken', 400);
    }
    if (studentId && studentId !== user.studentId) {
      const sidExists = await User.findOne({ studentId: studentId.trim(), _id: { $ne: user._id } });
      if (sidExists) return sendError(res, 'Student ID already in use', 400);
    }

    if (fullName) user.fullName = fullName.trim();
    if (username !== undefined) user.username = username ? username.trim() : user.username;
    if (password) {
      user.password = password;
      user.plainPassword = password;
    }
    if (role) user.role = role.toLowerCase();
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (isActive !== undefined) user.isActive = isActive;

    // Photo from file upload or body
    if (req.file) user.photoUrl = `/uploads/profiles/${req.file.filename}`;
    else if (photoUrl !== undefined) user.photoUrl = photoUrl;

    const userRole = user.role;

    if (userRole === 'student') {
      if (studentId !== undefined) user.studentId = studentId ? studentId.trim() : user.studentId;
      if (parentNumber !== undefined) {
        if (parentNumber === '' || parentNumber === null) {
          user.parentNumber = undefined;
        } else {
          const parentNumInt = parseInt(parentNumber, 10);
          if (isNaN(parentNumInt) || parentNumInt < 100000000) {
            return sendError(res, 'Parent number must be a valid number with at least 9 digits', 400);
          }
          user.parentNumber = parentNumInt;
        }
      }
      if (qrCode) user.qrCode = qrCode;
      user.faculty = faculty !== undefined ? (faculty || null) : user.faculty;
      user.department = department !== undefined ? (department || null) : user.department;
      user.class = classId !== undefined ? (classId || null) : user.class;
      if (academicYear !== undefined) {
        if (academicYear && !isValidAcademicYear(academicYear)) {
          return sendError(res, `Academic year '${academicYear}' is invalid. It must span exactly one year (e.g. 24/25 or 2024/2025).`, 400);
        }
        user.academicYear = academicYear;
      }
    } else {
      user.faculty = null;
      user.department = null;
      user.class = null;
    }

    if (['staff', 'clean', 'security'].includes(userRole)) {
      user.campus = campus !== undefined ? (campus || null) : user.campus;
      if (userRole === 'security') {
        const checkStart = shiftStartTime !== undefined ? shiftStartTime : user.shiftStartTime;
        const checkEnd = shiftEndTime !== undefined ? shiftEndTime : user.shiftEndTime;
        if (checkStart && checkEnd) {
          if (checkStart === checkEnd) {
            return sendError(res, 'Start Shift and End Shift cannot be the same. Please select different times.', 400);
          }
          const [h1, m1] = checkStart.split(':').map(Number);
          const [h2, m2] = checkEnd.split(':').map(Number);
          if ((h2 * 60 + m2) < (h1 * 60 + m1)) {
            return sendError(res, 'End Shift must be later than the Start Shift.', 400);
          }
        }
        if (assignedShift !== undefined) user.assignedShift = assignedShift;
        if (shiftStartTime !== undefined) user.shiftStartTime = shiftStartTime;
        if (shiftEndTime !== undefined) user.shiftEndTime = shiftEndTime;
      }
    }

    const updatedUser = await user.save();
    if (updatedUser.role === 'student' && updatedUser.class) {
      await enforceHallCapacityForClass(updatedUser.class);
    }

    await logAction({
      userId: req.user?.id,
      action: 'UPDATE_USER',
      targetId: updatedUser._id,
      targetType: 'User',
      details: `Updated user: ${updatedUser.email || updatedUser.fullName}`,
      req,
    });

    const plain = updatedUser.toObject();
    delete plain.password;
    const [enriched] = await enrichUsers([plain]);

    // If a security guard's shift was updated, push the fresh profile to their
    // connected socket so the mobile app refreshes without requiring a re-login.
    if (updatedUser.role === 'security' &&
        (assignedShift !== undefined || shiftStartTime !== undefined || shiftEndTime !== undefined)) {
      emitToUser(updatedUser._id.toString(), 'user:shiftUpdated', enriched);
    }

    return sendSuccess(res, 'User updated successfully', enriched);
  } catch (error) {
    console.error('updateUser error:', error);
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── DELETE /api/admin/users/:id (soft delete) ───────────────────────────────

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    if (req.user && req.user.role === 'staff' && String(user.createdBy) !== req.user.id) {
      return sendError(res, 'Not authorized to delete this user', 403);
    }

    if (user.email === 'admin@smartcampus.com') {
      return sendError(res, 'Cannot delete the main admin account', 403);
    }

    user.isDeleted = true;
    user.isActive = false;
    user.deletedAt = new Date();
    await user.save();

    await logAction({
      userId: req.user?.id,
      action: 'DELETE_USER',
      targetId: user._id,
      targetType: 'User',
      details: `Soft-deleted user: ${user.email || user.fullName}`,
      req,
    });

    return sendSuccess(res, 'User deleted successfully');
  } catch (error) {
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────

exports.changeRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return sendError(res, 'Role is required', 400);

    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    if (req.user && req.user.role === 'staff' && String(user.createdBy) !== req.user.id) {
      return sendError(res, 'Not authorized to change role for this user', 403);
    }

    if (user.email === 'admin@smartcampus.com' && role !== 'admin') {
      return sendError(res, 'Cannot change role of the main admin account', 403);
    }

    const oldRole = user.role;
    user.role = role.toLowerCase();
    await user.save();

    await logAction({
      userId: req.user?.id,
      action: 'CHANGE_ROLE',
      targetId: user._id,
      targetType: 'User',
      details: `Changed role from ${oldRole} to ${role} for ${user.email || user.fullName}`,
      req,
    });

    return sendSuccess(res, 'Role updated successfully', { role: user.role });
  } catch (error) {
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── PATCH /api/admin/users/:id/status ───────────────────────────────────────

exports.changeStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) return sendError(res, 'isActive is required', 400);

    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    if (req.user && req.user.role === 'staff' && String(user.createdBy) !== req.user.id) {
      return sendError(res, 'Not authorized to change status for this user', 403);
    }

    user.isActive = Boolean(isActive);
    await user.save();

    await logAction({
      userId: req.user?.id,
      action: isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      targetId: user._id,
      targetType: 'User',
      details: `${isActive ? 'Activated' : 'Deactivated'} user: ${user.email || user.fullName}`,
      req,
    });

    return sendSuccess(res, `User ${isActive ? 'activated' : 'deactivated'} successfully`, { isActive: user.isActive });
  } catch (error) {
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── PATCH /api/admin/users/:id/restore ──────────────────────────────────────

exports.restoreUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    user.isDeleted = false;
    user.isActive = true;
    user.deletedAt = null;
    await user.save();

    await logAction({
      userId: req.user?.id,
      action: 'RESTORE_USER',
      targetId: user._id,
      targetType: 'User',
      details: `Restored user: ${user.email || user.fullName}`,
      req,
    });

    return sendSuccess(res, 'User restored successfully');
  } catch (error) {
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── DELETE /api/admin/users/:id/permanent ────────────────────────────────────

exports.permanentDeleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    if (user.email === 'admin@smartcampus.com') {
      return sendError(res, 'Cannot permanently delete the main admin account', 403);
    }

    await User.findByIdAndDelete(req.params.id);

    await logAction({
      userId: req.user?.id,
      action: 'PERMANENT_DELETE_USER',
      targetId: user._id,
      targetType: 'User',
      details: `Permanently deleted user: ${user.email || user.fullName}`,
      req,
    });

    return sendSuccess(res, 'User permanently deleted');
  } catch (error) {
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── POST /api/admin/users/upload-excel ──────────────────────────────────────

exports.uploadExcelStudents = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No Excel file uploaded', 400);

    // ── Parse with ExcelJS to support embedded images ────────────────────────
    const ejsWorkbook = new ExcelJS.Workbook();
    await ejsWorkbook.xlsx.readFile(req.file.path);
    const ejsSheet = ejsWorkbook.getWorksheet(1);

    // Build a map: rowIndex (0-based, 0=header) -> { buffer, ext }
    const rowImageMap = {};
    ejsSheet.getImages().forEach(img => {
      const media = ejsWorkbook.media[img.imageId];
      if (!media || !media.buffer) return;
      const nativeRow = img.range && img.range.tl ? img.range.tl.nativeRow : undefined;
      if (nativeRow !== undefined && nativeRow >= 1) {
        // nativeRow 1 = data row 0 (row 2 in Excel, because row 1 is header)
        rowImageMap[nativeRow - 1] = { buffer: media.buffer, ext: media.extension || 'jpg' };
      }
    });

    // Also read row data with xlsx for easier key/value access
    const xlsxWorkbook = xlsx.readFile(req.file.path);
    const sheetName = xlsxWorkbook.SheetNames[0];
    const sheet = xlsxWorkbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return sendError(res, 'Excel file is empty or has no data rows', 400);
    }

    // ─── Header presence analysis (do not reject globally, check row-by-row) ──
    const rawHeaders = Object.keys(rows[0] || {});
    
    // Normalization helper mapping synonyms to standard database fields
    const normalizeHeaderKey = (key) => {
      const normalized = key.trim().toLowerCase().replace(/\s+/g, '');
      if (normalized === 'id' || normalized === 'studentid' || normalized === 'student_id') {
        return 'studentid';
      }
      if (normalized === 'parentnumber' || normalized === 'parent_number' || normalized === 'parent' || normalized === 'parentno' || normalized === 'parentphone') {
        return 'parentnumber';
      }
      if (normalized === 'image' || normalized === 'images' || normalized === 'photo' || normalized === 'picture') {
        return 'image';
      }
      if (normalized === 'academicyear' || normalized === 'academic_year' || normalized === 'year') {
        return 'academicyear';
      }
      if (normalized === 'fullname' || normalized === 'full_name' || normalized === 'name') {
        return 'fullname';
      }
      return normalized;
    };

    const normalizedHeaders = rawHeaders.map(h => normalizeHeaderKey(h));
    const headerSet = new Set(normalizedHeaders);

    const defaultAcademicYear = getCurrentAcademicYear();
    const allFaculties   = await Faculty.find().lean();
    const allDepartments = await Department.find().lean();
    // Use a mutable array so auto-created classes are reused for later rows
    let allClasses = await Class.find().lean();

    const created = [];
    const errors  = [];
    const affectedClassIds = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2; // row 1 = header

      // Normalise keys
      const norm = {};
      for (const [k, v] of Object.entries(row)) {
        norm[normalizeHeaderKey(k)] = String(v).trim();
      }

      const fullName     = norm['fullname']     || '';
      const studentId    = norm['studentid']    || '';
      const rawParentNum = norm['parentnumber'] || '';
      const facultyName  = norm['faculty']      || '';
      const deptName     = norm['department']   || '';
      const className    = norm['class']        || '';
      const academicYear = norm['academicyear'] || '';
      const imageVal     = norm['image']        || '';

      // ── Analyze missing columns vs null cells ───────────────────────────────
      const missingColumns = [];
      const nullRows = [];

      // Helper to map keys back to readable display names
      const getColDisplayName = (col) => {
        if (col === 'studentid') return 'StudentID';
        if (col === 'fullname') return 'FullName';
        if (col === 'faculty') return 'Faculty';
        if (col === 'department') return 'Department';
        if (col === 'class') return 'Class';
        if (col === 'parentnumber') return 'ParentNumber';
        return col;
      };

      // Check each required column
      EXCEL_REQUIRED_COLS.forEach(col => {
        if (!headerSet.has(col)) {
          missingColumns.push(getColDisplayName(col));
        } else {
          // Column header is present, check if cell value is empty
          const val = norm[col];
          if (!val) {
            nullRows.push(getColDisplayName(col));
          }
        }
      });

      if (missingColumns.length > 0) {
        errors.push(`Row ${rowNum}: there is a missing column ${missingColumns.join(', ')}`);
        continue;
      }

      if (nullRows.length > 0) {
        errors.push(`Row ${rowNum}: Sorry there is a missing row in ${nullRows.join(', ')}`);
        continue;
      }

      // ── Validate academic year (optional — use current if blank) ────────────
      const resolvedAcademicYear = academicYear || defaultAcademicYear;
      if (academicYear && !isValidAcademicYear(academicYear)) {
        errors.push(`Row ${rowNum}: the academic year consist of 1 year so use a valid academic year`);
        continue;
      }

      // ── Validate parentNumber ───────────────────────────────────────────────
      const parentNumInt = parseInt(rawParentNum, 10);
      if (isNaN(parentNumInt) || parentNumInt < 100000000) {
        errors.push(`Row ${rowNum}: Parent number '${rawParentNum}' must be a number with at least 9 digits.`);
        continue;
      }

      // ── Resolve faculty ─────────────────────────────────────────────────────
      const foundFac = allFaculties.find(f => f.name.trim().toLowerCase() === facultyName.toLowerCase());
      if (!foundFac) {
        errors.push(`Row ${rowNum}: Faculty '${facultyName}' not found in the database.`);
        continue;
      }
      const facultyId = String(foundFac._id);

      // ── Resolve department ──────────────────────────────────────────────────
      const foundDept = allDepartments.find(
        d => d.name.trim().toLowerCase() === deptName.toLowerCase() &&
             String(d.facultyId) === facultyId
      );
      if (!foundDept) {
        errors.push(`Row ${rowNum}: Department '${deptName}' not found under faculty '${facultyName}'.`);
        continue;
      }
      const departmentId = String(foundDept._id);

      // ── Resolve class — auto-create if missing ──────────────────────────────
      let classId = null;
      const foundClass = allClasses.find(
        c => c.name.trim().toLowerCase() === className.toLowerCase() &&
             String(c.departmentId) === departmentId
      );
      if (foundClass) {
        classId = String(foundClass._id);
      } else {
        try {
          const newClass = await Class.create({
            name: className,
            departmentId,
            academicYear: resolvedAcademicYear,
          });
          classId = String(newClass._id);
          allClasses.push(newClass.toObject ? newClass.toObject() : { ...newClass._doc });
        } catch (classErr) {
          errors.push(`Row ${rowNum}: Failed to auto-create class '${className}': ${classErr.message}`);
          continue;
        }
      }

      // ── Duplicate studentId check ───────────────────────────────────────────
      const exists = await User.findOne({ studentId });
      if (exists) {
        errors.push(`Row ${rowNum}: Student ID '${studentId}' already exists.`);
        continue;
      }

      // ── Build photoUrl: embedded image first, then URL string from cell ─────
      let photoUrl = imageVal || '';
      const embeddedImg = rowImageMap[i]; // i = 0-based data row index
      if (embeddedImg) {
        try {
          const profilesDir = path.join(__dirname, '../uploads/profiles');
          if (!fs.existsSync(profilesDir)) fs.mkdirSync(profilesDir, { recursive: true });
          const imgFilename = `student_${studentId}_${Date.now()}.${embeddedImg.ext}`;
          const imgPath = path.join(profilesDir, imgFilename);
          fs.writeFileSync(imgPath, embeddedImg.buffer);
          photoUrl = `/uploads/profiles/${imgFilename}`;
        } catch (imgErr) {
          console.warn(`Row ${rowNum}: Failed to save embedded image — ${imgErr.message}`);
        }
      }

      // ── Create student ──────────────────────────────────────────────────────
      try {
        const password = String(Math.floor(100000 + Math.random() * 900000));
        const qrCode   = crypto.randomBytes(16).toString('hex');
        const newStudent = await User.create({
          fullName,
          studentId,
          parentNumber: parentNumInt,
          photoUrl,
          role: 'student',
          password,
          plainPassword: password,
          qrCode,
          faculty:      facultyId,
          department:   departmentId,
          class:        classId,
          academicYear: resolvedAcademicYear,
          createdBy:    req.user?.id || null,
        });
        created.push({ _id: newStudent._id, fullName, studentId, password, photoUrl });
        if (classId) affectedClassIds.add(String(classId));
      } catch (err) {
        errors.push(`Row ${rowNum}: ${err.message}`);
      }
    }

    // Enforce hall capacities for all affected classes
    for (const cId of affectedClassIds) {
      await enforceHallCapacityForClass(cId);
    }

    await logAction({
      userId: req.user?.id,
      action: 'IMPORT_STUDENTS_EXCEL',
      targetType: 'User',
      details: `Imported ${created.length} students from Excel. ${errors.length} errors.`,
      req,
    });

    return sendSuccess(res, `Import complete. ${created.length} students created, ${errors.length} errors.`, {
      created,
      errors,
      totalCreated: created.length,
      totalErrors:  errors.length,
    });
  } catch (error) {
    console.error('uploadExcelStudents error:', error);
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── GET /api/trash/users ────────────────────────────────────────────────────

exports.getTrashedUsers = async (req, res) => {
  try {
    const users = await User.find({ isDeleted: true })
      .select('-password')
      .sort({ deletedAt: -1 })
      .lean();

    const enriched = await enrichUsers(users);
    return sendSuccess(res, 'Trashed users fetched successfully', enriched);
  } catch (error) {
    return sendError(res, error.message || 'Server Error');
  }
};

// ─── PATCH /api/admin/users/:id/photo ────────────────────────────────────────

exports.updateUserPhoto = async (req, res) => {
  try {
    if (!req.file) return sendError(res, 'No photo file uploaded', 400);

    const user = await User.findById(req.params.id);
    if (!user) return sendError(res, 'User not found', 404);

    if (req.user && req.user.role === 'staff' && String(user.createdBy) !== req.user.id) {
      return sendError(res, 'Not authorized to update this user', 403);
    }

    user.photoUrl = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    await logAction({
      userId: req.user?.id,
      action: 'UPDATE_USER',
      targetId: user._id,
      targetType: 'User',
      details: `Updated photo for user: ${user.fullName}`,
      req,
    });

    return sendSuccess(res, 'Photo updated successfully', { photoUrl: user.photoUrl });
  } catch (error) {
    console.error('updateUserPhoto error:', error);
    return sendError(res, error.message || 'Server Error');
  }
};
