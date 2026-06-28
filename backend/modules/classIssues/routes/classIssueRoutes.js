const express = require('express');
const router = express.Router();
const classIssueController = require('../controllers/classIssueController');
const { protect } = require('../../../middleware/authMiddleware');
const { adminOrStaff } = require('../../../middleware/roleMiddleware');
const upload = require('../../../utils/upload')('class-issues');

const { body } = require('express-validator');
const { validate } = require('../../../middleware/validator');

// ─── Student routes ───────────────────────────────────────────────
// Submit a new class issue (Class Leader only)
router.post('/', protect, upload.array('images', 5), [validate], classIssueController.createIssue);

// Get issues for the logged-in student's class
router.get('/', protect, classIssueController.getMyIssues);

// Get student's assigned class and hall
router.get('/my-location', protect, classIssueController.getMyLocation);

// Get available issue types
router.get('/issue-types', protect, classIssueController.getIssueTypes);

// Support / upvote an issue
router.post('/:id/support', protect, classIssueController.supportIssue);

// ─── Admin / Staff routes ─────────────────────────────────────────
// Get ALL issues across all classes (admin view)
router.get('/all', protect, adminOrStaff, classIssueController.getAllIssues);
router.get('/analytics', protect, adminOrStaff, classIssueController.getAnalytics);

// ─── Shared detail routes ─────────────────────────────────────────
router.get('/:id', protect, classIssueController.getIssueDetails);
router.get('/:id/tracking', protect, classIssueController.getTrackingHistory);

router.put('/:id/assign', protect, adminOrStaff, [
  body('assignedTo', 'Staff ID is required').notEmpty(),
  validate
], classIssueController.assignIssue);

router.put('/:id/status', protect, adminOrStaff, [
  body('status', 'Status is required').notEmpty().isIn(['pending', 'in_review', 'resolved', 'rejected']),
  validate
], classIssueController.updateStatus);

module.exports = router;
