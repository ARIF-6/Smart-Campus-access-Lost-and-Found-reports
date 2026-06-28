const express = require('express');
const router = express.Router();
const { protect } = require('../../../middleware/authMiddleware');
const { adminOnly, adminOrStaff, studentOnly } = require('../../../middleware/roleMiddleware');
const upload = require('../utils/upload');
const {
  createComplaint,
  getAllComplaints,
  getMyComplaints,
  getComplaintById,
  supportComplaint,
  removeSupport,
  assignComplaint,
  updateStatus,
  getTrackingHistory,
  getIssueTypes,
  createIssueType,
  getStats
} = require('../controllers/campusEnvironmentController');

const { body } = require('express-validator');
const { validate } = require('../../../middleware/validator');

// All routes require authentication
router.use(protect);

// Stats (Admin/Staff only)
router.get('/dashboard/stats', adminOrStaff, getStats);

// Issue Types
router.get('/issue-types', getIssueTypes);
router.post('/issue-types', [
  body('issueName').optional().trim().escape(),
  body('name').optional().trim().escape(),
  body('category').optional().trim().escape(),
  validate
], createIssueType);

// Complaints
router.route('/')
  .post(studentOnly, upload.array('images', 5), [
    // Validation rules removed so empty values can pass and fallback to defaults in controller
    validate
  ], createComplaint)
  .get(adminOrStaff, getAllComplaints);

router.get('/my', studentOnly, getMyComplaints);

// Single Complaint
router.get('/:id', getComplaintById);

// Support System
router.route('/:id/support')
  .post(studentOnly, supportComplaint)
  .delete(studentOnly, removeSupport);

// Management
router.put('/:id/assign', adminOrStaff, [
  body('staffId', 'Staff ID is required').notEmpty(),
  validate
], assignComplaint);
router.put('/:id/status', adminOrStaff, [
  body('status', 'Status is required').notEmpty().isIn(['pending', 'in_review', 'resolved', 'rejected']),
  validate
], updateStatus);

router.get('/:id/tracking', getTrackingHistory);

module.exports = router;
