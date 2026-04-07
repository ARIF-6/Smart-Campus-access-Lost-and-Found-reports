const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['MATCH', 'CLAIM_SUBMITTED', 'CLAIM_APPROVED', 'CLAIM_REJECTED'],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedItemId: {
    type: mongoose.Schema.Types.ObjectId
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
