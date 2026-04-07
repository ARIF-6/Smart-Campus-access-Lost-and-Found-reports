const express = require('express');
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  changeRole
} = require('../controllers/userManagementController');

const { protect } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');

/* Route protection: authMiddleware (protect) -> roleMiddleware (adminOnly) */
router.use(protect, adminOnly);

router.route('/')
  .get(getAllUsers);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

router.route('/:id/role')
  .patch(changeRole);

module.exports = router;
