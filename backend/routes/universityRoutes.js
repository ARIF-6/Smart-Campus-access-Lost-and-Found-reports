const express = require('express');
const router = express.Router();
const { 
  getFaculties, 
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getDepartments, 
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  getHalls,
  createHall,
  editHall,
  deleteHall,
  getCampuses,
  createCampus,
  updateCampus,
  deleteCampus,
  getClassStudents,
  assignClassLeader,
  getCampusQR,
  getCampusQRPDF,
} = require('../controllers/universityController');
const { protect } = require('../middleware/authMiddleware');
const { optionalProtect } = require('../middleware/optionalAuthMiddleware');
const { adminOrStaff, allowRoles } = require('../middleware/roleMiddleware');

// Public GET endpoints — optional auth enables staff campus filtering when logged in
router.get('/faculties', optionalProtect, getFaculties);
router.get('/departments', optionalProtect, getDepartments);
router.get('/halls', optionalProtect, getHalls);
router.get('/classes', optionalProtect, getClasses);
router.get('/campuses', optionalProtect, getCampuses);

// Campus CRUD — write operations: admin/superadmin only
router.post('/campuses', protect, allowRoles('admin', 'superadmin'), createCampus);
router.put('/campuses/:id', protect, allowRoles('admin', 'superadmin'), updateCampus);
router.delete('/campuses/:id', protect, allowRoles('admin', 'superadmin'), deleteCampus);

// Campus QR endpoints — staff can also view
router.get('/campuses/:id/qr', protect, adminOrStaff, getCampusQR);
router.get('/campuses/:id/qr/pdf', protect, adminOrStaff, getCampusQRPDF);

// Faculty CRUD — write operations: admin/superadmin only
router.post('/faculties', protect, allowRoles('admin', 'superadmin'), createFaculty);
router.put('/faculties/:id', protect, allowRoles('admin', 'superadmin'), updateFaculty);
router.delete('/faculties/:id', protect, allowRoles('admin', 'superadmin'), deleteFaculty);

// Department CRUD — write operations: admin/superadmin only
router.post('/departments', protect, allowRoles('admin', 'superadmin'), createDepartment);
router.put('/departments/:id', protect, allowRoles('admin', 'superadmin'), updateDepartment);
router.delete('/departments/:id', protect, allowRoles('admin', 'superadmin'), deleteDepartment);

// Class CRUD — write operations: admin/superadmin only, staff can update class hall assignment via PUT
router.post('/classes', protect, allowRoles('admin', 'superadmin'), createClass);
router.put('/classes/:id', protect, adminOrStaff, updateClass);
router.delete('/classes/:id', protect, allowRoles('admin', 'superadmin'), deleteClass);

// Hall CRUD — write operations: admin/superadmin only
router.post('/halls', protect, allowRoles('admin', 'superadmin'), createHall);
router.put('/halls/:hallId', protect, allowRoles('admin', 'superadmin'), editHall);
router.delete('/halls/:hallId', protect, allowRoles('admin', 'superadmin'), deleteHall);

// Class Leader Management endpoints
router.get('/classes/:classId/students', protect, getClassStudents);
router.post('/classes/:classId/assign-leader', protect, adminOrStaff, assignClassLeader);

module.exports = router;
