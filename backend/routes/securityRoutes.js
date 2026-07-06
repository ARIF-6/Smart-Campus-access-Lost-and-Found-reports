const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { allowRoles } = require('../middleware/roleMiddleware');
const { checkShiftWindow } = require('../middleware/shiftTimeMiddleware');
const {
  createIncident, getIncidents, updateIncidentStatus,
  registerVisitor, visitorExit, getVisitors,
  addToBlacklist, getBlacklist, removeFromBlacklist,
  approveBlacklist, rejectBlacklist,
  startShift, endShift, getShifts, getActiveShift,
  getSecurityReports, getLiveStatus
} = require('../controllers/securityController');

const { body } = require('express-validator');
const { validate } = require('../middleware/validator');

// All routes require auth + security/admin/staff role
router.use(protect, allowRoles('security', 'admin', 'staff'));

const upload = require('../utils/upload')('security');

// Incidents
router.post('/incidents', upload.single('evidenceImage'), [
  body('type', 'Incident Type is required').notEmpty().trim().escape(),
  body('description', 'Description is required').notEmpty().trim().escape(),
  body('severity', 'Severity must be low, medium, or high').optional().isIn(['low', 'medium', 'high']),
  validate
], createIncident);
router.get('/incidents', getIncidents);
router.patch('/incidents/:id/status', allowRoles('admin', 'staff'), updateIncidentStatus);

// Visitors
router.post('/visitors', checkShiftWindow, [
  body('name', 'Name is required').notEmpty().trim(),
  body('purpose', 'Purpose is required').notEmpty().trim(),
  body('hostName', 'Host Name is required').notEmpty().trim(),
  validate
], registerVisitor);
router.get('/visitors', getVisitors);
router.patch('/visitors/:id/exit', visitorExit);

// Blacklist
router.post('/blacklist', [
  checkShiftWindow,
  validate
], addToBlacklist);
router.get('/blacklist', getBlacklist);
router.delete('/blacklist/:id', allowRoles('admin', 'staff'), removeFromBlacklist);
router.patch('/blacklist/:id/approve', allowRoles('admin', 'staff'), approveBlacklist);
router.patch('/blacklist/:id/reject', allowRoles('admin', 'staff'), rejectBlacklist);

// Shifts
router.post('/shifts/start', startShift);
router.patch('/shifts/end', endShift);
router.get('/shifts/active', getActiveShift);
router.get('/shifts', getShifts);

// Reports & Live Dashboard
router.get('/reports', getSecurityReports);
router.get('/live', getLiveStatus);

module.exports = router;
