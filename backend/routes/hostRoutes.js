const express = require('express');
const router = express.Router();
const { getHosts, createHost, updateHost, deleteHost } = require('../controllers/hostController');
const { protect } = require('../middleware/authMiddleware');
const { adminOrStaff, adminOnly } = require('../middleware/roleMiddleware');

router.get('/', protect, getHosts); // All authenticated users can read hosts (e.g. for visitor reg dropdown)
router.post('/', protect, adminOrStaff, createHost);
router.put('/:id', protect, adminOrStaff, updateHost);
router.delete('/:id', protect, adminOnly, deleteHost);

module.exports = router;
