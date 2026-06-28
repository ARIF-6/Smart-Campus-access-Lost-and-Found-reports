const express = require("express");
const router = express.Router();
const { createItem, getItems, getMyItems, getItem, updateItem, deleteItem } = require("../controllers/itemController");
const { protect } = require("../middleware/authMiddleware");
const { allowRoles } = require("../middleware/roleMiddleware");
const upload = require('../middleware/uploadMiddleware');

router.get("/my-items", protect, getMyItems);

router.route("/")
  .post(protect, allowRoles('admin', 'staff', 'student', 'security', 'clean'), upload.single('image'), createItem)
  .get(protect, getItems);

router.route("/:id")
  .get(protect, getItem)
  .put(protect, allowRoles('admin', 'staff', 'student', 'security', 'clean'), upload.single('image'), updateItem)
  .delete(protect, allowRoles('admin', 'staff', 'student', 'security', 'clean'), deleteItem);

module.exports = router;
