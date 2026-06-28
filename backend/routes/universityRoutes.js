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
} = require('../controllers/universityController');
const { protect } = require('../middleware/authMiddleware');
const { adminOrStaff } = require('../middleware/roleMiddleware');

// Public GET endpoints
router.get('/faculties', getFaculties);
router.get('/departments', getDepartments);
router.get('/halls', getHalls);
router.get('/classes', getClasses);
router.get('/campuses', getCampuses);

// Campus CRUD
router.post('/campuses', protect, adminOrStaff, createCampus);
router.put('/campuses/:id', protect, adminOrStaff, updateCampus);
router.delete('/campuses/:id', protect, adminOrStaff, deleteCampus);

// Faculty CRUD
router.post('/faculties', protect, adminOrStaff, createFaculty);
router.put('/faculties/:id', protect, adminOrStaff, updateFaculty);
router.delete('/faculties/:id', protect, adminOrStaff, deleteFaculty);

// Department CRUD
router.post('/departments', protect, adminOrStaff, createDepartment);
router.put('/departments/:id', protect, adminOrStaff, updateDepartment);
router.delete('/departments/:id', protect, adminOrStaff, deleteDepartment);

// Class CRUD
router.post('/classes', protect, adminOrStaff, createClass);
router.put('/classes/:id', protect, adminOrStaff, updateClass);
router.delete('/classes/:id', protect, adminOrStaff, deleteClass);

// Hall CRUD
router.post('/halls', protect, adminOrStaff, createHall);
router.put('/halls/:hallId', protect, adminOrStaff, editHall);
router.delete('/halls/:hallId', protect, adminOrStaff, deleteHall);

// Class Leader Management endpoints
router.get('/classes/:classId/students', protect, getClassStudents);
router.post('/classes/:classId/assign-leader', protect, adminOrStaff, assignClassLeader);

module.exports = router;
