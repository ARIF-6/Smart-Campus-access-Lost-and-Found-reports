const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  changeRole,
  changeStatus,
  restoreUser,
  permanentDeleteUser,
  uploadExcelStudents,
  updateUserPhoto,
  resetDevice,
  generateCode,
  changeDeviceRegistrationStatus,
} = require('../controllers/userManagementController');

const { protect } = require('../middleware/authMiddleware');
const { adminOrStaff } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

/* Route protection: authMiddleware (protect) -> roleMiddleware (adminOrStaff) */
router.use(protect, adminOrStaff);

router.post('/upload-excel', upload.excel.single('excel'), uploadExcelStudents);

router.post('/:id/reset-device', resetDevice);
router.post('/:id/generate-code', generateCode);
router.patch('/:id/device-status', [
  body('deviceRegistrationStatus', 'deviceRegistrationStatus is required').isIn(['Active', 'Inactive']),
  validate
], changeDeviceRegistrationStatus);

router.route('/')
  .get(getAllUsers)
  .post(
    upload.profiles.single('photo'),
    [
      body('fullName', 'Full Name is required').notEmpty().trim().escape(),
      body('password', 'Password must be at least 6 characters').isLength({ min: 6 }),
      body('role', 'Role is required').notEmpty(),
      validate
    ],
    createUser
  );

router.route('/:id')
  .get(getUserById)
  .put(
    upload.profiles.single('photo'),
    [
      body('fullName', 'Full Name is required').optional().notEmpty().trim().escape(),
      body('email', 'Please include a valid email').optional({ checkFalsy: true }).isEmail(),
      validate
    ],
    updateUser
  )
  .delete(deleteUser);

router.patch('/:id/photo', upload.profiles.single('photo'), updateUserPhoto);

router.route('/:id/role')
  .patch([
    body('role', 'Role is required').notEmpty(),
    validate
  ], changeRole);

router.patch('/:id/status', [
  body('isActive', 'Status is required').isBoolean(),
  validate
], changeStatus);

router.patch('/:id/restore', restoreUser);
router.delete('/:id/permanent', permanentDeleteUser);

module.exports = router;
