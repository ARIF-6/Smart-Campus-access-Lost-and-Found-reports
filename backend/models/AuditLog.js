const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },
  targetType: {
    type: String,
    enum: ['User', 'Claim', 'LostItem', 'FoundItem', 'Match', 'Other']
  },
  details: {
    type: String
  },
  ipAddress: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
