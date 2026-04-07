const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  lostItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LostItem',
    required: true
  },
  foundItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem',
    required: true
  },
  matchScore: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['Suggested', 'Viewed', 'Claimed', 'Resolved'],
    default: 'Suggested'
  }
}, {
  timestamps: true
});

// Ensure unique matches to avoid duplicates
matchSchema.index({ lostItemId: 1, foundItemId: 1 }, { unique: true });

module.exports = mongoose.model('Match', matchSchema);
