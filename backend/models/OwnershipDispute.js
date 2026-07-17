const mongoose = require('mongoose');

const ownershipDisputeSchema = new mongoose.Schema({
  foundItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem',
    required: true
  },
  ownershipReport: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OwnershipReport',
    required: true
  },
  originalReturnedStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  newClaimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved_original', 'resolved_new'],
    default: 'pending'
  },
  adminDecision: {
    reason: { type: String, default: '' },
    comment: { type: String, default: '' },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date }
  }
}, {
  timestamps: true
});

ownershipDisputeSchema.index({ foundItem: 1 });
ownershipDisputeSchema.index({ status: 1 });

module.exports = mongoose.model('OwnershipDispute', ownershipDisputeSchema);
