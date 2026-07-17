const mongoose = require('mongoose');

const ownershipReportSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  foundItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FoundItem',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  comments: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminComments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    comment: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

ownershipReportSchema.index({ student: 1 });
ownershipReportSchema.index({ foundItem: 1 });
ownershipReportSchema.index({ status: 1 });
ownershipReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('OwnershipReport', ownershipReportSchema);
