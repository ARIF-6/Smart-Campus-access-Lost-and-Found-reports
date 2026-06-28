const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory, getTemporaryRequests, convertTemporary, getLostFoundCategories, getIncidentCategories } = require('../controllers/categoryController');
const { protect } = require('../middleware/authMiddleware');
const { adminOrStaff, adminOnly } = require('../middleware/roleMiddleware');

// Route for fetching active Lost & Found categories (accessible by students/cleaners/admins)
router.get('/lost-found', protect, getLostFoundCategories);

// Route for fetching active Incident categories (accessible by security/admins/staff)
router.get('/incident', protect, getIncidentCategories);

// All routes are protected and require admin or staff, with some adminOnly for deletion
router.get('/', protect, adminOrStaff, getCategories);
router.post('/', protect, adminOrStaff, createCategory);
router.put('/:id', protect, adminOrStaff, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);
router.get('/temporary', protect, adminOrStaff, getTemporaryRequests);
router.post('/convert', protect, adminOrStaff, convertTemporary);

module.exports = router;
