const express = require('express');
const router = express.Router();
const {
  submitReport,
  getAllReports,
  getReportById,
  resolveReport,
  addReportComment,
  getMyReports
} = require('../controllers/ownershipReportController');

const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');

router.post('/', protect, submitReport);
router.get('/my-reports', protect, getMyReports);
router.get('/', protect, allowRoles('admin'), getAllReports);
router.get('/:id', protect, getReportById);
router.patch('/:id/resolve', protect, allowRoles('admin'), resolveReport);
router.post('/:id/comments', protect, allowRoles('admin'), addReportComment);

module.exports = router;

