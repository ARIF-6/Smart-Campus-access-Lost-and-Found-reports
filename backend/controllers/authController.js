const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { logAction } = require('../utils/auditLogger');
const asyncHandler = require('../middleware/asyncHandler');
const path = require('path');
const { sendSuccess } = require('../utils/responseHandler');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user (Staff only)
// @route   POST /api/auth/register
// @access  Public (Staff registration only)
exports.registerUser = asyncHandler(async (req, res) => {
  const { fullName, username, password, role, phone, address } = req.body;
  const normalizedUsername = username ? username.trim() : '';
  const cleanPassword = password ? password.trim() : '';

  if (!normalizedUsername) {
    return res.status(400).json({ success: false, message: 'Username is required' });
  }

  // Check if user exists
  const userExists = await User.findOne({ username: normalizedUsername });

  if (userExists) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }

  // Permission Logic: Admin can assign any role, Staff can only assign non-admin roles
  const dbRoles = await Role.find().select('name');
  const allRoleNames = dbRoles.map(r => r.name);
  const allowedRoles = (req.user.role === 'admin') ? allRoleNames : allRoleNames.filter(name => !['admin', 'staff'].includes(name));
  const userRole = role && allowedRoles.includes(role) ? role : 'student';


  // Create user
  const user = await User.create({
    fullName: fullName.trim(),
    username: normalizedUsername,
    password: cleanPassword,
    role: userRole,
    phone,
    address,
    createdBy: req.user ? req.user.id : null
  });

  // Log the action
  await logAction({
    userId: user._id,
    action: 'CREATE_USER',
    targetId: user._id,
    targetType: 'User',
    details: `New staff registration: ${user.username} (${user.role})`,
    req
  });

  return sendSuccess(res, 'User registered successfully', {
    token: generateToken(user._id),
    user: {
      id: user._id,
      _id: user._id,
      fullName: user.fullName,
      role: user.role,
      phone: user.phone,
      address: user.address,
      photoUrl: user.photoUrl,
      username: user.username
    }
  }, 201);
});

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = asyncHandler(async (req, res) => {
  // Safely handle cases where body might be a JSON string
  let parsedBody = req.body;
  if (typeof parsedBody === 'string') {
    try {
      parsedBody = JSON.parse(parsedBody);
    } catch (e) {
      // If parsing fails, keep original body to let validation handle errors
    }
  }
  const { email, username, password } = parsedBody; // 'email' or 'username' field contains the generic identifier from frontend
  const identifier = typeof username === 'string' ? username.trim() : (typeof email === 'string' ? email.trim() : '');
  const cleanPassword = typeof password === 'string' ? password.trim() : '';

  // 1. Try finding a Student using a case-insensitive check on studentId
  let studentUser = null;
  if (identifier) {
    studentUser = await User.findOne({
      role: 'student',
      isDeleted: false,
      studentId: { $regex: new RegExp('^' + identifier.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
    }).select('+password').lean();
  }

  // 2. Try finding Admin, Staff, Security Guard, or Cleaner using exact case-sensitive username match
  let staffUser = null;
  if (identifier && !studentUser) {
    const tempUser = await User.findOne({
      role: { $in: ['admin', 'staff', 'security', 'clean', 'cleaner', 'superadmin'] },
      isDeleted: false,
      username: identifier
    }).select('+password').lean();

    if (tempUser && tempUser.username === identifier) {
      staffUser = tempUser;
    }
  }

  const user = studentUser || staffUser;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }

  // 3. Prevent Students, Security Guards, or Cleaners from logging in to the web app
  // Check if the user trying to log in has an unauthorized role for this application.
  // Flutter/Mobile clients can log in with any role, but Web application blocks Student, Security, and Cleaner.
  const userAgent = req.headers['user-agent'] || '';
  const isMobileClient = userAgent.toLowerCase().includes('dart') || 
                         userAgent.toLowerCase().includes('flutter') || 
                         req.headers['x-client-platform'] === 'mobile';
                         
  if (!isMobileClient && user && !['admin', 'staff', 'superadmin'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: "You are not an Administrator or Staff member. Please log in using an Administrator or Staff account."
    });
  }

  if (user.isActive === false) {
    return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact the administrator.' });
  }

  // Check if password matches
  const isMatch = await bcrypt.compare(cleanPassword, user.password);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid username or password' });
  }

  // Device binding for student role — enforced on every login
  if (user.role === 'student') {
    const incomingDeviceId = parsedBody.deviceId;

    if (!incomingDeviceId) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required to login.'
      });
    }

    // Device registration disabled by administrator
    if (user.deviceRegistrationStatus === 'Inactive') {
      return res.status(403).json({
        success: false,
        message: 'Your device registration is inactive. Please contact the administrator if you have changed your phone.'
      });
    }

    // Prevent another student from using this device
    const otherStudent = await User.findOne({
      role: 'student',
      deviceId: incomingDeviceId,
      _id: { $ne: user._id },
      isDeleted: false
    });
    if (otherStudent) {
      return res.status(403).json({
        success: false,
        message: 'This device is already registered to another student account. Please contact the administrator.'
      });
    }

    const isDeviceRegistered = user.isActivated === true && user.deviceId;

    if (isDeviceRegistered) {
      if (user.deviceId !== incomingDeviceId) {
        return res.status(403).json({
          success: false,
          message: 'Your account is already registered on another device. Please contact the administrator if you have changed your phone.'
        });
      }
    } else {
      // First login or re-bind after admin reset — auto-register this device
      try {
        await User.updateOne(
          { _id: user._id },
          {
            deviceId: incomingDeviceId,
            isActivated: true,
            deviceRegistrationStatus: 'Active'
          }
        );
      } catch (err) {
        if (err.code === 11000) {
          return res.status(403).json({
            success: false,
            message: 'This device is already registered to another student account. Please contact the administrator.'
          });
        }
        throw err;
      }

      user.deviceId = incomingDeviceId;
      user.isActivated = true;

      await logAction({
        userId: user._id,
        action: 'REGISTER_DEVICE',
        targetId: user._id,
        targetType: 'User',
        details: `Student device registered on first login: ${user.studentId} (${user.fullName || user.name}), device: ${incomingDeviceId}`,
        req
      });
    }
  }

  // Log audit action — fire-and-forget so it doesn't delay the login response
  logAction({
    userId: user._id,
    action: 'LOGIN',
    targetId: user._id,
    targetType: 'User',
    details: `User logged in: ${user.username || user.fullName} (${user.role})`,
    req
  }).catch(() => {}); // Silently ignore audit write failures

  return sendSuccess(res, 'Login successful', {
    token: generateToken(user._id),
    user: {
      id: user._id,
      _id: user._id,
      fullName: user.fullName || user.name,
      role: user.role,
      studentId: user.studentId,
      qrCode: user.qrCode,
      classId: user.class ? (user.class._id ? user.class._id.toString() : user.class.toString()) : null,
      class: user.class ? (user.class.name || '') : '',
      className: user.class ? (user.class.name || '') : '',
      faculty: user.faculty ? (user.faculty.name || user.faculty.toString()) : '',
      department: user.department ? (user.department.name || user.department.toString()) : '',
      isActive: user.isActive,
      isActivated: user.isActivated !== false,
      deviceRegistrationStatus: user.deviceRegistrationStatus || 'Active',
      deviceId: user.deviceId || null,
      isClassLeader: user.isClassLeader || false,
      accessStatus: user.isActive ? 'active' : 'inactive',
      photoUrl: user.photoUrl,
      assignedShift: user.assignedShift,
      shiftStartTime: user.shiftStartTime || '',
      shiftEndTime: user.shiftEndTime || '',
      username: user.username
    }
  });
});

// @desc    Get user data
// @route   GET /api/auth/profile
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).populate('class').populate('faculty').populate('department');
  
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  return sendSuccess(res, 'Profile fetched successfully', {
    id: user._id,
    _id: user._id,
    fullName: user.fullName || user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    address: user.address,
    studentId: user.studentId,
    qrCode: user.qrCode,
    classId: user.class ? user.class._id.toString() : null,
    class: user.class ? user.class.name : '',
    className: user.class ? user.class.name : '',
    faculty: user.faculty ? (user.faculty.name || user.faculty.toString()) : '',
    department: user.department ? (user.department.name || user.department.toString()) : '',
    isActive: user.isActive,
    isActivated: user.isActivated !== false,
    deviceRegistrationStatus: user.deviceRegistrationStatus || 'Active',
    deviceId: user.deviceId || null,
    isClassLeader: user.isClassLeader || false,
    accessStatus: user.isActive ? 'active' : 'inactive',
    photoUrl: user.photoUrl,
    assignedShift: user.assignedShift,
    shiftStartTime: user.shiftStartTime || '',
    shiftEndTime: user.shiftEndTime || '',
    username: user.username
  });
});

// @desc    Update profile picture
// @route   PUT /api/auth/profile-picture
// @access  Private
exports.updateProfilePicture = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please upload an image' });
  }

  if (req.user.role === 'student') {
    return res.status(403).json({ success: false, message: 'Students are not allowed to update their profile picture directly' });
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }

  // Delete old Cloudinary image if it exists
  if (user.photoUrl && user.photoUrl.includes('cloudinary')) {
    try {
      const cloudinary = require('../config/cloudinary');
      const urlParts = user.photoUrl.split('/');
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split('.')[0];
      const folderPath = urlParts.slice(urlParts.indexOf('upload') + 2, urlParts.length - 1).join('/');
      const fullPublicId = folderPath ? `${folderPath}/${publicId}` : publicId;
      await cloudinary.uploader.destroy(fullPublicId);
    } catch (err) {
      console.error('Failed to delete old profile picture from Cloudinary:', err);
    }
  }

  // Update photoUrl: convert absolute path to relative path
  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const relativePath = path.relative(uploadsRoot, req.file.path).replace(/\\/g, '/');
  user.photoUrl = relativePath;
  await user.save();

  // Log action
  await logAction({
    userId: req.user.id,
    action: 'UPDATE_PROFILE_PICTURE',
    targetId: user._id,
    targetType: 'User',
    details: `User updated profile picture: ${user.username || user.fullName}`,
    req
  });

  return sendSuccess(res, 'Profile picture updated successfully', {
    photoUrl: relativePath,
    user: {
      id: user._id,
      _id: user._id,
      fullName: user.fullName || user.name,
      email: user.email,
      role: user.role,
      photoUrl: relativePath
    }
  });
});

// @desc    Logout user and log action
// @route   POST /api/auth/logout
// @access  Private
exports.logoutUser = asyncHandler(async (req, res) => {
  await logAction({
    userId: req.user.id,
    action: 'LOGOUT',
    targetId: req.user.id,
    targetType: 'User',
    details: `User logged out: ${req.user.username || req.user.fullName} (${req.user.role})`,
    req
  });
  return sendSuccess(res, 'Logout successful');
});

// @desc    Activate student account (deprecated — device binds automatically on login)
// @route   POST /api/auth/activate
// @access  Private (Authenticated student)
exports.activateAccount = asyncHandler(async (req, res) => {
  return res.status(410).json({
    success: false,
    message: 'Account activation codes are no longer required. Please log in again to register your device.'
  });
});

