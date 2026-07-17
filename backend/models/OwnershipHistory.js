const mongoose = require('mongoose');

const ownershipHistorySchema = new mongoose.Schema({
  foundItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem',
    required: true
  },
  eventType: {
    type: String,
    enum: [
      'item_returned',
      'dispute_created',
      'dispute_resolved_original',
      'dispute_resolved_transfer'
    ],
    required: true
  },
  originalFinder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  returnedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  decision: {
    type: String
  },
  reason: {
    type: String
  },
  comments: {
    type: String
  },
  previousStatus: {
    type: String
  },
  newStatus: {
    type: String
  },
  decisionTimestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ownershipHistorySchema.index({ foundItem: 1 });
ownershipHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('OwnershipHistory', ownershipHistorySchema);
