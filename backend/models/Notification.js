const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // If null, it's a role-based broadcast
  },
  recipientRole: {
    type: String,
    enum: ['admin', 'staff', 'student', 'security', 'clean', 'cleaner', 'all'],
    default: 'student'
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
    enum: [
      'MATCH', 
      'CLAIM_SUBMITTED', 
      'CLAIM_APPROVED', 
      'CLAIM_REJECTED', 
      'LOST_ITEM_REPORTED', 
      'FOUND_ITEM_REPORTED', 
      'ACCESS_LOG',
      'COMPLAINT_CREATED',
      'COMPLAINT_UPDATED',
      'CLASS_ISSUE_CREATED',
      'CLASS_ISSUE_UPDATED',
      'SECURITY_ALERT',
      'GENERAL'
    ],
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  module: {
    type: String,
    default: 'General'
  }
}, {
  timestamps: true
});

notificationSchema.index({ userId: 1 });
notificationSchema.index({ recipientRole: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
