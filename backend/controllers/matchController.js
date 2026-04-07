const Match = require('../models/Match');
const { recalculateAllMatches } = require('../services/matchService');

// @desc    Get all matches
// @route   GET /api/matches
// @access  Private (Admin)
exports.getAllMatches = async (req, res) => {
  try {
    const matches = await Match.find()
      .populate('lostItemId', 'title category locationLost image status')
      .populate('foundItemId', 'title category locationFound image status')
      .sort({ matchScore: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get matches for a lost item
// @route   GET /api/matches/lost/:lostItemId
// @access  Private
exports.getMatchesForLostItem = async (req, res) => {
  try {
    const matches = await Match.find({ lostItemId: req.params.lostItemId })
      .populate('foundItemId')
      .sort({ matchScore: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get matches for a found item
// @route   GET /api/matches/found/:foundItemId
// @access  Private
exports.getMatchesForFoundItem = async (req, res) => {
  try {
    const matches = await Match.find({ foundItemId: req.params.foundItemId })
      .populate('lostItemId')
      .sort({ matchScore: -1 });

    res.status(200).json(matches);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Recalculate all matches
// @route   POST /api/matches/recalculate
// @access  Private (Admin)
exports.triggerRecalculate = async (req, res) => {
  try {
    await recalculateAllMatches();
    res.status(200).json({ message: 'Matches recalculated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Update match status
// @route   PATCH /api/matches/:id/status
// @access  Private (Admin)
exports.updateMatchStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.status(200).json(match);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Delete a match
// @route   DELETE /api/matches/:id
// @access  Private (Admin)
exports.deleteMatch = async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    res.status(200).json({ message: 'Match deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};
