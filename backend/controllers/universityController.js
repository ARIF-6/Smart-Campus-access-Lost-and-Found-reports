const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Class = require('../models/Class');
const Campus = require('../models/Campus');
const { enforceHallCapacityForClass, enforceHallCapacityForHall } = require('../utils/hallCapacityHelper');

// Fallback dummy data if models not defined
const dummyFaculties = [
  { _id: '1', name: 'Engineering' },
  { _id: '2', name: 'Science' },
];
const dummyDepartments = [
  { _id: '1', name: 'Computer Science', facultyId: '1' },
  { _id: '2', name: 'Electrical', facultyId: '1' },
];
const dummyClasses = [
  { _id: '1', name: 'CS101', departmentId: '1' },
  { _id: '2', name: 'EE202', departmentId: '2' },
];

exports.getFaculties = async (req, res) => {
  try {
    const faculties = await Faculty.find();
    return res.status(200).json({ success: true, data: faculties });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.createFaculty = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Faculty Name is required' });
    }
    const newFaculty = await Faculty.create({ name, description });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(201).json({ success: true, data: newFaculty });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const depts = await Department.find().populate('facultyId', 'name');
    // Map facultyId to faculty for frontend compatibility
    const mappedDepts = depts.map(d => ({
      _id: d._id,
      name: d.name,
      description: d.description,
      facultyId: d.facultyId?._id || d.facultyId,
      faculty: d.facultyId ? { _id: d.facultyId._id, name: d.facultyId.name } : null,
      createdAt: d.createdAt
    }));
    return res.status(200).json({ success: true, data: mappedDepts });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { name, description, facultyId } = req.body;
    if (!name || !facultyId) {
      return res.status(400).json({ success: false, message: 'Name and Faculty ID are required' });
    }
    const newDept = await Department.create({ name, description, facultyId });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(201).json({ success: true, data: newDept });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.getClasses = async (req, res) => {
  try {
    const Hall = require('../models/Hall');
    const [classes, halls] = await Promise.all([
      Class.find().populate({
        path: 'departmentId',
        populate: { path: 'facultyId', select: 'name' }
      }),
      Hall.find().lean()
    ]);
    const mappedClasses = classes.map(c => {
      const assignedHall = halls.find(h => h.classes && h.classes.some(clsId => String(clsId) === String(c._id)));
      return {
        _id: c._id,
        name: c.name,
        academicYear: c.academicYear,
        departmentId: c.departmentId?._id || c.departmentId,
        department: c.departmentId ? { _id: c.departmentId._id, name: c.departmentId.name } : null,
        faculty: c.departmentId?.facultyId ? { _id: c.departmentId.facultyId._id, name: c.departmentId.facultyId.name } : null,
        hall: assignedHall ? { _id: assignedHall._id, name: assignedHall.name, campusId: assignedHall.campus } : null,
        createdAt: c.createdAt
      };
    });
    return res.status(200).json({ success: true, data: mappedClasses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.createClass = async (req, res) => {
  try {
    const { name, departmentId, academicYear, hallId } = req.body;
    if (!name || !departmentId || !hallId) {
      return res.status(400).json({ success: false, message: 'Name, Department ID, and Hall ID are required' });
    }
    
    // Assign to hall validation
    const Hall = require('../models/Hall');
    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ success: false, message: 'Lecture Hall not found' });
    }
    if (hall.classes && hall.classes.length >= 3) {
      return res.status(400).json({ success: false, message: 'This hall has reached its maximum capacity of 3 assigned classes.' });
    }

    const newClass = await Class.create({ name, departmentId, academicYear });
    
    if (!hall.classes) hall.classes = [];
    hall.classes.push(newClass._id);
    await hall.save();
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(201).json({ success: true, data: newClass });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.getHalls = async (req, res) => {
  try {
    const halls = await require('../models/Hall').find().populate('classes', 'name').populate('campus', 'name');
    const mapped = halls.map(h => ({
      _id: h._id,
      name: h.name,
      campus: h.campus ? { _id: h.campus._id, name: h.campus.name } : null,
      capacity: h.capacity,
      classes: h.classes ? h.classes.map(c => ({ _id: c._id, name: c.name })) : [],
      class: h.classes && h.classes[0] ? { _id: h.classes[0]._id, name: h.classes[0].name } : null, // backward compatibility
      createdAt: h.createdAt
    }));
    return res.status(200).json({ success: true, data: mapped });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.createHall = async (req, res) => {
  try {
    const { name, campus: campusId, capacity } = req.body;
    if (!name || !campusId) {
      return res.status(400).json({ success: false, message: 'Hall name and Campus are required' });
    }
    const Hall = require('../models/Hall');
    
    // Check for duplicate hall name in the same campus (case-insensitive)
    const existingHall = await Hall.findOne({
      campus: campusId,
      name: { $regex: new RegExp('^' + name.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
    });
    if (existingHall) {
      return res.status(400).json({ success: false, message: `A lecture hall with the name '${name}' already exists in this campus.` });
    }

    const newHall = await Hall.create({ name: name.trim(), campus: campusId, capacity, classes: [] });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(201).json({ success: true, data: newHall });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.editHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { name, classes: classIds, class: classId, campus: campusId, capacity } = req.body;
    const Hall = require('../models/Hall');
    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({ success: false, message: 'Hall not found' });
    }

    // Check for duplicate hall name on target campus (if changing name or campus)
    if (name !== undefined || campusId !== undefined) {
      const targetName = name !== undefined ? name : hall.name;
      const targetCampus = campusId !== undefined ? campusId : hall.campus;
      
      const existingHall = await Hall.findOne({
        _id: { $ne: hallId },
        campus: targetCampus,
        name: { $regex: new RegExp('^' + targetName.trim().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$', 'i') }
      });
      if (existingHall) {
        return res.status(400).json({ success: false, message: `A lecture hall with the name '${targetName}' already exists in this campus.` });
      }
    }

    // Support single class update or multiple classes update
    let targetClasses = classIds;
    if (!targetClasses && classId) {
      targetClasses = [classId];
    }

    if (targetClasses) {
      if (targetClasses.length > 3) {
        return res.status(400).json({ success: false, message: 'A hall can be assigned to a maximum of 3 classes.' });
      }
      hall.classes = targetClasses;
    }
    
    if (name !== undefined) hall.name = name.trim();
    if (campusId !== undefined) hall.campus = campusId;
    if (capacity !== undefined) hall.capacity = capacity;
    await hall.save();
    await enforceHallCapacityForHall(hallId);
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, data: hall });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// Get students and class leader details for a specific class
exports.getClassStudents = async (req, res) => {
  try {
    const { classId } = req.params;
    const mongoose = require('mongoose');
    const ClassModel = require('../models/Class');
    const User = require('../models/User');
    const Hall = require('../models/Hall');

    const classDetail = await ClassModel.findById(classId)
      .populate('classLeader', 'fullName email studentId isClassLeader isActive photoUrl')
      .populate({
        path: 'departmentId',
        select: 'name facultyId',
        populate: { path: 'facultyId', select: 'name' }
      })
      .lean();
    if (!classDetail) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const assignedHall = await Hall.findOne({ classes: classId })
      .select('name campus capacity classes')
      .populate('campus', 'name')
      .lean();

    // Build query: students whose `class` field matches classId.
    // Also include the class leader by their _id in case their `class` field
    // is out of sync (e.g. was set before the class was created or has a type mismatch).
    const classObjectId = new mongoose.Types.ObjectId(classId);
    const leaderUserId = classDetail.classLeader?._id || classDetail.classLeader || null;

    const orConditions = [{ class: classObjectId }];
    if (leaderUserId) {
      orConditions.push({ _id: leaderUserId });
    }

    const students = await User.find({
      role: 'student',
      isDeleted: { $ne: true },
      $or: orConditions
    })
      .select('fullName email studentId phone isClassLeader isActive photoUrl class')
      .populate('class', 'name academicYear')
      .lean();

    const classInfo = {
      _id: classDetail._id,
      name: classDetail.name,
      academicYear: classDetail.academicYear,
      departmentId: classDetail.departmentId?._id || classDetail.departmentId,
      department: classDetail.departmentId ? {
        _id: classDetail.departmentId._id,
        name: classDetail.departmentId.name
      } : null,
      faculty: classDetail.departmentId?.facultyId ? {
        _id: classDetail.departmentId.facultyId._id,
        name: classDetail.departmentId.facultyId.name
      } : null,
      classLeader: classDetail.classLeader || null,
      hall: assignedHall || null
    };

    const studentsWithClassContext = students.map((student) => ({
      ...student,
      class: student.class || { _id: classInfo._id, name: classInfo.name, academicYear: classInfo.academicYear },
      hall: assignedHall || null
    }));

    return res.status(200).json({
      success: true,
      data: {
        classInfo,
        hall: assignedHall || null,
        totalStudents: studentsWithClassContext.length,
        students: studentsWithClassContext
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

// Assign a student as the Class Leader
exports.assignClassLeader = async (req, res) => {
  try {
    const { classId } = req.params;
    const { studentId } = req.body; // User's _id
    const ClassModel = require('../models/Class');
    const User = require('../models/User');

    const classDetail = await ClassModel.findById(classId);
    if (!classDetail) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    const newLeader = await User.findById(studentId);
    if (!newLeader || newLeader.role !== 'student') {
      return res.status(400).json({ success: false, message: 'Invalid student selected' });
    }

    // Reset previous class leader in this class
    await User.updateMany(
      { class: classId, isClassLeader: true },
      { $set: { isClassLeader: false } }
    );

    // Set new class leader — always ensure class field is set to this classId
    newLeader.isClassLeader = true;
    newLeader.class = classId;  // ensure the class reference is correct
    await newLeader.save();

    // Also fix any out-of-sync: ensure the leader's class field is persisted with $set directly
    await User.updateOne(
      { _id: studentId },
      { $set: { class: classId, isClassLeader: true } }
    );

    // Assign class leader in Class document
    classDetail.classLeader = studentId;
    await classDetail.save();

    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'Class Leader assigned successfully',
      data: {
        classInfo: classDetail,
        leader: newLeader
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

const crypto = require('crypto');

const ensureValidCampusQR = async (campus) => {
  const now = new Date();
  if (!campus.qrCode || !campus.qrExpiresAt || now >= campus.qrExpiresAt) {
    campus.qrCode = `CAMPUS-${campus._id}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    campus.qrGeneratedAt = now;
    // Set to expire at midnight of the next day (roughly 24 hours)
    const tomorrowMidnight = new Date();
    tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
    tomorrowMidnight.setHours(0, 0, 0, 0);
    campus.qrExpiresAt = tomorrowMidnight;
    await campus.save();
  }
  return campus;
};

exports.getCampuses = async (req, res) => {
  try {
    const campuses = await Campus.find();
    // Dynamically ensure every campus has a valid active QR code
    for (let i = 0; i < campuses.length; i++) {
      campuses[i] = await ensureValidCampusQR(campuses[i]);
    }
    return res.status(200).json({ success: true, data: campuses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.createCampus = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Campus Name is required' });
    }
    // Check duplicate
    const existing = await Campus.findOne({ name });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Campus name already exists' });
    }
    let newCampus = await Campus.create({ name });
    newCampus = await ensureValidCampusQR(newCampus);
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(201).json({ success: true, data: newCampus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.updateCampus = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Campus Name is required' });
    let campus = await Campus.findByIdAndUpdate(id, { name }, { new: true, runValidators: true });
    if (!campus) return res.status(404).json({ success: false, message: 'Campus not found' });
    campus = await ensureValidCampusQR(campus);
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, data: campus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.deleteCampus = async (req, res) => {
  try {
    const { id } = req.params;
    const campus = await Campus.findByIdAndDelete(id);
    if (!campus) return res.status(404).json({ success: false, message: 'Campus not found' });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, message: 'Campus deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Faculty Name is required' });
    const faculty = await Faculty.findByIdAndUpdate(id, { name, description }, { new: true, runValidators: true });
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, data: faculty });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    const faculty = await Faculty.findByIdAndDelete(id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, message: 'Faculty deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, facultyId } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Department Name is required' });
    const dept = await Department.findByIdAndUpdate(id, { name, description, facultyId }, { new: true, runValidators: true }).populate('facultyId', 'name');
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, data: dept });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findByIdAndDelete(id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId, academicYear, hallId } = req.body;
    if (!name || !hallId) return res.status(400).json({ success: false, message: 'Class Name and Hall ID are required' });
    
    const Hall = require('../models/Hall');
    // Check if new hall has space
    const newHall = await Hall.findById(hallId);
    if (!newHall) {
      return res.status(404).json({ success: false, message: 'Lecture Hall not found' });
    }
    if (newHall.classes && newHall.classes.length >= 3 && !newHall.classes.includes(id)) {
      return res.status(400).json({ success: false, message: 'The selected hall has reached its maximum limit of 3 assigned classes.' });
    }

    const cls = await require('../models/Class').findByIdAndUpdate(id, { name, departmentId, academicYear }, { new: true, runValidators: true });
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    
    // Manage hall assignments
    // Clear any previous halls associated with this class
    await Hall.updateMany({ classes: id }, { $pull: { classes: id } });
    
    if (!newHall.classes) newHall.classes = [];
    if (!newHall.classes.includes(id)) {
      newHall.classes.push(id);
      await newHall.save();
    }
    await enforceHallCapacityForClass(id);

    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, data: cls });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;
    const cls = await require('../models/Class').findByIdAndDelete(id);
    if (!cls) return res.status(404).json({ success: false, message: 'Class not found' });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

exports.deleteHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const Hall = require('../models/Hall');
    const hall = await Hall.findByIdAndDelete(hallId);
    if (!hall) return res.status(404).json({ success: false, message: 'Hall not found' });
    
    try {
      const { emitGlobalEvent } = require('../socket/events/notificationEvents');
      emitGlobalEvent('university:updated', {});
    } catch (_) {}

    return res.status(200).json({ success: true, message: 'Hall deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/university/campuses/:id/qr
 * Returns the campus QR code details as JSON (for admin dashboard display).
 */
exports.getCampusQR = async (req, res) => {
  try {
    const { id } = req.params;
    let campus = await Campus.findById(id);
    if (!campus) return res.status(404).json({ success: false, message: 'Campus not found' });

    // Ensure QR is fresh
    campus = await ensureValidCampusQR(campus);

    return res.status(200).json({
      success: true,
      data: {
        _id: campus._id,
        name: campus.name,
        qrCode: campus.qrCode,
        qrGeneratedAt: campus.qrGeneratedAt,
        qrExpiresAt: campus.qrExpiresAt,
        isExpired: new Date() >= new Date(campus.qrExpiresAt),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error', error: err.message });
  }
};

/**
 * GET /api/university/campuses/:id/qr/pdf
 * Generates and streams a printable PDF for the campus QR code using pdfkit + qrcode.
 */
exports.getCampusQRPDF = async (req, res) => {
  try {
    const QRCode = require('qrcode');
    const PDFDocument = require('pdfkit');
    const { id } = req.params;

    let campus = await Campus.findById(id);
    if (!campus) return res.status(404).json({ success: false, message: 'Campus not found' });

    campus = await ensureValidCampusQR(campus);

    // Generate QR code as a PNG buffer
    const qrImageBuffer = await QRCode.toBuffer(campus.qrCode, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: { dark: '#1B3A6B', light: '#FFFFFF' },
    });

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', margin: 60 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="campus-qr-${campus.name.replace(/\s+/g, '-')}.pdf"`
    );
    doc.pipe(res);

    // ── Header bar ─────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 100).fill('#1B3A6B');

    doc.fillColor('#FFFFFF')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('Smart Campus Access', 60, 28, { align: 'center' })
       .fontSize(13)
       .font('Helvetica')
       .text('Official Campus QR Code', 60, 56, { align: 'center' });

    // ── Campus name ────────────────────────────────────────────────────
    doc.fillColor('#1B3A6B')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text(campus.name, 60, 130, { align: 'center' });

    // ── QR image ────────────────────────────────────────────────────────
    const qrSize = 260;
    const qrX = (doc.page.width - qrSize) / 2;
    doc.image(qrImageBuffer, qrX, 185, { width: qrSize, height: qrSize });

    // ── Border around QR ────────────────────────────────────────────────
    doc.rect(qrX - 12, 185 - 12, qrSize + 24, qrSize + 24)
       .stroke('#1B3A6B');

    // ── Details section ────────────────────────────────────────────────
    const detailsY = 185 + qrSize + 40;
    const formattedGen = campus.qrGeneratedAt
      ? new Date(campus.qrGeneratedAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
      : 'N/A';
    const formattedExp = campus.qrExpiresAt
      ? new Date(campus.qrExpiresAt).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
      : 'N/A';

    doc.fillColor('#374151').fontSize(11).font('Helvetica-Bold')
       .text('Generated:', 60, detailsY);
    doc.fillColor('#6B7280').font('Helvetica').fontSize(10)
       .text(formattedGen, 155, detailsY);

    doc.fillColor('#374151').fontSize(11).font('Helvetica-Bold')
       .text('Expires:', 60, detailsY + 20);
    doc.fillColor('#EF4444').font('Helvetica-Bold').fontSize(10)
       .text(formattedExp, 155, detailsY + 20);

    // ── Footer ─────────────────────────────────────────────────────────
    doc.rect(0, doc.page.height - 48, doc.page.width, 48).fill('#F3F4F6');
    doc.fillColor('#9CA3AF').fontSize(8).font('Helvetica')
       .text(
         `This QR code is valid for the current day only and rotates automatically at midnight. | Generated: ${new Date().toISOString()}`,
         60, doc.page.height - 32, { align: 'center' }
       );

    doc.end();
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate PDF', error: err.message });
    }
  }
};


