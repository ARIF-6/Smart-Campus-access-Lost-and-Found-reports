// @desc    Report a found item (Cleaner only)
// @route   POST /api/cleaner/found-items
// @access  Private/Cleaner
exports.reportFoundItem = async (req, res) => {
  res.status(201).json({
    message: "Cleaner Access Granted: New found item successfully reported",
    user: { id: req.user.id, role: req.user.role }
  });
};
