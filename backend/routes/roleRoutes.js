const express = require('express');
const {
  getRoles,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/roleController');

const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const { allowRoles, adminOrStaff } = require('../middleware/roleMiddleware');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

router.use(protect);

router
  .route('/')
  .get(adminOrStaff, getRoles)
  .post(allowRoles('admin'), [
    body('name', 'Role name is required').notEmpty().trim(),
    body('displayName', 'Display name is required').notEmpty().trim(),
    validate
  ], createRole);

router
  .route('/:id')
  .put(allowRoles('admin'), [
    body('displayName', 'Display name cannot be empty').optional().notEmpty().trim(),
    body('description').optional().trim(),
    body('color').optional().trim(),
    validate
  ], updateRole)
  .delete(allowRoles('admin'), deleteRole);

module.exports = router;
